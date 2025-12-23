from app.services.hume_service import POSITIVE_EMOTIONS, NEGATIVE_EMOTIONS

def calculate_sentiment_score(emotion_data: dict) -> float:
    if not emotion_data:
        return 50.0
    emotions = emotion_data.get("emotions", {})
    pos_score = sum(score for emotion, score in emotions.items() if emotion in POSITIVE_EMOTIONS)
    neg_score = sum(score for emotion, score in emotions.items() if emotion in NEGATIVE_EMOTIONS)
    score = pos_score + neg_score
    if score == 0:
        return 50.0
    return (pos_score / score) * 100