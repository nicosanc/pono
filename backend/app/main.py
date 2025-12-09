from fastapi import FastAPI
from app.database import Base, engine
from app import models
from app.api import auth, voice, conversations, analytics
from fastapi.middleware.cors import CORSMiddleware



models.Base.metadata.create_all(bind=engine)

app = FastAPI()

# CORS for React frontend - MUST come before routers
import os
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
CORS_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5173",
]
if FRONTEND_URL and FRONTEND_URL not in CORS_ORIGINS:
    CORS_ORIGINS.append(FRONTEND_URL)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(conversations.router)
app.include_router(voice.router)
app.include_router(auth.router)  
app.include_router(analytics.router, prefix="/api", tags=["analytics"])

@app.get("/")
def root():
    return {"message": "Pono API"}



