import openai
import os 
from dotenv import load_dotenv

load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")

def generate_conversation_summary(transcript: list[dict]) -> str:
    """Generate concise bullet-point summary of a conversation.
    
    Uses GPT-4o-mini to distill conversation into 2-3 sentence summary
    focusing on main topics, breakthroughs, insights, and progress.
    
    Args:
        transcript: List of message dicts with 'role' and 'content' keys
        
    Returns:
        Summary as concise string (bulleted list)
    """

    # Combine all messages into a single string for embedding 

    full_text = "".join(f"{msg['role']}: {msg['content']}" for msg in transcript) 

    response = openai.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": """You are a life coaching AI assistant. Your task is to take this conversation transcript and create a bulleted list of 10 items or 
                less summarizing the most key insights, breakthroughs,or takeaways from the conversation. Write in chronological order of the conversation transcript. After wrapping up,
                output agreed action items in this exact block format, at session end. If none, only say 'No actions agreed.' within the block - but still include the block format. Status is only either 'open' or 'closed'.
                ACTION_ITEMS:
                   - <title> | <status> | <description>
                   - <title> | <status> | <description>
                   ...
                END_ACTION_ITEMS
                """
            },
            {
                "role": "user",
                "content": f"Create a summary of this conversation:\n\n{full_text}"
            }
        ],
        temperature=0.3
    )

    return response.choices[0].message.content