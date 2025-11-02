# TutorAI - AI-Powered Educational Assistant

TutorAI adalah platform pembelajaran berbasis AI dengan fitur RAG (Retrieval-Augmented Generation) yang menggunakan Gemini API, dilengkapi dengan 3D avatar interaktif dan dukungan speech-to-text/text-to-speech.

## Tech Stack

### Backend

- **API**: Node.js + Express + pg
- **Indexer**: Python + FastAPI + Uvicorn
- **Database**: PostgreSQL 14+ dengan pgvector extension
- **AI**: Google Gemini API (embedding + generation)
- **Auth**: JWT dengan bcrypt

### Frontend

- **Framework**: React 19 + Vite
- **Router**: React Router DOM v7
- **3D Avatar**: React Three Fiber + Drei
- **Speech**: Web Speech API (SpeechRecognition & SpeechSynthesis)

## Project Structure

```
TutorAI-Final/
├── indexer/                    # Python FastAPI service untuk PDF indexing & retrieval
│   ├── indexer_rag.py         # Main FastAPI app
│   ├── chunker_embedder.py    # Text chunking & Gemini embedding
│   ├── requirements.txt       # Python dependencies
│   └── .env                   # Indexer environment variables
│
├── tutor-cerdas-api/          # Node.js Express API server
│   ├── src/
│   │   ├── routes/            # API routes (auth, chat, admin)
│   │   ├── middleware/        # Auth middleware, rate limiting
│   │   ├── services/          # Business logic (RAG, Gemini)
│   │   └── utils/             # Helpers
│   ├── uploads/documents/     # Uploaded PDF storage
│   ├── package.json
│   └── .env                   # Backend environment variables
│
├── trial-web/                 # React frontend
│   ├── src/
│   │   ├── pages/             # Page components
│   │   ├── components/        # Reusable components
│   │   ├── lib/               # API client
│   │   └── utils/             # Frontend helpers
│   ├── package.json
│   └── .env                   # Frontend environment variables
│
└── database/
    └── schema.sql             # PostgreSQL schema dengan pgvector
```

## ️ Setup Instructions

### 1. Database Setup

```bash
# Install PostgreSQL 14+
# Install pgvector extension
git clone https://github.com/pgvector/pgvector.git
cd pgvector
make
sudo make install  # Windows: run as Administrator

# Create database
createdb tutorai

# Run schema
psql tutorai < database/schema.sql
```

### 2. Indexer Service

```bash
cd indexer
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
cp .env.example .env
# Edit .env dengan DATABASE_URL dan GEMINI_API_KEY
uvicorn indexer_rag:app --reload --port 8000
```

### 3. Backend API

```bash
cd tutor-cerdas-api
npm install
cp .env.example .env
# Edit .env dengan DATABASE_URL, GEMINI_API_KEY, JWT_SECRET
npm run dev
```

### 4. Frontend

```bash
cd trial-web
npm install
cp .env.example .env
# Edit .env dengan VITE_API_BASE_URL
npm run dev
```

### 5. Get Gemini API Key

1. Kunjungi https://makersuite.google.com/app/apikey
2. Buat API key baru
3. Copy ke file .env di indexer dan tutor-cerdas-api

## Features

### User Features

- Chat dengan AI tutor menggunakan RAG
- 3D Avatar interaktif dengan animasi
- Speech-to-Text (berbicara ke AI)
- Text-to-Speech (AI berbicara balik)
- Chat history dengan pagination
- Deteksi bahasa otomatis (Bahasa Indonesia & Inggris)
- Source citations dari dokumen

### Admin Features

- Dashboard dengan statistik
- User management (CRUD)
- Document management (upload PDF, indexing)
- Chat monitoring & filtering
- Export chat history ke CSV

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register user baru
- `POST /api/auth/login` - Login & dapatkan JWT token

### Chat (User)

- `POST /api/chat` - Kirim pesan ke AI
- `GET /api/chat/history` - Ambil riwayat chat
- `DELETE /api/chat/history/:id` - Hapus chat

### Admin

- `GET /api/admin/stats` - Dashboard statistics
- `GET /api/admin/users` - List semua users
- `PATCH /api/admin/users/:id` - Update user
- `DELETE /api/admin/users/:id` - Hapus user
- `GET /api/admin/chats` - Monitor semua chats
- `POST /api/admin/chats/export` - Export ke CSV
- `POST /api/admin/documents/upload` - Upload PDF
- `GET /api/admin/documents` - List documents
- `DELETE /api/admin/documents/:id` - Hapus document

### Indexer (Internal)

- `POST /index` - Index dokumen PDF
- `POST /retrieve` - Semantic search

## Environment Variables

### Indexer (.env)

```env
DATABASE_URL=postgresql://user:password@localhost:5432/tutorai
GEMINI_API_KEY=your_gemini_api_key
```

### Backend API (.env)

```env
DATABASE_URL=postgresql://user:password@localhost:5432/tutorai
GEMINI_API_KEY=your_gemini_api_key
JWT_SECRET=your_random_secret_key
PORT=3000
NODE_ENV=development
INDEXER_URL=http://localhost:8000
```

### Frontend (.env)

```env
VITE_API_BASE_URL=http://localhost:3000/api
```

## Development Timeline

- **Week 1**: Backend foundation (auth, database, indexer)
- **Week 2**: Core features (chat API, admin APIs, basic frontend)
- **Week 3**: Advanced features (avatar, speech, admin dashboard)
- **Week 4**: Polish, testing, deployment

## Team

- **Frontend**: Ucup Isya + PM
- **Backend**: PM + Paci Hamam
- **Project Manager**: Koordinasi & integrasi

## License

MIT License

## Target Launch

**November 26, 2025**

---

**Good Luck! **
