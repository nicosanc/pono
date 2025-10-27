# Pono - Voice AI Life Coach

Real-time voice coaching platform with full conversation history awareness, voice biometric analysis, and BS-proof progress tracking.

## Features

- **Real-time Voice Chat**: Sub-100ms latency streaming via OpenAI Realtime API with WebSocket proxying
- **Full Context Awareness**: Injects complete 90-day conversation history into every session for continuous progress tracking
- **Privacy-First**: End-to-end message encryption (AES-256) with data redaction mode enabled for OpenAI
- **Semantic Search**: pgvector embeddings for exploring past breakthroughs and insights
- **Personalized Onboarding**: Structured consultation generates user profile summaries for contextual coaching
- **Automated Summaries**: GPT-4 distills sessions into concise bullet points for efficient context injection
- **Action Item Tracking**: Monitors commitment follow-through as core metric for identity score (planned)
- **Voice Biometrics**: Sentiment analysis via Hume AI to detect confidence/anxiety patterns (planned)

## Tech Stack

**Backend:**
- FastAPI (WebSocket handling, JWT auth)
- PostgreSQL + pgvector (vector similarity search)
- SQLAlchemy ORM
- OpenAI Realtime API (voice), GPT-4o-mini (summaries), text-embedding-3-small (vectors)
- Cryptography (Fernet AES encryption)

**Frontend:**
- React + Vite
- React Query (TanStack Query for state management)
- Web Audio API (AudioWorklet for PCM16 processing)
- Canvas API (real-time waveform visualization)

## Setup

### Prerequisites
- Python 3.9+
- PostgreSQL 14+ with pgvector extension
- Node.js 18+
- OpenAI API key

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Create .env file
echo "DATABASE_URL=postgresql://user:password@localhost/pono" > .env
echo "OPENAI_API_KEY=your_key_here" >> .env
echo "SECRET_KEY=your_jwt_secret" >> .env
echo "ENCRYPTION_KEY=$(python -c 'from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())')" >> .env

# Run migrations (or manually create tables from models.py)
python -m app.database  # Creates tables

# Start server
make dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Navigate to `http://localhost:5173`

## Architecture Highlights

- **Audio Pipeline**: Browser microphone → AudioWorklet (Float32→PCM16) → WebSocket → FastAPI → OpenAI Realtime API → Browser speakers
- **Context Injection**: User profile summary + chronological 90-day conversation summaries injected into system prompt
- **Privacy Layer**: Messages encrypted at application level before DB storage; decrypted only on authorized retrieval
- **Vector Search**: Conversation embeddings enable semantic exploration independent of chronological context retrieval

## Roadmap

- [ ] Identity Score algorithm (voice biometrics + commitment tracking + progress depth)
- [ ] Gamification (streaks, decay, variable rewards, badges)
- [ ] Analytics dashboard (pattern detection, stuck loops, regression alerts)
- [ ] Social features (anonymous leaderboard, peer accountability)
- [ ] Personalized transformation programs (adaptive 30/60/90-day plans)

## License

MIT