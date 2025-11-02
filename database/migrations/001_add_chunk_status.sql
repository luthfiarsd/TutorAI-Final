-- Migration: Add status tracking for chunks
-- Purpose: Enable progressive processing (chunking first, embedding later)
-- Date: 2025-11-02

-- Step 1: Make embedding nullable (allow chunks without embeddings)
ALTER TABLE chunks 
ALTER COLUMN embedding DROP NOT NULL;

-- Step 2: Add status column to track chunk processing state
ALTER TABLE chunks 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' 
CHECK (status IN ('pending', 'embedded', 'failed'));

-- Step 3: Add error message column for failed embeddings
ALTER TABLE chunks 
ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Step 4: Add retry count for failed chunks
ALTER TABLE chunks 
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;

-- Step 5: Update existing chunks to 'embedded' status (backward compatibility)
UPDATE chunks 
SET status = 'embedded' 
WHERE embedding IS NOT NULL;

-- Step 6: Create index for efficient querying of pending chunks
CREATE INDEX IF NOT EXISTS idx_chunks_status ON chunks(status);
CREATE INDEX IF NOT EXISTS idx_chunks_document_status ON chunks(document_id, status);

-- Step 7: Add updated_at column for tracking
ALTER TABLE chunks 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

COMMENT ON COLUMN chunks.status IS 'Chunk processing status: pending (chunked, waiting for embedding), embedded (completed), failed (embedding error)';
COMMENT ON COLUMN chunks.retry_count IS 'Number of retry attempts for failed embeddings';
