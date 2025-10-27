import openai
import os 
from dotenv import load_dotenv

load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")

def generate_conversation_summary(transcript: list[dict]) -> str:
    f"""
    Takes transcript (list of role and context), returns 2-3 sentence summary
    """

    # Combine all messages into a single string for embedding 

    full_text = "".join(f"{msg["role"]}: {msg["content"]}" for msg in transcript) 

    response = openai.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": """You are a life coaching AI assistant. Your task is to take this conversation transcript and create a bulleted list of ten items or 
                less summarizing the most key insights, breakthroughs, actions, or takeaways from the conversation. Write in chronological order of the conversation transcript."""
            },
            {
                "role": "user",
                "content": f"Create a summary of this conversation:\n\n{full_text}"
            }
        ],
        temperature=0.3
    )

    return response.choices[0].message.content