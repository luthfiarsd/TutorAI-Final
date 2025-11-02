# TutorAI - Project Roadmap & Development Guide

## Daftar Isi

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Tech Stack](#tech-stack)
- [Database Schema](#database-schema)
- [Development Roadmap](#development-roadmap)
- [Setup Instructions](#setup-instructions)
- [API Documentation](#api-documentation)

---

## Overview

**TutorAI** adalah aplikasi pembelajaran interaktif berbasis AI yang menggunakan teknologi RAG (Retrieval-Augmented Generation) untuk memberikan pengalaman tutoring yang personal dan cerdas. Sistem ini mendukung interaksi melalui teks dan speech, dilengkapi dengan avatar 3D yang responsif.

### Key Features

- **Smart Chat**: Chat dengan AI tutor menggunakan teknologi RAG
- **Multi-language**: Deteksi otomatis bahasa (Indonesia/English) dengan translation
- **Speech-to-Speech**: Input dan output suara dengan logat natural
- **3D Avatar**: Avatar interaktif dengan animasi (idle, thinking, talking)
- **Document Management**: Upload dan indexing dokumen pembelajaran (PDF)
- **Admin Panel**: Monitoring users, chats, dan dokumen
- **Role-based Access**: User dan Admin dengan permission berbeda

---

## ️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         FRONTEND                             │
│              (React + Vite + React Router)                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Login   │  │   Chat   │  │  Admin   │  │  Speech  │   │
│  │ Register │  │ History  │  │Dashboard │  │ & Avatar │   │
│  │          │  │ Materials│  │Documents │  │   TTS    │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP/REST API
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND API LAYER                         │
│           (Node.js + Express + PostgreSQL)                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │   Auth   │  │   Chat   │  │  Admin   │  │ Document │   │
│  │  Routes  │  │  Routes  │  │  Routes  │  │  Upload  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│         │              │              │              │       │
│         └──────────────┴──────────────┴──────────────┘       │
│                         │                                     │
│              ┌──────────┴──────────┐                        │
│              ↓                     ↓                        │
│     ┌────────────────┐    ┌────────────────┐              │
│     │  Gemini API    │    │  Translation   │              │
│     │  • RAG Logic   │    │  • Detect Lang │              │
│     │  • Embedding   │    │  • ID ↔ EN     │              │
│     │  • Generate    │    │  (franc lib)   │              │
│     └────────────────┘    └────────────────┘              │
└─────────────────────────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                  INDEXER SERVICE                             │
│              (Python + FastAPI + Uvicorn)                    │
│  ┌──────────────────┐         ┌──────────────────┐         │
│  │   PDF Processor  │────────▶│   Chunker        │         │
│  │  (pypdf extract) │         │ (Text Splitting) │         │
│  └──────────────────┘         └────────┬─────────┘         │
│                                         ↓                    │
│                              ┌──────────────────┐           │
│                              │  Gemini Embed    │           │
│                              │  (via API)       │           │
│                              │  768-dim vectors │           │
│                              └────────┬─────────┘           │
│                                       ↓                      │
│                              ┌──────────────────┐           │
│                              │   Retrieval      │           │
│                              │ (Cosine Search)  │           │
│                              └──────────────────┘           │
└─────────────────────────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                DATABASE & FILE STORAGE                       │
│                 (PostgreSQL Native + pgvector)               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ profiles │  │documents │  │  chunks  │  │  chat_   │   │
│  │  (users) │  │  (files) │  │(vectors) │  │ history  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────┐      │
│  │    Local File Storage (uploads/ folder)          │      │
│  │         atau Cloud Storage (Optional)            │      │
│  └──────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow - User Chat dengan RAG

```
User Input (ID/EN) → Detect Language → Translate to EN (if needed)
                              ↓
                     Query Indexer/Retrieve
                     (Cosine Similarity Search)
                              ↓
                    Retrieved Contexts (Top 5)
                              ↓
              Format Prompt + Context + Query
                              ↓
                     Call Gemini API
                     (Generate Response in EN)
                              ↓
            Translate Response to Original Language
                              ↓
              Return to User (ID/EN) + Save to DB
```

### Data Flow - Speech-to-Speech

```
User Speech (ID) → Web Speech API (STT) → Text (ID)
                              ↓
                     Detect Language (ID)
                              ↓
                    Translate to English
                              ↓
                      RAG Pipeline (above)
                              ↓
               Gemini Response (English)
                              ↓
               Translate to Indonesian
                              ↓
          Text-to-Speech (Web Speech API)
                              ↓
                  Audio Output (ID Natural)
```

---

## ️ Tech Stack

### **Frontend** (`trial-web/`)

| Technology         | Version | Purpose                         |
| ------------------ | ------- | ------------------------------- |
| **React**          | ^19.1.1 | UI Framework                    |
| **Vite**           | ^7.1.7  | Build tool & Dev server         |
| **React Router**   | ^7.9.4  | Client-side routing             |
| **Three.js**       | latest  | 3D Avatar rendering             |
| **Web Speech API** | Native  | Speech-to-text & Text-to-speech |

**Libraries to Add:**

- `react-hot-toast` - Toast notifications
- `@react-three/fiber` - React Three.js integration
- `@react-three/drei` - Three.js helpers
- `react-loading-skeleton` - Loading skeletons
- `date-fns` - Date formatting
- `axios` - HTTP client

### **Backend API** (`tutor-cerdas-api/`)

| Technology             | Version | Purpose               |
| ---------------------- | ------- | --------------------- |
| **Node.js**            | 18+     | Runtime               |
| **Express**            | ^4.18.2 | Web framework         |
| **PostgreSQL**         | 14+     | Primary database      |
| **pg (node-postgres)** | latest  | PostgreSQL client     |
| **Helmet**             | ^8.1.0  | Security headers      |
| **CORS**               | ^2.8.5  | Cross-origin handling |
| **Multer**             | ^1.4.5  | File upload           |
| **Morgan**             | ^1.10.1 | HTTP logging          |
| **express-rate-limit** | ^8.1.0  | Rate limiting         |

**Libraries to Add:**

- `franc` - Language detection (lightweight, offline)
- `@google/generative-ai` - Gemini API SDK
- `express-validator` - Input validation
- `bcrypt` - Password hashing
- `jsonwebtoken` - JWT authentication
- `node-cache` - Caching
- `swagger-jsdoc` & `swagger-ui-express` - API docs

### **Indexer Service** (`indexer/`)

| Technology              | Version | Purpose             |
| ----------------------- | ------- | ------------------- |
| **Python**              | 3.11+   | Runtime             |
| **FastAPI**             | latest  | Web framework       |
| **Uvicorn**             | latest  | ASGI server         |
| **pypdf**               | latest  | PDF text extraction |
| **psycopg2**            | latest  | PostgreSQL client   |
| **google-generativeai** | latest  | Gemini API SDK      |
| **numpy**               | latest  | Vector operations   |
| **requests**            | latest  | HTTP client         |

**Key Changes:**

- ~~sentence-transformers~~ → **Gemini Embedding API**
- ~~Supabase Python~~ → **psycopg2 (PostgreSQL native)**

### **Database & Storage**

| Service                | Purpose                  |
| ---------------------- | ------------------------ |
| **PostgreSQL Native**  | Primary database         |
| **pgvector extension** | Vector similarity search |
| **Local File System**  | PDF storage (uploads/)   |

**Key Changes:**

- ~~Supabase (managed service)~~ → **PostgreSQL Native**
- ~~Supabase Storage~~ → **Local filesystem or S3-compatible**

### **External APIs**

- **Google Gemini API** - LLM untuk generate responses + Embedding
- **Web Speech API** - Browser native untuk STT & TTS (no external API needed)

---

## ️ Database Schema

### **Table: `profiles`**

```sql
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
CREATE INDEX idx_profiles_role ON profiles(role);
```

### **Table: `documents`**

```sql
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    filename TEXT NOT NULL,
    file_path TEXT NOT NULL, -- Path to file in uploads/ folder
    uploaded_by INTEGER REFERENCES profiles(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'indexing', 'indexed', 'failed')),
    file_size INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_documents_uploaded_by ON documents(uploaded_by);
CREATE INDEX idx_documents_created_at ON documents(created_at DESC);
CREATE INDEX idx_documents_status ON documents(status);
```

### **Table: `chunks`**

```sql
-- Enable pgvector extension first
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE chunks (
    id SERIAL PRIMARY KEY,
    document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    embedding vector(768) NOT NULL, -- Gemini embedding (768-dim)
    chunk_index INTEGER NOT NULL,
    start_char INTEGER,
    end_char INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_chunks_document_id ON chunks(document_id);
-- IVFFlat index for fast cosine similarity search
CREATE INDEX idx_chunks_embedding ON chunks USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

### **Table: `chat_history`**

```sql
CREATE TABLE chat_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES profiles(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    reply TEXT NOT NULL,
    language TEXT DEFAULT 'id', -- 'id' or 'en'
    sources JSONB, -- Array of chunk IDs used [{chunk_id, similarity, document_id}]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_chat_history_user_id ON chat_history(user_id);
CREATE INDEX idx_chat_history_created_at ON chat_history(created_at DESC);
```

### **Table: `feedback` (Optional)**

```sql
CREATE TABLE feedback (
    id SERIAL PRIMARY KEY,
    chat_id INTEGER REFERENCES chat_history(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES profiles(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating IN (-1, 1)), -- -1 = thumbs down, 1 = thumbs up
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_feedback_chat_id ON feedback(chat_id);
CREATE INDEX idx_feedback_user_id ON feedback(user_id);
```

### **SQL Function: `match_chunks`**

```sql
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

### **Authentication**

**Key Changes:**

- ~~Supabase Auth~~ → **JWT-based authentication**
- Password hashing dengan `bcrypt`
- Session management dengan JWT tokens
- Middleware untuk verify tokens

---

## Development Roadmap

### **PHASE 1: Foundation & Infrastructure** (Week 1)

> Target: Setup database, environment, dan core services

#### TODO 1: Setup Database Schema di PostgreSQL Native

**Priority:** Critical  
**Estimated Time:** 2-3 hours

**Steps:**

1. Install PostgreSQL 14+ locally atau gunakan hosted service (ElephantSQL, Railway, Render)
2. Install pgvector extension:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```
3. Di psql atau DBeaver, jalankan scripts untuk:
   - Create tables: `profiles`, `documents`, `chunks`, `chat_history`, `feedback`
   - Create indexes untuk performance
   - Create SQL function `match_chunks`
4. Test function dengan sample data:
   ```sql
   SELECT * FROM match_chunks(
     ARRAY[0.1, 0.2, ...]::vector(768),
     5,
     NULL
   );
   ```
5. Setup database connection di backend (pg pool)

**Verification:**

- [ ] All tables created successfully
- [ ] Indexes exist and queryable
- [ ] match_chunks function returns results
- [ ] Can connect from Node.js with pg library

---

#### TODO 2: Setup File Storage (Local Filesystem)

**Priority:** Critical  
**Estimated Time:** 1 hour

**Steps:**

1. Di `tutor-cerdas-api/`, create folder structure:
   ```
   tutor-cerdas-api/
   └── uploads/
       └── documents/
       └── temp/
   ```
2. Configure Multer untuk handle file uploads:
   ```javascript
   const storage = multer.diskStorage({
     destination: "uploads/documents/",
     filename: (req, file, cb) => {
       const uniqueName = `${Date.now()}-${file.originalname}`;
       cb(null, uniqueName);
     },
   });
   ```
3. Add .gitignore untuk uploads/ (jangan commit files)
4. Setup cleanup cron job untuk temp files (optional)

**Verification:**

- [ ] Folder structure created
- [ ] File upload works via Multer
- [ ] Files saved dengan unique names
- [ ] Path stored correctly di database

---

#### TODO 3: Setup Environment Variables & Configuration

**Priority:** Critical  
**Estimated Time:** 1 hour

**Files to Create:**

**`indexer/.env.example`**

```env
# PostgreSQL Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/tutorai

# Gemini API
GEMINI_API_KEY=your-gemini-api-key-here

# Chunking Configuration
CHUNK_SIZE=1000
CHUNK_OVERLAP=200

# Server Configuration
LOG_LEVEL=INFO
PORT=8000
```

**`tutor-cerdas-api/.env.example`**

```env
# PostgreSQL Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/tutorai

# Gemini API
GEMINI_API_KEY=your-gemini-api-key-here

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRES_IN=7d

# Server Configuration
PORT=8787
NODE_ENV=development

# CORS Configuration
WEB_ORIGIN=http://localhost:5173

# Indexer Service URL
INDEXER_URL=http://localhost:8000

# File Upload
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=52428800
```

**`trial-web/.env.example`**

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:8787
```

**Steps:**

1. Create `.env.example` files di setiap folder
2. Copy ke `.env` dan isi dengan actual values
3. Add `.env` ke `.gitignore` (jangan commit!)
4. Get Gemini API key dari: https://makersuite.google.com/app/apikey
5. Document di README cara setup environment

**Verification:**

- [ ] All `.env.example` files created
- [ ] `.env` files exist locally
- [ ] Gemini API key valid (test dengan simple request)
- [ ] Database connection string correct---

### **PHASE 2: Indexer Service** (Week 1-2)

> Target: RAG pipeline untuk document processing dan retrieval dengan Gemini API

#### TODO 4: Implementasi Indexer Service - Optimisasi Chunking

**Priority:** Critical  
**Estimated Time:** 3-4 hours

**File:** `indexer/chunker_embedder.py`

**Implementation:**

```python
from typing import List, Dict
import re

def preprocess_text(text: str) -> str:
    """Clean and normalize text"""
    # Remove extra whitespace
    text = re.sub(r'\s+', ' ', text)
    # Remove special characters but keep punctuation
    text = re.sub(r'[^\w\s.,!?-]', '', text)
    # Normalize line breaks
    text = text.replace('\r\n', '\n')
    return text.strip()

def chunk_text(
    text: str,
    chunk_size: int = 1000,
    overlap: int = 200
) -> List[Dict[str, any]]:
    """
    Split text into overlapping chunks with metadata.

    Returns:
        List of dicts with: content, chunk_index, start_char, end_char
    """
    text = preprocess_text(text)
    chunks = []
    start = 0
    chunk_index = 0

    while start < len(text):
        end = start + chunk_size

        # Try to break at sentence boundary
        if end < len(text):
            # Look for sentence end within last 100 chars
            search_start = max(start, end - 100)
            match = re.search(r'[.!?]\s', text[search_start:end])
            if match:
                end = search_start + match.end()

        chunk_content = text[start:end].strip()

        if chunk_content:
            chunks.append({
                'content': chunk_content,
                'chunk_index': chunk_index,
                'start_char': start,
                'end_char': end
            })
            chunk_index += 1

        # Move start position with overlap
        start = end - overlap if end < len(text) else end

    return chunks
```

**Testing:**

```python
# Test with sample text
sample = "This is sentence one. This is sentence two. " * 100
chunks = chunk_text(sample, chunk_size=200, overlap=50)
print(f"Generated {len(chunks)} chunks")
print(f"First chunk: {chunks[0]}")
```

**Verification:**

- [ ] Function chunks text correctly
- [ ] Overlap working properly
- [ ] Metadata (indices) accurate
- [ ] Handles edge cases (short text, empty text)

---

#### TODO 5: Implementasi Indexer Service - Gemini Embedding

**Priority:** Critical  
**Estimated Time:** 3-4 hours

**File:** `indexer/chunker_embedder.py`

**Implementation:**

```python
import google.generativeai as genai
from typing import List
import os
from tqdm import tqdm

# Configure Gemini API
genai.configure(api_key=os.environ.get('GEMINI_API_KEY'))

def embed_batches(
    texts: List[str],
    model_name: str = "models/embedding-001",
    batch_size: int = 100,
    show_progress: bool = True
) -> List[List[float]]:
    """
    Generate embeddings for list of texts using Gemini API.

    Args:
        texts: List of text strings to embed
        model_name: Gemini embedding model (embedding-001 = 768 dim)
        batch_size: Process N texts per API call (max 100)
        show_progress: Show progress bar

    Returns:
        List of embeddings (each is a list of 768 floats)
    """
    all_embeddings = []

    iterator = range(0, len(texts), batch_size)
    if show_progress:
        iterator = tqdm(iterator, desc="Embedding batches")

    for i in iterator:
        batch = texts[i:i + batch_size]

        try:
            # Call Gemini Embedding API
            result = genai.embed_content(
                model=model_name,
                content=batch,
                task_type="retrieval_document",  # For document chunks
                title="Document chunk"
            )

            # Extract embeddings
            embeddings = result['embedding']

            # Handle single vs batch
            if isinstance(embeddings[0], list):
                all_embeddings.extend(embeddings)
            else:
                all_embeddings.append(embeddings)

        except Exception as e:
            print(f"Error embedding batch {i}: {e}")
            # Add zero vectors as fallback
            all_embeddings.extend([[0.0] * 768 for _ in batch])

    return all_embeddings

def embed_query(query: str) -> List[float]:
    """
    Embed a single query using Gemini API.
    Optimized for retrieval queries.
    """
    result = genai.embed_content(
        model="models/embedding-001",
        content=query,
        task_type="retrieval_query"  # For search queries
    )
    return result['embedding']
```

**Testing:**

```python
# Test embedding
texts = ["Hello world", "This is a test document about machine learning"]
embeddings = embed_batches(texts, batch_size=2)
print(f"Generated {len(embeddings)} embeddings")
print(f"Embedding dimension: {len(embeddings[0])}")

# Test query embedding
query_emb = embed_query("What is machine learning?")
print(f"Query embedding dim: {len(query_emb)}")
```

**Verification:**

- [ ] Gemini API connection works
- [ ] Embeddings are 768-dimensional
- [ ] Batch processing works
- [ ] Query embeddings generated correctly
- [ ] Error handling for API failures

---

#### TODO 6: Implementasi Indexer Service - PDF Processing

**Priority:** Critical  
**Estimated Time:** 4-5 hours

**File:** `indexer/indexer_rag.py`

**Implementation:**

```python
import psycopg2
from psycopg2.extras import execute_values
import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from pypdf import PdfReader
import re

app = FastAPI(title='RAG Indexer')

# Database connection
def get_db_connection():
    return psycopg2.connect(os.environ.get('DATABASE_URL'))

class IndexPayload(BaseModel):
    document_id: int
    file_path: str
    filename: str

@app.post("/index")
async def index_document(payload: IndexPayload):
    """
    Index a document: load PDF, chunk, embed, store to PostgreSQL.
    """
    try:
        document_id = payload.document_id

        # 1. Load PDF file
        if not os.path.exists(payload.file_path):
            raise HTTPException(400, f"File not found: {payload.file_path}")

        # 2. Extract text from PDF
        pdf_reader = PdfReader(payload.file_path)
        full_text = ""
        for page in pdf_reader.pages:
            text = page.extract_text()
            # Clean page-specific artifacts
            text = re.sub(r'Page \d+', '', text)
            text = re.sub(r'\n+', '\n', text)
            full_text += text + "\n"

        if not full_text.strip():
            raise HTTPException(400, "No text extracted from PDF")

        # 3. Chunk text
        from chunker_embedder import chunk_text, embed_batches
        chunks = chunk_text(full_text, 1000, 200)

        # 4. Generate embeddings via Gemini API
        chunk_texts = [c['content'] for c in chunks]
        embeddings = embed_batches(chunk_texts, batch_size=100)

        # 5. Insert to PostgreSQL (batch insert)
        conn = get_db_connection()
        cur = conn.cursor()

        # Prepare data for batch insert
        values = [
            (
                document_id,
                chunk['content'],
                embeddings[idx],  # vector array
                chunk['chunk_index'],
                chunk['start_char'],
                chunk['end_char']
            )
            for idx, chunk in enumerate(chunks)
        ]

        # Execute batch insert
        execute_values(
            cur,
            """
            INSERT INTO chunks (document_id, content, embedding, chunk_index, start_char, end_char)
            VALUES %s
            """,
            values,
            template="(%s, %s, %s::vector, %s, %s, %s)"
        )

        # Update document status
        cur.execute(
            "UPDATE documents SET status = 'indexed' WHERE id = %s",
            (document_id,)
        )

        conn.commit()
        cur.close()
        conn.close()

        return {
            'success': True,
            'chunks_created': len(chunks),
            'document_id': document_id
        }

    except Exception as e:
        # Update document status to failed
        try:
            conn = get_db_connection()
            cur = conn.cursor()
            cur.execute(
                "UPDATE documents SET status = 'failed' WHERE id = %s",
                (document_id,)
            )
            conn.commit()
            cur.close()
            conn.close()
        except:
            pass

        raise HTTPException(500, f"Indexing failed: {str(e)}")
```

**Verification:**

- [ ] PDF loading works
- [ ] Text extraction successful
- [ ] Chunks created and embedded
- [ ] Database insertion successful (test with actual PostgreSQL)
- [ ] Error handling works
- [ ] Document status updated correctly

---

#### TODO 7: Implementasi Retrieval Service - Semantic Search

**Priority:** Critical  
**Estimated Time:** 3-4 hours

**File:** `indexer/retrieval.py` (or add to `indexer_rag.py`)

**Implementation:**

```python
from pydantic import BaseModel
from typing import Optional, List, Dict

class RetrievalPayload(BaseModel):
    query: str
    document_id: Optional[int] = None
    k: int = 5

@app.post("/retrieve")
async def retrieve_chunks(payload: RetrievalPayload):
    """
    Semantic search for relevant chunks using cosine similarity.
    """
    try:
        from chunker_embedder import embed_query

        # 1. Embed query using Gemini
        query_embedding = embed_query(payload.query)

        # 2. Call PostgreSQL function for similarity search
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute(
            "SELECT * FROM match_chunks(%s::vector, %s, %s)",
            (query_embedding, payload.k, payload.document_id)
        )

        results = cur.fetchall()
        cur.close()
        conn.close()

        # 3. Format results
        formatted_results = [
            {
                'id': row[0],
                'document_id': row[1],
                'content': row[2],
                'chunk_index': row[3],
                'similarity': float(row[4])
            }
            for row in results
        ]

        return {
            'results': formatted_results,
            'query': payload.query,
            'count': len(formatted_results)
        }

    except Exception as e:
        raise HTTPException(500, f"Retrieval failed: {str(e)}")
```

**Testing:**

```bash
# Test with curl
curl -X POST http://localhost:8000/retrieve \
  -H "Content-Type: application/json" \
  -d '{"query": "What is machine learning?", "k": 3}'
```

**Verification:**

- [ ] Query embedding via Gemini works
- [ ] PostgreSQL function called successfully
- [ ] Results sorted by similarity (highest first)
- [ ] Returns correct number of chunks
- [ ] Performance acceptable (<500ms)---

### **PHASE 3: Backend API Core** (Week 2)

> Target: Authentication, chat API, dan admin endpoints

#### TODO 8: Implementasi Language Detection & Translation Service

**Priority:** High  
**Estimated Time:** 3-4 hours

**File:** `tutor-cerdas-api/src/lib/translator.js`

**Implementation:**

```javascript
// Using franc (lightweight, offline language detection)
const franc = require("franc");

/**
 * Detect language of text
 * @param {string} text
 * @returns {string} Language code ('eng' or 'ind')
 */
function detectLanguage(text) {
  try {
    const lang = franc(text, { minLength: 10 });
    // franc returns 'ind' for Indonesian, 'eng' for English
    if (lang === "und" || lang === "eng") return "en";
    if (lang === "ind") return "id";
    return "en"; // default to English
  } catch (error) {
    console.error("Language detection failed:", error);
    return "en";
  }
}

/**
 * Simple translation mapping (for common phrases)
 * For production, use Google Translate API or similar
 */
const translations = {
  id_to_en: {
    // Add common translations if needed
  },
  en_to_id: {
    // Add common translations if needed
  },
};

/**
 * Translate text (placeholder - implement with API if needed)
 * @param {string} text
 * @param {string} toLang - Target language ('en', 'id')
 * @returns {Promise<string>}
 */
async function translateText(text, toLang) {
  try {
    // Option 1: No translation - let Gemini handle multilingual
    // Gemini can understand and respond in Indonesian
    return text;

    // Option 2: Use Google Translate API (if implemented)
    // const response = await googleTranslate(text, toLang);
    // return response;
  } catch (error) {
    console.error("Translation failed:", error);
    return text; // Fallback to original
  }
}

/**
 * Translate to English (if needed for retrieval)
 */
async function translateToEnglish(text) {
  const lang = detectLanguage(text);
  if (lang === "en") return text;
  return translateText(text, "en");
}

/**
 * Translate to Indonesian
 */
async function translateToIndonesian(text) {
  return translateText(text, "id");
}

module.exports = {
  detectLanguage,
  translateText,
  translateToEnglish,
  translateToIndonesian,
};
```

**Notes:**

- Gemini API already supports Indonesian natively
- Translation might not be needed if documents are in English
- franc library is lightweight and works offline

**Verification:**

- [ ] Language detection works for ID and EN
- [ ] detectLanguage returns correct codes
- [ ] Module exports correctly
- [ ] No crashes on edge cases

---

#### TODO 9: Implementasi Authentication System (JWT-based)

**Priority:** Critical  
**Estimated Time:** 5-6 hours

**File:** `tutor-cerdas-api/src/lib/db.js`

```javascript
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

module.exports = { pool };
```

**File:** `tutor-cerdas-api/src/routes/auth.js`

**Implementation:**

```javascript
const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { pool } = require("../lib/db");

// Register
router.post("/register", async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Validate input
    if (!email || !password || !name) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (password.length < 8) {
      return res
        .status(400)
        .json({ error: "Password must be at least 8 characters" });
    }

    // Check if user exists
    const existingUser = await pool.query(
      "SELECT id FROM profiles WHERE email = $1",
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: "Email already registered" });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert user
    const result = await pool.query(
      `INSERT INTO profiles (email, password_hash, name, role) 
       VALUES ($1, $2, $3, 'user') 
       RETURNING id, email, name, role`,
      [email, passwordHash, name]
    );

    res.json({
      success: true,
      message: "Registration successful. Please login.",
      user: result.rows[0],
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Registration failed" });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Get user from database
    const result = await pool.query(
      "SELECT * FROM profiles WHERE email = $1 AND is_active = true",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = result.rows[0];

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    // Return user data (without password)
    const { password_hash, ...userWithoutPassword } = user;

    res.json({
      success: true,
      token,
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
});

module.exports = router;
```

**File:** `tutor-cerdas-api/src/middleware/auth.js`

```javascript
const jwt = require("jsonwebtoken");
const { pool } = require("../lib/db");

async function authenticateUser(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing or invalid token" });
    }

    const token = authHeader.substring(7);

    // Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch user from database
    const result = await pool.query(
      "SELECT id, email, name, role, is_active FROM profiles WHERE id = $1",
      [decoded.userId]
    );

    if (result.rows.length === 0 || !result.rows[0].is_active) {
      return res.status(401).json({ error: "Invalid token" });
    }

    // Attach user to request
    req.user = result.rows[0];

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(401).json({ error: "Authentication failed" });
  }
}

module.exports = { authenticateUser };
```

**Verification:**

- [ ] Registration creates user with hashed password
- [ ] Login returns JWT token
- [ ] Middleware validates tokens correctly
- [ ] Invalid tokens rejected
- [ ] User data attached to req.user---

#### TODO 9: Implementasi Gemini API Integration - RAG Pipeline

**Priority:** Critical  
**Estimated Time:** 5-6 hours

**File:** `tutor-cerdas-api/src/lib/gemini.js`

**Implementation:**

```javascript
const { GoogleGenerativeAI } = require("@google/generative-ai");
const {
  translateToEnglish,
  translateToIndonesian,
  detectLanguage,
} = require("./translator");
const { fetchFromIndexer } = require("./fetcher");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Generate RAG-enhanced response
 * @param {string} userMessage - User's question
 * @param {Array} conversationHistory - Previous messages (optional)
 * @returns {Promise<Object>} { reply, language, sources }
 */
async function generateRAGResponse(userMessage, conversationHistory = []) {
  try {
    // 1. Detect language
    const originalLang = detectLanguage(userMessage);

    // 2. Translate to English if needed
    const messageInEnglish =
      originalLang === "eng"
        ? userMessage
        : await translateToEnglish(userMessage);

    // 3. Retrieve relevant context from indexer
    const retrievalResponse = await fetchFromIndexer("/retrieve", {
      method: "POST",
      body: JSON.stringify({
        query: messageInEnglish,
        k: 5,
      }),
    });

    const { results } = retrievalResponse;

    // 4. Format context
    const context = results
      .map((r, i) => `[${i + 1}] ${r.content}`)
      .join("\n\n");

    // 5. Build prompt
    const systemPrompt = `You are TutorAI, a helpful and knowledgeable tutor. Use the following context to answer the user's question accurately. If the context doesn't contain relevant information, use your general knowledge but mention that it's not from the provided materials.

Context:
${context}

Answer in a clear, educational manner. Provide examples when appropriate.`;

    // 6. Call Gemini API
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const chat = model.startChat({
      history: conversationHistory.map((msg) => ({
        role: msg.role,
        parts: [{ text: msg.content }],
      })),
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1000,
      },
    });

    const result = await chat.sendMessage(
      `${systemPrompt}\n\nUser: ${messageInEnglish}\n\nAssistant:`
    );
    const responseText = result.response.text();

    // 7. Translate back to original language
    const finalReply =
      originalLang === "eng"
        ? responseText
        : await translateToIndonesian(responseText);

    return {
      reply: finalReply,
      language: originalLang === "eng" ? "en" : "id",
      sources: results.map((r) => ({
        document_id: r.document_id,
        chunk_index: r.chunk_index,
        similarity: r.similarity,
      })),
    };
  } catch (error) {
    console.error("RAG response generation failed:", error);
    throw new Error("Failed to generate response");
  }
}

module.exports = { generateRAGResponse };
```

**Verification:**

- [ ] Context retrieval works
- [ ] Gemini API responds
- [ ] Translation pipeline works
- [ ] Sources tracked correctly

---

#### TODO 10: Implementasi Authentication System

**Priority:** Critical  
**Estimated Time:** 4-5 hours

**File:** `tutor-cerdas-api/src/routes/auth.js`

**Implementation:**

```javascript
const express = require("express");
const router = express.Router();
const { supabase } = require("../lib/supabaseClient");

// Register
router.post("/register", async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Validate input
    if (!email || !password || !name) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (password.length < 8) {
      return res
        .status(400)
        .json({ error: "Password must be at least 8 characters" });
    }

    // Sign up with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) throw authError;

    // Insert profile
    const { error: profileError } = await supabase.from("profiles").insert({
      id: authData.user.id,
      email,
      name,
      role: "user",
    });

    if (profileError) throw profileError;

    res.json({
      success: true,
      message: "Registration successful. Please login.",
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    // Fetch profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", data.user.id)
      .single();

    res.json({
      session: data.session,
      user: data.user,
      profile,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(401).json({ error: "Invalid credentials" });
  }
});

module.exports = router;
```

**File:** `tutor-cerdas-api/src/middleware/auth.js`

```javascript
const { supabase } = require("../lib/supabaseClient");

async function authenticateUser(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing or invalid token" });
    }

    const token = authHeader.substring(7);

    // Verify JWT with Supabase
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: "Invalid token" });
    }

    // Fetch profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    // Attach to request
    req.user = user;
    req.profile = profile;

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(401).json({ error: "Authentication failed" });
  }
}

module.exports = { authenticateUser };
```

**Verification:**

- [ ] Registration creates user and profile
- [ ] Login returns session token
- [ ] Middleware validates tokens
- [ ] Invalid tokens rejected

---

### Continue with remaining TODOs...

_Due to character limits, I'll provide the structure for remaining phases. Each TODO follows the same detailed format above._

---

### **PHASE 4: Chat & Admin APIs** (Week 2-3)

- TODO 11: Chat API - User Chat Endpoint
- TODO 12: Chat History API
- TODO 13: Admin Document Management API
- TODO 14: Admin User Management API
- TODO 15: Admin Chat Monitoring API
- TODO 16: Admin Dashboard Statistics API

### **PHASE 5: Frontend Core** (Week 3)

- TODO 17: Setup Frontend Routing & Layout
- TODO 18: Login & Register Pages
- TODO 19: User Chat Page (Home)
- TODO 20: Chat History Page
- TODO 21: Admin Dashboard Page
- TODO 22-24: Admin Management Pages

### **PHASE 6: Advanced Features** (Week 3-4)

- TODO 25: Speech-to-Text Feature
- TODO 26: Text-to-Speech Feature
- TODO 27: 3D Avatar dengan Animasi
- TODO 28: Avatar Logic Integration

### **PHASE 7: Quality Assurance** (Week 4)

- TODO 29-35: Error handling, validation, security, optimization
- TODO 36-40: Testing (unit, integration, E2E)

### **PHASE 8: Documentation & Deployment** (Week 4)

- TODO 41-48: Documentation (API, user guide, developer docs)
- TODO 49-52: Security audit, production deployment, monitoring

---

## Setup Instructions

### Prerequisites

- Node.js 18+
- Python 3.11+
- Supabase account
- Gemini API key

### Installation

```bash
# Clone repository
git clone <repo-url>
cd RAG-Gemini2

# Setup Indexer
cd indexer
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your credentials

# Setup Backend API
cd ../tutor-cerdas-api
npm install
cp .env.example .env
# Edit .env with your credentials

# Setup Frontend
cd ../trial-web
npm install
cp .env.example .env
# Edit .env with your credentials
```

### Running Services

```bash
# Terminal 1: Indexer
cd indexer
uvicorn indexer_rag:app --reload --port 8000

# Terminal 2: Backend API
cd tutor-cerdas-api
npm run dev

# Terminal 3: Frontend
cd trial-web
npm run dev
```

---

## API Documentation

### Indexer API (`http://localhost:8000`)

#### POST `/index`

Index a document (PDF → chunks → embeddings)

**Request:**

```json
{
  "document_id": "uuid",
  "public_url": "https://...",
  "filename": "document.pdf"
}
```

**Response:**

```json
{
  "success": true,
  "chunks_created": 42,
  "document_id": "uuid"
}
```

#### POST `/retrieve`

Semantic search for relevant chunks

**Request:**

```json
{
  "query": "What is machine learning?",
  "k": 5,
  "document_id": "uuid" // optional
}
```

**Response:**

```json
{
  "results": [
    {
      "content": "...",
      "similarity": 0.89,
      "document_id": "uuid",
      "chunk_index": 0
    }
  ],
  "query": "...",
  "count": 5
}
```

### Backend API (`http://localhost:8787`)

#### POST `/api/auth/register`

Create new user account

#### POST `/api/auth/login`

Login and get session token

#### POST `/api/chat`

Send message to AI tutor (requires auth)

#### GET `/api/chat/history`

Get user's chat history (requires auth)

#### POST `/api/admin/documents/upload`

Upload document for indexing (requires admin)

#### GET `/api/admin/stats`

Get dashboard statistics (requires admin)

_Full API documentation available at `/api-docs` (Swagger UI)_

---

## UI/UX Design Notes

### Color Scheme

- Primary: `#4F46E5` (Indigo)
- Secondary: `#10B981` (Green)
- Background: `#F9FAFB` (Light gray)
- Text: `#111827` (Dark gray)

### Components

- **ChatBubble**: User (right, blue), AI (left, gradient)
- **Avatar**: 3D model positioned top-left, 200x200px
- **Navbar**: Fixed top, translucent background
- **Sidebar**: Collapsible on mobile

---

## Security Considerations

1. **Authentication**: JWT tokens via Supabase
2. **Authorization**: Row-level security (RLS)
3. **Input Validation**: express-validator
4. **Rate Limiting**: 30 req/min for chat
5. **File Upload**: 50MB limit, PDF only
6. **CORS**: Whitelist frontend domain
7. **HTTPS**: Enforce in production

---

## Performance Targets

- **Page Load**: < 2s
- **API Response**: < 500ms (chat), < 2s (indexing)
- **Embedding**: < 100ms per batch (32 chunks)
- **Retrieval**: < 300ms
- **Bundle Size**: < 500KB (gzipped)

---

## Contributing

1. Fork repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open Pull Request

---

## License

MIT License - see LICENSE file

---

## Team

- **Frontend**: Ucup Isya + PM
- **Backend**: PM + Paci Hamam
- **Project Manager**: Coordination & Integration

---

## Timeline

- **Week 1**: Foundation + Indexer
- **Week 2**: Backend APIs
- **Week 3**: Frontend + Features
- **Week 4**: Testing + Deployment

**Target Launch:** November 26, 2025

---

**Last Updated:** October 29, 2025  
**Version:** 1.0.0
