from fastapi import APIRouter, Depends
from app.database import get_db
from app import models
from app.services.sentiment_analysis import calculate_sentiment_score
from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.api.auth import get_current_user
from datetime import datetime, timedelta

router = APIRouter()


@router.get("/analytics")
def get_sentiment_analytics(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Get sentiment analytics for a user"""


    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    conversations = (
        db.query(models.Conversation)
        .filter(
            models.Conversation.user_id == current_user.id,
            models.Conversation.created_at >= thirty_days_ago,
        )
        .order_by(models.Conversation.created_at.desc())
        .all()
    )
    if not conversations:
        return {"error": "No conversations found"}

    total_sessions = len(conversations)
    # Avg duration in minutes
    avg_duration = round(
        sum(conversation.duration for conversation in conversations)
        / total_sessions
        / 60,
        1,
    )
    emotional_trends = [
        {
            "date": conversation.created_at.isoformat(),
            "score": calculate_sentiment_score(conversation.emotion_data),
           "dominant_emotion": (
            max(conversation.emotion_data.get("emotions", {}).items(), key=lambda x: x[1])[0]
            if conversation.emotion_data and conversation.emotion_data.get("emotions")
            else "Unknown"
            ),
        }
        for conversation in reversed(conversations)
    ]
    recent_conversations = [
        {
            "id": conversation.id,
            "title": conversation.title,
            "date": conversation.created_at.isoformat(),
            "score": calculate_sentiment_score(conversation.emotion_data),
            "duration": conversation.duration,
        }
        for conversation in conversations[:10]
    ]

    return {
        "total_sessions": total_sessions,
        "avg_duration": avg_duration,
        "emotional_trends": emotional_trends,
        "recent_conversations": recent_conversations,
    }
