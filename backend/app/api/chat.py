from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas import ChatRequest, ChatResponse
from app import models
from datetime import datetime
from app.services.openai_service import get_coach_response

router = APIRouter()

@router.post("/chat", response_model=ChatResponse)
def send_message(request: ChatRequest, db: Session = Depends(get_db)):
    # Validate user exists
    user = db.query(models.User).filter(models.User.id == request.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get conversation
    conversation = db.query(models.Conversation).filter(
        models.Conversation.user_id == request.user.id,
    ).order_by(models.Conversation.created_at.desc()).first()

    # Create conversation if it doesn't exist
    if not conversation:
        conersation = models.Conversation(
            user_id=request.user_id,
            coaching_track=request.track
        )
        db.add(conversation)
        db.commit()
        db.refresh(conversation)

    # Get conversation history
    messages = db.query(models.Message).filter(
        models.Message.conversation_id == conversation.id
    ).order_by(models.Message.timestamp).all()

    conversation_history = [
        {"role": msg.role, "content": msg.content} for msg in messages
    ]

    # Save user message
    user_msg = models.Message(
        conversation_id=conversation.id,
        role="user",
        content=request.message,
    )
    db.add(user_msg)

    # AI response
    ai_response = get_coach_response(request.message, conversation_history)

    # Save AI response
    ai_msg = models.Message(
        conversation_id=conversation.id,
        role="assistant",
        content=ai_response,
    )
    db.add(ai_msg)
    db.commit()

    return ChatResponse(message=ai_response, timestamp=datetime.now())
    


    
    

    
