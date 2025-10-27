from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base
from pgvector.sqlalchemy import Vector
from sqlalchemy import Boolean

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    conversations = relationship("Conversation", back_populates="user")
    password_hash = Column(String)
    onboarding_completed = Column(Boolean, default=False)
    profile_summary = Column(Text, nullable=True)

class Conversation(Base):
    __tablename__ = "conversations"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    title = Column(String)
    duration = Column(Integer)
    embedding = Column(Vector(1536)) # OpenAI text-embedding-3-small dimension
    messages = relationship("Message", back_populates="conversation")
    user = relationship("User", back_populates="conversations")
    summary = Column(Text, nullable=True)
    

class Message(Base):
    __tablename__ = "messages"
    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"))
    content = Column(Text)
    role = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    conversation = relationship("Conversation", back_populates="messages")