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
    
    action_items = (
        db.query(models.ActionItem)
        .filter(
            models.ActionItem.user_id == current_user.id,
            models.ActionItem.status == "open",
        )
        .all()
    )
    action_item_list = [{"title": item.title, "status": item.status, "description": item.description} for item in action_items]
    total_sessions = len(conversations)

    # Safely compute average duration (seconds -> minutes), ignoring None durations
    total_duration_seconds = sum((conversation.duration or 0) for conversation in conversations)
    avg_duration = round((total_duration_seconds / total_sessions) / 60, 1) if total_sessions > 0 else 0.0
    emotional_trends = [
        {
            "date": conversation.created_at.isoformat(),
            "score": calculate_sentiment_score(conversation.emotion_data) if conversation.emotion_data else 0,
            "dominant_emotion": (
                max(conversation.emotion_data.get("emotions", {}).items(), key=lambda x: x[1])[0]
                if conversation.emotion_data and conversation.emotion_data.get("emotions")
                else "Unknown"
            ),
            "dominant_emotions": dominant_emotion(conversation.emotion_data),
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
            "dominant_emotions": dominant_emotion(conversation.emotion_data),
        }
        for conversation in conversations[:10]
    ]

    return {
        "total_sessions": total_sessions,
        "avg_duration": avg_duration,
        "emotional_trends": emotional_trends,
        "recent_conversations": recent_conversations,
        "action_items": action_item_list,
    }

def dominant_emotion(emotion_data: dict) -> list[dict]:
    if not emotion_data or not emotion_data.get("emotions"):
        return []
    emotions = emotion_data.get("emotions", {}).items()
    top_3_emotions = sorted(emotions, key=lambda x: abs(x[1]), reverse=True)[:3]
    return [{"emotion": emotion, "score": score} for emotion, score in top_3_emotions]