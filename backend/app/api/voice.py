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

router = APIRouter()

async def relay_client_to_openai(client_ws: WebSocket, openai_ws):
    """Forward audio from browser to OpenAI Realtime API"""
    try:
        while True:
            data = await client_ws.receive_text()
            await openai_ws.send(data)
    except (WebSocketDisconnect, Exception) as e:
        print(f"Client relay ending: {e}")
        await openai_ws.close()  # Close OpenAI connection to break the other loop

async def relay_openai_to_client(openai_ws, client_ws: WebSocket, transcript):
    """Forward OpenAI responses to browser and capture transcript"""
    try:
        async for message in openai_ws:
            event = json.loads(message)
            await client_ws.send_text(message)
            
            # Capture user transcript
            if event["type"] == "conversation.item.input_audio_transcription.completed":
                transcript.append({
                    "role": "user",
                    "content": event["transcript"]
                })
            
            # Capture assistant transcript
            if event["type"] == "response.audio_transcript.done":
                transcript.append({
                    "role": "assistant",
                    "content": event["transcript"]
                })
            
    except Exception as e:
        print(f"OpenAI Realtime API Error: {e}")
            


@router.websocket("/ws/voice")
async def voice_endpoint(
    websocket: WebSocket,
    token: str,
    onboarding: bool = False):
    """Handle voice communication with OpenAI Realtime API"""
    
    # Must accept WebSocket before we can close it
    await websocket.accept()
    
    # Validate JWT token
    try:
        payload = decode_access_token(token)
        user_id = int(payload.get("sub"))
    except:
        await websocket.close(code=1008, reason="Invalid token")
        return

    db = SessionLocal()
    conversation = None
    transcript = []
    start_time = None

    try:
        # Validate user
        user = db.query(models.User).filter(models.User.id == user_id).first()
        if not user:
            await websocket.close(code=1008, reason="User not found")
            return
        
        # Create conversation record
        conversation = models.Conversation(user_id = user_id)
        db.add(conversation)
        db.commit()
        db.refresh(conversation)
        start_time = asyncio.get_event_loop().time() 

        # Connect to OpenAI Realtime API
        async with websockets.connect(
            "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17",
            additional_headers={
                "Authorization": f"Bearer {os.getenv('OPENAI_API_KEY')}",
                "OpenAI-Beta": "realtime=v1"
            }
        ) as openai_ws:

            # Send session config + system prompt
            if onboarding:
                # Use onboarding script without user context
                full_instructions = ONBOARDING_PROMPT
            else:
                # Use regular coaching prompt with user profile context
                user_context = f"\n\nUSER PROFILE:\n{user.profile_summary}\n\nUse this context naturally in your coaching." if user.profile_summary else ""
                full_instructions = SOCIAL_COACH_PROMPT + user_context
            session_update = {
                "type": "session.update",
                "session": {
                    "modalities": ["audio", "text"],
                    "instructions": full_instructions, # the unified script
                    "voice": "cedar",
                    "input_audio_format": "pcm16",
                    "output_audio_format": "pcm16",
                    #"data_redacted_mode": "closed",
                    "input_audio_transcription": {
                        "model": "gpt-4o-mini-transcribe"
                    },
                    "turn_detection": {
                        "type": "server_vad", # Server detects when user stops speaking
                        "threshold": 0.5,
                        "prefix_padding_ms": 300,
                        "silence_duration_ms": 500,
                    }
                }
            }

            await openai_ws.send(json.dumps(session_update))

            # Start a bidirectional relay
            await asyncio.gather(
                relay_client_to_openai(websocket, openai_ws),
                relay_openai_to_client(openai_ws, websocket, transcript)
            )
            print("GATHER COMPLETED", flush=True)
    

    except WebSocketDisconnect:
        pass
        
    except Exception as e:  
        print(f"ERROR: {e}")
        print(f"Transcript had {len(transcript)} items before error")
        traceback.print_exc()


    finally:
        try:
            print("FINALLY BLOCK EXECUTING - checking for conversation and transcript")
            if conversation is not None and transcript:
                # Calculate duration
                duration = int(asyncio.get_event_loop().time() - start_time) if start_time else 0
                
                # Generate title from first user message
                first_user_msg = next((m['content'] for m in transcript if m['role'] == 'user'), None)
                title = first_user_msg[:50] if first_user_msg else "Untitled conversation"
                
                # Set conversation metadata
                conversation.duration = duration
                conversation.title = title
                
                print(f"Saving {len(transcript)} messages...")
                for msg in transcript:
                    print(f"Saving: {msg['role']}: {msg['content'][:50]}")
                    message = models.Message(
                        conversation_id=conversation.id,
                        role=msg["role"],
                        content=encrypt_data(msg["content"])
                        # Remove duration and title - they're on conversation, not message
                    )
                    db.add(message)
            
                embedding = generate_conversation_embedding(transcript) # generate embedding for the conversation
                conversation.embedding = embedding
                summary = generate_conversation_summary(transcript)
                conversation.summary = summary
                db.commit()
                print("Transcript saved!")

            else:
                print(f"Skipping save - conversation exists: {'conversation' in locals()}, transcript length: {len(transcript) if 'transcript' in locals() else 'N/A'}")
            
            if 'db' in locals():
                db.close()
                
        except Exception as final_error:
            print(f"FINALLY BLOCK ERROR: {final_error}")
            traceback.print_exc()