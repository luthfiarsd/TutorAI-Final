-- TutorAI Database Schema
-- PostgreSQL 14+ with pgvector extension

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Drop tables if they exist (for clean setup)
DROP TABLE IF EXISTS feedback CASCADE;
DROP TABLE IF EXISTS chat_history CASCADE;
DROP TABLE IF EXISTS chunks CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

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
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_is_active ON profiles(is_active);

-- Documents table
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    uploaded_by INTEGER REFERENCES profiles(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    file_size INTEGER,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_uploaded_by ON documents(uploaded_by);
CREATE INDEX idx_documents_created_at ON documents(created_at DESC);

-- Chunks table with vector embeddings (768-dimensional for Gemini)
CREATE TABLE chunks (
    id SERIAL PRIMARY KEY,
    document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    embedding vector(768) NOT NULL,
    chunk_index INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_chunks_document_id ON chunks(document_id);
-- IVFFlat index for fast similarity search
CREATE INDEX idx_chunks_embedding ON chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Chat history table
CREATE TABLE chat_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES profiles(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    reply TEXT NOT NULL,
    language TEXT DEFAULT 'id',
    sources JSONB, -- Store array of source chunks [{chunk_id, document_id, similarity}]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_chat_history_user_id ON chat_history(user_id);
CREATE INDEX idx_chat_history_created_at ON chat_history(created_at DESC);
CREATE INDEX idx_chat_history_language ON chat_history(language);

-- Feedback table (optional - for user ratings)
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
CREATE INDEX idx_feedback_rating ON feedback(rating);

-- Function for similarity search using cosine similarity
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

-- Create default admin user (password: admin123 - hashed with bcrypt)
-- Note: This is for development only. Change password in production!
INSERT INTO profiles (email, password_hash, name, role) VALUES 
('admin@tutorai.com', '$2b$10$rXYvK8qF8qS0XxTnqvKJpO.Y3qXqJnQZhX6xPvK7qXqYqZqXqXqXq', 'Admin User', 'admin');

-- Note: The password hash above is a placeholder. 
-- To generate a real hash, use bcrypt in Node.js:
-- const bcrypt = require('bcrypt');
-- const hash = await bcrypt.hash('admin123', 10);

COMMENT ON TABLE profiles IS 'User profiles with JWT authentication';
COMMENT ON TABLE documents IS 'Uploaded PDF documents for RAG';
COMMENT ON TABLE chunks IS 'Text chunks with Gemini embeddings (768-dim)';
COMMENT ON TABLE chat_history IS 'User chat conversations with AI';
COMMENT ON TABLE feedback IS 'User feedback on chat responses (thumbs up/down)';
COMMENT ON FUNCTION match_chunks IS 'Semantic similarity search using cosine distance';
