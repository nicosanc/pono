import openai
import os
from dotenv import load_dotenv

load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")

def generate_profile_summary(transcript: list[dict]) -> str:
    """
    Generate a coaching profile summary from onboarding conversation.
    
    Args:
        transcript: List of {"role": "user/assistant", "content": "..."}
    
    Returns:
        2-3 paragraph summary of user's goals, challenges, background
    """
    full_text = "\n".join([f"{msg['role']}: {msg['content']}" for msg in transcript])
    
    response = openai.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": "You are a coaching assistant. Analyze this onboarding conversation and create a bulletted list of 10 items or less summarizing: 1) User's main goals and intentions, 2) Current challenges and pain points, 3) Previous attemps at achieving the goals. Write in third person."
            },
            {
                "role": "user",
                "content": f"Create a coaching profile from this conversation:\n\n{full_text}"
            }
        ],
        temperature=0.3
    )
    
    return response.choices[0].message.content