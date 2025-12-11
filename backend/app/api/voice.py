from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
import websockets
import json
import asyncio
import os
from app.services.coach_prompts import SOCIAL_COACH_PROMPT, ONBOARDING_PROMPT
from app.database import SessionLocal
import traceback
from app.services.security import decode_access_token
from app.services.embedding_service import generate_conversation_embedding
from app.services.conversation_summary import generate_conversation_summary
from app.services.encryption import encrypt_data, decrypt_data
from app.services.audio_converter import combine_and_convert_audio
from app.services.hume_service import analyze_emotion_with_hume
from hume.expression_measurement.stream import StreamErrorMessage
import tempfile
from datetime import datetime, timedelta
from openai import AsyncOpenAI
from app.services.action_items_service import generate_action_items

router = APIRouter()

# Initialize OpenAI client for moderation
openai_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Constants
MAX_TITLE_LENGTH = 50  # Maximum characters for conversation title


async def check_content_moderation(text: str, user_id: int, db: Session) -> dict:
    """Check text against OpenAI Moderation API for policy violations."""
    try:
        response = await openai_client.moderations.create(input=text)
        result = response.results[0]
        
        if result.flagged:
            print(f"⚠️ MODERATION VIOLATION - User {user_id}: {result.categories.model_dump()}")
            
        return {
            "flagged": result.flagged,
            "categories": result.categories.model_dump()
        }
    except Exception as e:
        # Fail open on moderation errors
        print(f"Moderation check failed for user {user_id}: {e}")
        return {"flagged": False, "categories": {}}


async def relay_client_to_openai(
    client_ws: WebSocket, openai_ws, audio_chunks: list[bytes]
):
    """Forward audio from browser to OpenAI Realtime API.

    Continuously receives audio data from the client WebSocket and forwards
    it to the OpenAI Realtime API WebSocket until disconnection or error.

    Args:
        client_ws: WebSocket connection to the browser client
        openai_ws: WebSocket connection to OpenAI Realtime API

    Raises:
        WebSocketDisconnect: When client disconnects
    """
    try:
        while True:
            data = await client_ws.receive_text()

            # Parse and store audio chunks
            try:
                message = json.loads(data)
                if message.get("type") == "input_audio_buffer.append" and message.get("audio"):
                    audio_chunks.append(message["audio"])
            except json.JSONDecodeError:
                pass  # Malformed messages don't break the stream

            await openai_ws.send(data)

    except WebSocketDisconnect:
        await openai_ws.close()
    except websockets.exceptions.ConnectionClosed:
        pass
    except Exception as e:
        print(f"Error in client relay: {e}")
        traceback.print_exc()
        try:
            await openai_ws.close()
        except Exception:
            pass


async def relay_openai_to_client(openai_ws, client_ws: WebSocket, transcript, user_id: int, db: Session):
    """Forward OpenAI responses to browser and capture transcript.

    Streams events from OpenAI Realtime API to the client browser while
    extracting and storing user/assistant transcriptions for database persistence.
    Includes real-time content moderation to block harmful content.

    Args:
        openai_ws: WebSocket connection to OpenAI Realtime API
        client_ws: WebSocket connection to the browser client
        transcript: List to append transcript messages to (modified in-place)
        user_id: User ID for moderation logging
        db: Database session for logging violations
    """
    
    user_message_buffer = []  # Buffer to aggregate user transcription chunks

    try:
        async for message in openai_ws:
            try:
                event = json.loads(message)
            except json.JSONDecodeError:
                continue

            # Forward to client (ignore if disconnected)
            try:
                await client_ws.send_text(message)
            except (WebSocketDisconnect, RuntimeError):
                break

            # Check user transcripts for policy violations
            if event.get("type") == "conversation.item.input_audio_transcription.completed":
                user_transcript = event.get("transcript", "")
                if not user_transcript:
                    continue
                    
                moderation_result = await check_content_moderation(user_transcript, user_id, db)
                
                if moderation_result["flagged"]:
                    warning = {
                        "type": "error",
                        "error": {
                            "message": "Session terminated: Content policy violation detected.",
                            "code": "content_policy_violation"
                        }
                    }
                    try:
                        await client_ws.send_text(json.dumps(warning))
                    except Exception:
                        pass
                    
                    await client_ws.close(code=1008, reason="Content policy violation")
                    await openai_ws.close()
                    return
                
                user_message_buffer.append(user_transcript)

            # Save transcript when assistant completes response
            if event.get("type") == "response.output_audio_transcript.done":
                if user_message_buffer:
                    transcript.append({"role": "user", "content": " ".join(user_message_buffer)})
                    user_message_buffer.clear()
                
                transcript.append({"role": "assistant", "content": event.get("transcript", "")})

    except websockets.exceptions.ConnectionClosed:
        pass
    except Exception as e:
        print(f"Error in OpenAI relay: {e}")
        traceback.print_exc()


@router.websocket("/ws/voice")
async def voice_endpoint(websocket: WebSocket, token: str, onboarding: bool = False):
    """Handle real-time voice communication with OpenAI Realtime API.

    Establishes bidirectional WebSocket connection for voice chat, validates
    JWT authentication, creates conversation record, injects user context
    (profile summary or onboarding script), and saves encrypted transcript
    with embeddings on completion.

    Args:
        websocket: WebSocket connection from the client
        token: JWT access token for authentication
        onboarding: If True, uses onboarding prompt instead of regular coaching

    Returns:
        None (WebSocket connection handled asynchronously)

    Raises:
        WebSocketDisconnect: When connection is closed by client
    """

    # Must accept WebSocket before we can close it
    await websocket.accept()

    # Validate JWT token
    try:
        payload = decode_access_token(token)
        user_id = int(payload.get("sub"))
    except Exception:
        await websocket.close(code=1008, reason="Invalid token")
        return

    db = SessionLocal()
    conversation = None
    transcript = []
    start_time = None
    audio_chunks = []

    try:
        # Validate user exists
        user = db.query(models.User).filter(models.User.id == user_id).first()
        if not user:
            await websocket.close(code=1008, reason="User not found")
            return

        # Create conversation record
        conversation = models.Conversation(user_id=user_id)
        db.add(conversation)
        db.commit()
        db.refresh(conversation)
        start_time = asyncio.get_event_loop().time()
        ninety_days_ago = datetime.now() - timedelta(days=90)

        # Connect to OpenAI Realtime API
        async with websockets.connect(
            "wss://api.openai.com/v1/realtime?model=gpt-realtime",
            subprotocols=["realtime"],
            extra_headers={"Authorization": f"Bearer {os.getenv('OPENAI_API_KEY')}"},
        ) as openai_ws:

            # Send session config + system prompt
            if onboarding:
                # Use onboarding script without user context
                full_instructions = ONBOARDING_PROMPT
            else:
                # Use regular coaching prompt with user profile context and conversation history
                conversation_history = (
                    db.query(models.Conversation)
                    .filter(
                        models.Conversation.user_id == user_id,
                        models.Conversation.created_at >= ninety_days_ago,
                    )
                    .order_by(models.Conversation.created_at.desc())
                    .all()
                )

                # Put the conversation texts together into an f string with dates so the model can see the conversation history in chronological order
                history_text = ""
                for i, conv in enumerate(conversation_history):
                    if conv.summary:
                        date_str = conv.created_at.strftime("%Y-%m-%d")
                        history_text += f"Session {i+1} ({date_str}): {conv.summary}\n"

                # Inject the user profile and conversation history into the prompt for full context at conversation start
                user_context = (
                    f"USER PROFILE:\n{user.profile_summary}\n\n"
                    if user.profile_summary
                    else ""
                )
                history_context = (
                    f"CONVERSATION HISTORY: (LAST 90 DAYS):\n{history_text}\n"
                    if history_text
                    else ""
                )

                # Add action items to the prompt if they exist and are still open
                action_items = (
                    db.query(models.ActionItem)
                    .filter(
                        models.ActionItem.user_id == user_id,
                        models.ActionItem.status == 'open',
                    )
                    .all()
                )

                # Turn them into a string to inject into the prompt along with conversation history and user context
                action_item_text = ""
                for item in action_items:
                    action_item_text += f"{item.title} | {item.status} | {item.description}\n"
                
                action_item_context = (
                    f"ACTION ITEMS: \n{action_item_text}"
                    if action_item_text
                    else ""
                )

                full_instructions = SOCIAL_COACH_PROMPT + user_context + history_context + action_item_context

            session_update = {
                "type": "session.update",
                "session": {
                    "type": "realtime",
                    "instructions": full_instructions,
                    "audio": {
                        "input": {
                            "transcription": {"model": "whisper-1"},
                            "turn_detection": {
                                "type": "server_vad",
                                "threshold": 0.5,
                            "prefix_padding_ms": 500,
                            "silence_duration_ms": 1500,
                            },
                        },
                        "output": {"voice": "cedar"},
                    },
                },
            }

            await openai_ws.send(json.dumps(session_update))

            # Start a bidirectional relay
            await asyncio.gather(
                relay_client_to_openai(websocket, openai_ws, audio_chunks),
                relay_openai_to_client(openai_ws, websocket, transcript, user_id, db),
            )

    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"Error in voice endpoint: {e}")
        traceback.print_exc()

    finally:
        if conversation and transcript:
            try:
                # Calculate duration
                duration = int(asyncio.get_event_loop().time() - start_time) if start_time else 0
                
                # Generate title from first user message
                first_user_msg = next((m["content"] for m in transcript if m["role"] == "user"), None)
                title = first_user_msg[:MAX_TITLE_LENGTH] if first_user_msg else "Untitled conversation"

                # Set conversation metadata
                conversation.duration = duration
                conversation.title = title

                # Save messages
                for msg in transcript:
                    message = models.Message(
                        conversation_id=conversation.id,
                        role=msg["role"],
                        content=encrypt_data(msg["content"]),
                    )
                    db.add(message)

                # Generate embedding and summary
                conversation.embedding = generate_conversation_embedding(transcript)
                conversation.summary = generate_conversation_summary(transcript)
                action_items = generate_action_items(conversation.summary)
                for item in action_items:
                    action_item = models.ActionItem(
                        user_id=conversation.user_id,
                        title=item['title'],
                        status=item['status'],
                        description=item['description'],
                        conversation_id_created=conversation.id,
                        created_at=datetime.now()
                    )
                    db.add(action_item)
                db.commit()
            except Exception as e:
                print(f"Failed to save conversation: {e}")
                traceback.print_exc()
                db.rollback()
        
        # Optional: emotion analysis (doesn't block if it fails)
        if audio_chunks and conversation:
            temp_path = None
            try:
                wav_bytes = combine_and_convert_audio(audio_chunks)
                with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_file:
                    temp_file.write(wav_bytes)
                    temp_path = temp_file.name

                emotion_data = await analyze_emotion_with_hume(wav_bytes)
                conversation.emotion_data = emotion_data
                db.commit()
            except Exception as e:
                print(f"Emotion analysis failed (non-critical): {e}")
            finally:
                if temp_path and os.path.exists(temp_path):
                    os.unlink(temp_path)

        db.close()
