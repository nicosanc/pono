from hume import AsyncHumeClient
from hume.expression_measurement.stream import Config 
from dotenv import load_dotenv
from datetime import datetime
import tempfile
import os
from hume.expression_measurement.stream import StreamErrorMessage

load_dotenv()

# Weights for positive emotions to calculate weighted average
POSITIVE_EMOTIONS = {
    "Calmness": 1.2,        # Mental peace = foundational to wellbeing
    "Gratitude": 1.2,       # Core to transformation and reframing perspective
    "Determination": 1.1,   # Action-oriented, high value
    "Triumph": 1.0,         # Achievement state
    "Joy": 1.0,             # Pure positive emotion
    "Enthusiasm": 0.9,      # Active engagement, slightly lower than joy
    "Contentment": 0.9      # Passive satisfaction, still valuable
}

# Weights for negative emotions to calculate weighted average
NEGATIVE_EMOTIONS = {
    "Shame": -1.3,           # Most destructive to identity
    "Guilt": -1.2,           # Deep self-judgment, blocks growth
    "Embarrassment": -1.1,   # Social inhibition, prevents authenticity
    "Anxiety": -1.1,         # Chronic stress, undermines action
    "Doubt": -1.0,           # Cognitive block, paralyzes decision-making
    "Anger": -0.8,           # Can be motivating when channeled, less negative
    "Sadness": -0.7          # Natural emotion, not inherently destructive
}

TOTAL_EMOTIONS = {**POSITIVE_EMOTIONS, **NEGATIVE_EMOTIONS}

async def analyze_emotion_with_hume(audio_bytes: bytes) -> dict:
    """
    Send audio to Hume AI for emotion analysis via prosody detection.
    
    Returns filtered scores for tracked positive/negative emotions only.
    """
    # Truncate to first 5 seconds (Hume API limit)
    max_bytes = 5 * 48000
    truncated_audio = audio_bytes[:max_bytes]
    temp_path = None
    
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_file:
            temp_file.write(truncated_audio)
            temp_path = temp_file.name

        client = AsyncHumeClient(api_key=os.environ.get("HUME_API_KEY"))
        model_config = Config(prosody={})

        async with client.expression_measurement.stream.connect() as socket:
            result = await socket.send_file(temp_path, model_config)

            if isinstance(result, StreamErrorMessage):
                raise Exception(f"Hume API Error: {result.error}")
            
            # Extract predictions
            full_result = result.model_dump()
            predictions = full_result.get("prosody", {}).get("predictions", [])

            # Filter to tracked emotions only
            filtered_emotions = {
                emotion["name"]: emotion["score"]
                for pred in predictions
                for emotion in pred.get("emotions", [])
                if emotion["name"] in TOTAL_EMOTIONS
            }

            return {"emotions": filtered_emotions, "analyzed_at": datetime.utcnow().isoformat()}
    
    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)