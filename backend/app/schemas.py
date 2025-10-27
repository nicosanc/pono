from pydantic import BaseModel, field_validator
from datetime import datetime

class ChatRequest(BaseModel):
    message: str
    user_id: int

class ChatResponse(BaseModel):
    message: str
    timestamp: datetime

class Message(BaseModel):
    conversation_id: int
    role: str
    content: str
    timestamp: datetime

class UserCreate(BaseModel):
    email: str
    password: str

    @field_validator('password')
    def validate_password(cls, v):
        if len(v) > 72:
            raise ValueError('Password cannot exceed 72 characters')
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        return v

class UserLogin(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
