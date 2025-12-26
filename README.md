# Pono - Voice AI Life Coach

Real-time voice coaching platform with emotion analysis, action tracking, and 90-day context awareness.

## Features

- **Real-time Voice Chat**: Low-latency streaming via OpenAI Realtime API with WebSocket relay
- **Emotion Analysis**: Hume AI prosody detection tracks confidence, anxiety, and emotional patterns across sessions
- **Action Item Tracking**: LLM tool calling creates and persists action items mid-conversation
- **Full Context Awareness**: Injects 90-day conversation history + open action items into every session
- **Privacy-First**: AES-256 message encryption with OpenAI data redaction
- **Analytics Dashboard**: Emotion trends, dominant emotions, action items, and session history
- **Personalized Onboarding**: Structured consultation generates user profile for contextual coaching
- **Content Moderation**: Real-time OpenAI Moderation API gating on voice transcripts

## Tech Stack

**Backend:**
- FastAPI (WebSocket relay, JWT auth)
- PostgreSQL + pgvector
- SQLAlchemy ORM
- OpenAI Realtime API (voice), GPT-4o-mini (summaries, moderation), text-embedding-3-small
- Hume AI (emotion analysis)
- Cryptography (Fernet AES-256)

**Frontend:**
- React + Vite
- React Query (TanStack Query)
- Web Audio API (AudioWorklet for PCM16)
- Recharts (analytics visualization)

## Setup

### Prerequisites
- Python 3.9+
- PostgreSQL 14+ with pgvector extension
- Node.js 18+
- OpenAI API key
- Hume AI API key

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Create .env file
echo "DATABASE_URL=postgresql://user:password@localhost/pono" > .env
echo "OPENAI_API_KEY=your_key_here" >> .env
echo "HUME_API_KEY=your_key_here" >> .env
echo "SECRET_KEY=your_jwt_secret" >> .env
echo "ENCRYPTION_KEY=$(python -c 'from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())')" >> .env

# Create tables
python -m app.database

# Start server
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Navigate to `http://localhost:5173`

## Architecture Highlights

- **Audio Pipeline**: Browser mic → AudioWorklet (PCM16) → WebSocket → FastAPI relay → OpenAI Realtime → speakers
- **Context Injection**: User profile + 90-day conversation history + open action items loaded into every session
- **Tool Calling**: Mid-conversation function calls create action items in real-time without breaking the session
- **Emotion Analysis**: Post-session Hume AI analysis generates emotion trends for analytics dashboard
- **Content Safety**: OpenAI Moderation API gates user transcripts in real-time

## License

MIT