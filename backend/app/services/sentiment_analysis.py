from app.services.hume_service import POSITIVE_EMOTIONS, NEGATIVE_EMOTIONS

def calculate_sentiment_score(emotion_data: dict) -> float:
    if not emotion_data:
        return 50.0
    emotions = emotion_data.get("emotions", {})
    score = 50.0  # Start at neutral baseline

    for emotion_name, emotion_score in emotions.items():
        
        if emotion_name in POSITIVE_EMOTIONS:
            score += emotion_score * POSITIVE_EMOTIONS[emotion_name] * 200
        elif emotion_name in NEGATIVE_EMOTIONS:
            score += emotion_score * NEGATIVE_EMOTIONS[emotion_name] * 200

    return min(100.0, max(0.0, score))