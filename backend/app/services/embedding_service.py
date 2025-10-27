import openai
import os
from dotenv import load_dotenv

load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")

def generate_conversation_embedding(transcript: list[dict]) -> list[float]:
    """
    Generate embedding for full conversation transcript.
    
    Args:
        transcript: List of {"role": "user/assistant", "content": "..."}
    
    Returns:
        1536-dimensional embedding vector
    """
    
    # Combine all messages into a single string for embedding
    full_text = "".join([f"{msg["role"]}: {msg["content"]}" for msg in transcript])

    response = openai.embeddings.create(
        input=full_text, 
        model="text-embedding-3-small"
    )
    return response.data[0].embedding

def generate_query_embedding(query: str) -> list[float]:
    """Generate vector embedding for a conversation transcript.
    
    Concatenates all messages from the transcript and generates a 1536-dimensional
    embedding using OpenAI's text-embedding-3-small model for semantic search.
    
    Args:
        transcript: List of message dicts with 'role' and 'content' keys
        
    Returns:
        1536-dimensional embedding vector as list of floats
    """

    response = openai.embeddings.create(
        input=query,
        model="text-embedding-3-small"
    )
    return response.data[0].embedding