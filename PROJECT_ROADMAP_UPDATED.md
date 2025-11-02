# TutorAI - Project Roadmap & Development Guide (UPDATED)

**Last Updated:** October 29, 2025  
**Target Launch:** November 26, 2025

---

## KEY CHANGES FROM ORIGINAL PLAN

### 1. **Database: Supabase → PostgreSQL Native**

- Supabase managed service
- PostgreSQL native dengan pg pool
- Manual JWT authentication (bcrypt + jsonwebtoken)
- pgvector extension untuk vector search

### 2. **Embedding: sentence-transformers → Gemini API**

- Local model `intfloat/e5-base-v2`
- Gemini Embedding API (`models/embedding-001`)
- 768-dimensional vectors
- API-based (no heavy model loading)

### 3. **Storage: Supabase Storage → Local Filesystem**

- Supabase Storage buckets
- Local `uploads/` folder
- File paths stored in database
- Served via Express static

### 4. **Translation: Simplified**

- Language detection: `franc` library (lightweight)
- Gemini already supports Indonesian natively
- Translation optional (Gemini handles multilingual)

---

## Updated System Architecture

```
┌────────────────────────────────────────────────────────────┐
│                      FRONTEND LAYER                         │
│                 (React + Vite + Router)                     │
│                                                              │
│  /login → /register → /home (chat) → /history              │
│                                                              │
│  Admin: /admin/dashboard → /admin/users → /admin/chats     │
│         /admin/documents                                    │
│                                                              │
│  Features: 3D Avatar + Speech-to-Text + Text-to-Speech     │
└─────────────────────────┬──────────────────────────────────┘
                          │ REST API (HTTP/JSON)
                          ↓
┌────────────────────────────────────────────────────────────┐
│                    BACKEND API LAYER                        │
│              (Node.js + Express + pg)                       │
│                                                              │
│  Auth Routes: /api/auth/register, /api/auth/login          │
│  Chat Routes: /api/chat, /api/chat/history                 │
│  Admin Routes: /api/admin/users, /api/admin/chats,         │
│                /api/admin/documents, /api/admin/stats       │
│                                                              │
│  Services:                                                   │
│  • JWT Authentication (bcrypt)                              │
│  • Gemini API Integration (RAG + Generate)                  │
│  • Language Detection (franc)                               │
│  • File Upload (Multer → uploads/)                          │
└─────────────────────────┬──────────────────────────────────┘
                          │ HTTP API Calls
                          ↓
┌────────────────────────────────────────────────────────────┐
│                   INDEXER SERVICE                           │
│              (Python + FastAPI + Uvicorn)                   │
│                                                              │
│  Endpoints:                                                  │
│  • POST /index      - Process & index PDF documents         │
│  • POST /retrieve   - Semantic search (cosine similarity)   │
│                                                              │
│  Pipeline:                                                   │
│  1. PDF → pypdf → Extract text                             │
│  2. Text → Chunker → 1000 chars (200 overlap)              │
│  3. Chunks → Gemini Embed API → 768-dim vectors            │
│  4. Vectors → PostgreSQL (pgvector)                         │
│  5. Query → Gemini Embed → Similarity Search                │
└─────────────────────────┬──────────────────────────────────┘
                          │ SQL Queries
                          ↓
┌────────────────────────────────────────────────────────────┐
│                 DATABASE & STORAGE                          │
│             (PostgreSQL 14+ + pgvector)                     │
│                                                              │
│  Tables:                                                     │
│  • profiles (id, email, password_hash, name, role)          │
│  • documents (id, filename, file_path, status)              │
│  • chunks (id, content, embedding vector(768))              │
│  • chat_history (id, user_id, message, reply, language)    │
│  • feedback (id, chat_id, rating, comment)                  │
│                                                              │
│  Function: match_chunks(vector, k, filter) → similar chunks │
│                                                              │
│  File Storage: uploads/documents/ (local filesystem)        │
└────────────────────────────────────────────────────────────┘
```

---

## ️ Updated Tech Stack

### **Frontend** (`trial-web/`)

```json
{
  "react": "^19.1.1",
  "react-router-dom": "^7.9.4",
  "vite": "^7.1.7",
  "axios": "latest",
  "react-hot-toast": "latest",
  "@react-three/fiber": "latest",
  "@react-three/drei": "latest",
  "react-loading-skeleton": "latest"
}
```

### **Backend API** (`tutor-cerdas-api/`)

```json
{
  "express": "^4.18.2",
  "pg": "latest",
  "bcrypt": "latest",
  "jsonwebtoken": "latest",
  "franc": "latest",
  "@google/generative-ai": "latest",
  "multer": "^1.4.5",
  "cors": "^2.8.5",
  "helmet": "^8.1.0",
  "express-rate-limit": "^8.1.0",
  "express-validator": "latest"
}
```

### **Indexer Service** (`indexer/`)

```
fastapi
uvicorn[standard]
pypdf
psycopg2-binary
google-generativeai
numpy
python-dotenv
```

### **Database**

- PostgreSQL 14+
- pgvector extension

### **External APIs**

- Google Gemini API (embedding + generation)

---

## ️ Updated Database Schema

### Setup Commands

```sql
-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Profiles table (JWT auth)
CREATE TABLE profiles (
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_profiles_email ON profiles(email);

-- Documents table
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    uploaded_by INTEGER REFERENCES profiles(id),
    status TEXT DEFAULT 'pending',
    file_size INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_documents_status ON documents(status);

-- Chunks table with vector embeddings
CREATE TABLE chunks (
    id SERIAL PRIMARY KEY,
    document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    embedding vector(768) NOT NULL,
    chunk_index INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_chunks_document_id ON chunks(document_id);
CREATE INDEX idx_chunks_embedding ON chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Chat history table
CREATE TABLE chat_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES profiles(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    reply TEXT NOT NULL,
    language TEXT DEFAULT 'id',
    sources JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_chat_history_user_id ON chat_history(user_id);
CREATE INDEX idx_chat_history_created_at ON chat_history(created_at DESC);

-- Feedback table (optional)
CREATE TABLE feedback (
    id SERIAL PRIMARY KEY,
    chat_id INTEGER REFERENCES chat_history(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES profiles(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating IN (-1, 1)),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Similarity search function
CREATE OR REPLACE FUNCTION match_chunks(
    query_embedding vector(768),
    match_count INT DEFAULT 5,
    filter_document INT DEFAULT NULL
)
RETURNS TABLE (
    id INT,
    document_id INT,
    content TEXT,
    chunk_index INTEGER,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        chunks.id,
        chunks.document_id,
        chunks.content,
        chunks.chunk_index,
        1 - (chunks.embedding <=> query_embedding) AS similarity
    FROM chunks
    WHERE (filter_document IS NULL OR chunks.document_id = filter_document)
    ORDER BY chunks.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
```

---

## Development Roadmap (4 Weeks)

### **WEEK 1: Backend Foundation**

#### Backend Team Tasks:

1. **Setup PostgreSQL + pgvector**

   - Install PostgreSQL 14+
   - Enable pgvector extension
   - Run schema SQL scripts
   - Test connection dengan pg pool

2. **Implement JWT Authentication**

   - `POST /api/auth/register` - Create user dengan bcrypt
   - `POST /api/auth/login` - Login & return JWT
   - Middleware `authenticateUser` - Verify JWT tokens
   - Test dengan Postman

3. **Implement Indexer Service - Chunking**

   - File: `indexer/chunker_embedder.py`
   - Function: `chunk_text(text, size=1000, overlap=200)`
   - Preprocess: clean whitespace, special chars
   - Return: List[{content, chunk_index, start_char, end_char}]

4. **Implement Indexer Service - Gemini Embedding**

   - File: `indexer/chunker_embedder.py`
   - Function: `embed_batches(texts, batch_size=100)`
   - Use: `genai.embed_content(model="models/embedding-001")`
   - Task type: `retrieval_document` for chunks
   - Return: List of 768-dim vectors

5. **Implement Indexer Service - PDF Processing**

   - Endpoint: `POST /index`
   - Load PDF with pypdf
   - Chunk text
   - Embed with Gemini API
   - Store to PostgreSQL chunks table
   - Update document status

6. **Implement Retrieval Service**
   - Endpoint: `POST /retrieve`
   - Embed query with Gemini (task_type: `retrieval_query`)
   - Call `match_chunks()` SQL function
   - Return top-k similar chunks with scores

#### Frontend Team Tasks:

1. **Setup Project Structure**

   - Initialize Vite + React
   - Setup React Router
   - Create folder structure (pages, components, lib, utils)
   - Install dependencies (axios, react-hot-toast, etc)

2. **Implement Routing**

   - Routes: `/`, `/login`, `/register`, `/home`, `/history`, `/learn`
   - Admin routes: `/admin/dashboard`, `/admin/users`, `/admin/chats`, `/admin/documents`
   - ProtectedRoute component (check JWT token)
   - Redirect logic based on role

3. **Create Layout Components**
   - Navbar: Logo, user name, logout button
   - Sidebar: Admin navigation menu
   - Footer (optional)

---

### **WEEK 2: Core Features**

#### Backend Team Tasks:

1. **Implement Chat API**

   - `POST /api/chat` - User sends message
   - Detect language (franc)
   - Retrieve context from indexer
   - Format prompt with context
   - Call Gemini API for generation
   - Save to chat_history
   - Return reply + sources

2. **Implement Chat History API**

   - `GET /api/chat/history` - List user's chats
   - `DELETE /api/chat/history/:id` - Delete single chat
   - Pagination support (limit, offset)

3. **Implement Admin Document API**

   - `POST /api/admin/documents/upload` - Upload PDF dengan Multer
   - Save to `uploads/documents/`
   - Insert to documents table
   - Trigger indexing (call indexer service)
   - `GET /api/admin/documents` - List all documents
   - `DELETE /api/admin/documents/:id` - Delete document & chunks

4. **Implement Admin User Management API**

   - `GET /api/admin/users` - List all users (with search, pagination)
   - `PATCH /api/admin/users/:id` - Update role or is_active
   - `DELETE /api/admin/users/:id` - Delete user (cascade)

5. **Implement Admin Chat Monitoring API**

   - `GET /api/admin/chats` - List all chats (filters: user, date, keyword)
   - `GET /api/admin/chats/:id` - Get single chat detail
   - `POST /api/admin/chats/export` - Export to CSV

6. **Implement Admin Stats API**
   - `GET /api/admin/stats` - Dashboard statistics
   - Return: totalUsers, totalChats, totalDocuments, chatsToday, activeUsers, topUsers

#### Frontend Team Tasks:

1. **Implement Auth Pages**

   - Login.jsx: Email + password form, call `/api/auth/login`, store JWT in localStorage
   - Register.jsx: Name + email + password form, call `/api/auth/register`
   - Redirect after login based on role

2. **Implement User Chat Page**

   - UserPage.jsx: Chat interface with message bubbles
   - ChatBox component: User messages (right), AI messages (left)
   - Input box + Send button
   - Call `POST /api/chat`, display loading state
   - Auto-scroll to bottom on new message

3. **Implement Chat History Page**

   - History.jsx: List of past conversations
   - Show timestamp, message preview (truncate)
   - Click to expand full conversation
   - Delete button with confirmation

4. **Start Avatar Research**
   - Research Three.js / React Three Fiber
   - Find suitable 3D model (.glb/.gltf)
   - Test basic rendering
   - Plan animation states (idle, thinking, talking)

---

### **WEEK 3: Advanced Features**

#### Backend Team Tasks:

1. **Optimize RAG Pipeline**

   - Test retrieval quality
   - Tune chunk size and overlap
   - Improve prompt engineering
   - Add caching for frequent queries (node-cache)
   - Monitor Gemini API response times

2. **Add Rate Limiting**

   - `/api/chat` → 30 req/min per user
   - `/api/admin/*` → 100 req/min
   - `/api/auth/login` → 5 req/min per IP

3. **Add Input Validation**

   - Use express-validator
   - Validate email format, password strength
   - Sanitize inputs (prevent XSS)
   - Add error messages

4. **Add Error Handling**
   - Centralized error handler middleware
   - Log errors to console / file
   - Return consistent error responses

#### Frontend Team Tasks:

1. **Implement 3D Avatar**

   - Avatar.jsx component using React Three Fiber
   - Load 3D model
   - Implement animations: idle, thinking, talking
   - Position avatar in chat interface
   - Optimize performance (lazy load)

2. **Implement Speech-to-Text**

   - Add microphone button to chat input
   - Use Web Speech API (SpeechRecognition)
   - Set language to 'id-ID' for Indonesian
   - Populate input box with transcribed text
   - Show recording indicator

3. **Implement Text-to-Speech**

   - Add speaker button to AI message bubbles
   - Use Web Speech API (speechSynthesis)
   - Select Indonesian voice from available voices
   - Control: play, pause, stop
   - Show speaking animation

4. **Sync Avatar with Chat & Speech**

   - Avatar state: idle, thinking (loading), talking (TTS active)
   - Trigger animations based on chat state
   - Avatar glows when user sends message
   - Avatar talks when TTS plays

5. **Implement Admin Pages**
   - AdminPage.jsx: Dashboard with stats cards, charts
   - Users.jsx: User management table with actions
   - Chats.jsx: Chat monitoring with filters
   - Documents.jsx: Document list with upload modal

---

### **WEEK 4: Polish & Deploy**

#### Backend Team Tasks:

1. **Testing**

   - Test all API endpoints
   - Test error scenarios
   - Test rate limiting
   - Test file upload limits

2. **Documentation**

   - Write API documentation (Swagger optional)
   - Update .env.example files
   - Write deployment instructions

3. **Prepare for Deployment**
   - Set production environment variables
   - Configure PostgreSQL for production
   - Test with production database
   - Setup backup strategy

#### Frontend Team Tasks:

1. **UI Polish**

   - Responsive design (mobile, tablet, desktop)
   - Loading states and skeletons
   - Error messages and toasts
   - Smooth animations

2. **Testing**

   - Test all user flows
   - Test admin features
   - Test speech features on different browsers
   - Test avatar performance

3. **Build for Production**
   - `npm run build`
   - Test production build locally
   - Optimize bundle size

#### PM Tasks:

1. **Integration Testing**

   - Test complete user flow: Register → Login → Chat → History
   - Test admin flow: Upload doc → Index → Chat uses context
   - Test speech-to-speech flow

2. **Deployment**

   - Deploy database (ElephantSQL, Railway, Render)
   - Deploy indexer (Railway, Render, Fly.io)
   - Deploy backend API (Railway, Render, Fly.io)
   - Deploy frontend (Vercel, Netlify)
   - Configure environment variables
   - Setup custom domain

3. **Monitoring**
   - Monitor errors (Sentry optional)
   - Monitor API performance
   - Monitor chat quality
   - Collect user feedback

---

## Quick Start Guide

### Prerequisites

```bash
# Install
- Node.js 18+
- Python 3.11+
- PostgreSQL 14+
- Gemini API key
```

### Setup Database

```bash
# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Install pgvector
git clone https://github.com/pgvector/pgvector.git
cd pgvector
make
sudo make install

# Create database
createdb tutorai

# Run schema
psql tutorai < schema.sql
```

### Setup Indexer

```bash
cd indexer
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env (add DATABASE_URL, GEMINI_API_KEY)
uvicorn indexer_rag:app --reload --port 8000
```

### Setup Backend API

```bash
cd tutor-cerdas-api
npm install
cp .env.example .env
# Edit .env (add DATABASE_URL, GEMINI_API_KEY, JWT_SECRET)
mkdir -p uploads/documents
npm run dev
```

### Setup Frontend

```bash
cd trial-web
npm install
cp .env.example .env
# Edit .env (add VITE_API_BASE_URL)
npm run dev
```

### Get Gemini API Key

1. Go to https://makersuite.google.com/app/apikey
2. Create API key
3. Copy to .env files

---

## API Endpoints Summary

### Auth

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get JWT token

### User Chat

- `POST /api/chat` - Send message to AI (requires auth)
- `GET /api/chat/history` - Get chat history (requires auth)
- `DELETE /api/chat/history/:id` - Delete chat (requires auth)

### Admin Users

- `GET /api/admin/users` - List all users (requires admin)
- `PATCH /api/admin/users/:id` - Update user (requires admin)
- `DELETE /api/admin/users/:id` - Delete user (requires admin)

### Admin Chats

- `GET /api/admin/chats` - Monitor chats (requires admin)
- `GET /api/admin/chats/:id` - Get chat detail (requires admin)
- `POST /api/admin/chats/export` - Export chats (requires admin)

### Admin Documents

- `POST /api/admin/documents/upload` - Upload PDF (requires admin)
- `GET /api/admin/documents` - List documents (requires admin)
- `DELETE /api/admin/documents/:id` - Delete document (requires admin)

### Admin Stats

- `GET /api/admin/stats` - Get dashboard stats (requires admin)

### Indexer

- `POST /index` - Index a document (internal)
- `POST /retrieve` - Semantic search (internal)

---

## Success Metrics

### Performance Targets

- Page Load: < 2 seconds
- Chat Response: < 3 seconds (including RAG + Gemini)
- Indexing: < 30 seconds per 100-page PDF
- Speech Recognition: < 1 second delay

### Quality Targets

- Chat relevance: >80% (based on user feedback thumbs up/down)
- Avatar responsiveness: Smooth 30fps animations
- Speech accuracy: >90% for Indonesian

---

## Team Responsibilities

### Frontend Team (Ucup Isya + PM)

- React pages and components
- 3D Avatar integration
- Speech-to-Text & Text-to-Speech
- UI/UX design and responsiveness
- Frontend testing

### Backend Team (PM + Paci Hamam)

- PostgreSQL setup and schema
- JWT authentication system
- Indexer service (PDF processing, Gemini embedding, retrieval)
- REST API endpoints (chat, admin, documents)
- RAG pipeline optimization
- API testing

### Project Manager

- Coordination between teams
- Integration testing
- Deployment and hosting
- Bug fixing and QA
- Documentation

---

## Common Issues & Solutions

### Issue: Gemini API Rate Limit

**Solution:** Implement caching for identical queries, add retry logic with exponential backoff

### Issue: pgvector slow similarity search

**Solution:** Create IVFFlat index, tune `lists` parameter based on dataset size

### Issue: Large PDF indexing timeout

**Solution:** Implement async job queue, return job_id immediately, poll for status

### Issue: Avatar performance on mobile

**Solution:** Use low-poly model, reduce texture quality, implement level-of-detail (LOD)

### Issue: Speech recognition doesn't work on Firefox

**Solution:** Check browser compatibility, provide fallback message

---

## Support & Resources

- **Gemini API Docs:** https://ai.google.dev/docs
- **pgvector Docs:** https://github.com/pgvector/pgvector
- **React Three Fiber:** https://docs.pmnd.rs/react-three-fiber
- **Web Speech API:** https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API

---

**Good Luck! **

Target: November 26, 2025
