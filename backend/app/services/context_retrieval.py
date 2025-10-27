import models
from embedding_service import generate_query_embedding
from sqlalchemy.orm import Session, Depends
from database import get_db
from dotenv import load_dotenv
from datetime import datetime, timedelta

load_dotenv()
def retrieve_context(user_id: int, db: Session = Depends(get_db)) -> str:
    """
    Retrieve relevant past conversations and format as context string
    
    Args:
        user_id: The user's ID
        db: Database session
    
    Returns:
        Formatted context string to inject into prompt
    """
    # Get user's profile summary as the query 
    user = db.query(models.User).filter(models.User.id == user_id).first()

    # Get all conversations from the last 90 days 
    conversations=db.query(models.Conversation).filter(models.Conversations.user_id == user_id, models.Conversations.created_at >= datetime.now() - timedelta(days=90)).order_by(models.Conversations.created_at.desc()).all()
    conversation_summaries = [conversation.summary for conversation in conversations]
    full_context = "\n".join(conversation_summaries)

    # Generate embedding for the query
    
    
