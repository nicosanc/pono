from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from typing import List
from app.api.auth import get_current_user
from app.services.embedding_service import generate_query_embedding
from app.services.profile_service import generate_profile_summary
from app.services.encryption import decrypt_data

router = APIRouter()

@router.get("/users/{user_id}/conversations")
def get_user_conversations(user_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get all conversations for a user, ordered by most recent"""

    # Ensure user can only access their own conversations
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    
    conversations = db.query(models.Conversation).filter(models.Conversation.user_id == user_id).order_by(models.Conversation.created_at.desc()).all()

    return [{
        "id": conversation.id,
        "title": conversation.title,
        "duration": conversation.duration,
        "created_at": conversation.created_at,
        "message_count": len(conversation.messages)
    } for conversation in conversations]

@router.get("/conversations/{conversation_id}/messages")
def get_conversation_messages(conversation_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get all messages for a specific conversation"""
    
    conversation = db.query(models.Conversation).filter(models.Conversation.id == conversation_id).first()
    
    # Ensure user can only access their own conversations
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if current_user.id != conversation.user_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    messages = db.query(models.Message).filter(models.Message.conversation_id == conversation_id).order_by(models.Message.created_at.asc()).all()

    return {
        "conversation_id": conversation.id,
        "title": conversation.title,
        "duration": conversation.duration,
        "created_at": conversation.created_at,
        "messages": [{
            "id": message.id,
            "role": message.role,
            "content": decrypt_data(message.content),
        } for message in messages]
    }

@router.delete("/conversations/{conversation_id}")
def delete_conversation(conversation_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Delete a conversation and all its messages"""

    conversation = db.query(models.Conversation).filter(models.Conversation.id == conversation_id).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
        
    # Ensure user can only delete their own conversations
    if current_user.id != conversation.user_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    db.delete(conversation)
    db.commit()
    return {"message": "Conversation deleted successfully"}

@router.get("/conversations/search")
def search_conversations(query: str, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Semantic search across all conversations for a user"""

    query_embedding = generate_query_embedding(query)
    distance = models.Conversation.embedding.cosine_distance(query_embedding).label("distance")
    conversations = db.query(models.Conversation, distance).filter(models.Conversation.user_id == current_user.id).order_by(distance).limit(10).all()
    
    return [{
        "id": conversation.id,
        "title": conversation.title,
        "message_count": len(conversation.messages),
        "created_at": conversation.created_at,
        "distance": float(distance)
    } for conversation, distance in conversations]


@router.post("/conversations/{conversation_id}/complete-onboarding")
def complete_onboarding(
    conversation_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark onboarding conversation as complete and generate profile summary"""
    
    conversation = db.query(models.Conversation).filter(
        models.Conversation.id == conversation_id,
        models.Conversation.user_id == current_user.id
    ).first()
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Get messages
    messages = db.query(models.Message).filter(
        models.Message.conversation_id == conversation_id
    ).order_by(models.Message.created_at.asc()).all()
    
    transcript = [{"role": msg.role, "content": decrypt_data(msg.content)} for msg in messages]
    
    # Generate profile summary
    profile_summary = generate_profile_summary(transcript)
    
    # Update user
    current_user.onboarding_completed = True
    current_user.profile_summary = profile_summary
    db.commit()
    
    return {"message": "Onboarding completed", "profile_summary": profile_summary}