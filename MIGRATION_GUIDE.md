# Migration Guide: Semantic Chunking & Progressive Processing

## Overview

This migration upgrades the TutorAI indexer to:

1. **Semantic Chunking** - Better quality chunks using NLTKTextSplitter
2. **Progressive Processing** - Chunking and embedding are separated
3. **Retry Mechanism** - Failed embeddings can be retried without re-chunking

---

## Step-by-Step Migration

### **Step 1: Install New Dependencies**

```bash
cd indexer
pip install -r requirements.txt
```

This will install:

- `langchain==0.3.7` - For semantic text splitting
- `langchain-text-splitters==0.3.2` - Text splitting utilities
- `nltk==3.9.1` - Natural Language Toolkit for sentence tokenization

---

### **Step 2: Run Database Migration**

Connect to your PostgreSQL database and run:

```bash
psql -U your_username -d your_database -f database/migrations/001_add_chunk_status.sql
```

Or manually execute the SQL:

```sql
-- Make embedding nullable
ALTER TABLE chunks ALTER COLUMN embedding DROP NOT NULL;

-- Add status tracking columns
ALTER TABLE chunks ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending'
CHECK (status IN ('pending', 'embedded', 'failed'));

ALTER TABLE chunks ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE chunks ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;
ALTER TABLE chunks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update existing chunks
UPDATE chunks SET status = 'embedded' WHERE embedding IS NOT NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_chunks_status ON chunks(status);
CREATE INDEX IF NOT EXISTS idx_chunks_document_status ON chunks(document_id, status);
```

---

### **Step 3: Restart Indexer Service**

```bash
cd indexer
# Stop current service (Ctrl+C if running)
# Start with new code
uvicorn indexer_rag:app --reload --port 8000
```

---

### **Step 4: Re-process Failed Documents**

Since your 3 documents failed during embedding, you now need to:

#### **Option A: Re-chunk from scratch (Recommended)**

```bash
# Call the /index endpoint again for each document
curl -X POST http://localhost:8000/index \
  -H "Content-Type: application/json" \
  -d '{
    "document_id": 1,
    "file_path": "d:\\KULIAH\\PIPP\\TutorAI-Final\\tutor-cerdas-api\\uploads\\documents\\1761730888723-776431510.pdf"
  }'
```

This will:

- Extract text from PDF
- Create semantic chunks
- Save chunks to database (without embeddings)
- Status: `pending`

#### **Option B: Clear old failed data first**

```sql
-- Delete chunks from failed documents
DELETE FROM chunks WHERE document_id IN (
    SELECT id FROM documents WHERE status = 'failed'
);

-- Reset document status
UPDATE documents SET status = 'pending', error_message = NULL
WHERE status = 'failed';
```

---

### **Step 5: Generate Embeddings**

After chunks are created, generate embeddings separately:

```bash
# Process all pending chunks (batch of 50)
curl -X POST http://localhost:8000/embed

# Or process specific document only
curl -X POST http://localhost:8000/embed?document_id=1&batch_size=50
```

**Parameters:**

- `document_id` (optional): Process only chunks from this document
- `batch_size` (default: 50): Number of chunks to process at once
- `max_retries` (default: 3): Maximum retry attempts

**Response:**

```json
{
  "success": true,
  "message": "Processed 45 chunks",
  "processed": 45,
  "succeeded": 45,
  "failed": 0,
  "failed_chunk_ids": []
}
```

---

### **Step 6: Handle Quota Exceeded (If Happens)**

If you still hit quota limits, the system now handles it gracefully:

```bash
# Check stats
curl http://localhost:8000/stats

# Wait for quota reset (check Gemini quota page)
# Then retry failed chunks
curl -X POST http://localhost:8000/retry-failed

# Or retry specific document
curl -X POST http://localhost:8000/retry-failed?document_id=1

# Run embed again
curl -X POST http://localhost:8000/embed
```

---

## New Workflow

### **Old Workflow (All-or-Nothing):**

```
Upload PDF → Extract → Chunk → Embed (FAILS HERE) →  Lost all work
```

### **New Workflow (Progressive):**

```
Upload PDF → Extract → Chunk →  Saved to DB
                                ↓
                        Embed (can retry) →  Success
                                ↓
                        If fails → Retry later
```

---

## Check Progress

### **Get Statistics:**

```bash
curl http://localhost:8000/stats
```

**Response:**

```json
{
  "documents": {
    "completed": 3,
    "failed": 0
  },
  "chunks": {
    "total": 150,
    "with_embeddings": 120,
    "by_status": {
      "pending": 10,
      "embedded": 120,
      "failed": 20
    }
  }
}
```

---

## New API Endpoints

### **1. POST /index**

- **Purpose:** Extract text, create semantic chunks, save to DB
- **Note:** Does NOT generate embeddings anymore
- **Call /embed after this**

### **2. POST /embed**

- **Purpose:** Generate embeddings for pending chunks
- **Parameters:** `document_id`, `batch_size`, `max_retries`
- **Safe to call multiple times**

### **3. POST /retry-failed**

- **Purpose:** Reset failed chunks to retry
- **Parameters:** `document_id` (optional)
- **Use after fixing quota issues**

### **4. GET /stats**

- **Purpose:** Get detailed statistics
- **Returns:** Document status, chunk counts by status

---

## Benefits

**No more lost work** - Chunks saved even if embedding fails
**Better chunking** - Semantic-aware splitting (respects sentences)
**Flexible retry** - Retry only failed chunks
**Progress tracking** - See exactly what's processed
**Quota-friendly** - Process in batches, pause/resume anytime
**Cost-efficient** - Don't pay for re-chunking after embedding failure

---

## Important Notes

1. **Existing embedded chunks:** Automatically marked as `status='embedded'`
2. **Quota management:** Process in small batches to avoid hitting limits
3. **Monitoring:** Use `/stats` endpoint to track progress
4. **Semantic chunking:** May create slightly different chunk sizes (but better quality)

---

## Testing

```bash
# 1. Upload a test document
curl -X POST http://localhost:3000/api/admin/documents/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "document=@test.pdf"

# 2. Index it (chunking only)
curl -X POST http://localhost:8000/index \
  -H "Content-Type: application/json" \
  -d '{"document_id": 1, "file_path": "/path/to/test.pdf"}'

# 3. Generate embeddings
curl -X POST http://localhost:8000/embed?batch_size=10

# 4. Check results
curl http://localhost:8000/stats
```

---

## Troubleshooting

**Q: My chunks have no embeddings?**

- Run `/embed` endpoint to generate them

**Q: Embedding keeps failing?**

- Check Gemini API quota
- Use smaller batch_size
- Wait for quota reset

**Q: Want to start fresh?**

```sql
DELETE FROM chunks;
UPDATE documents SET status = 'pending';
```

**Q: NLTK download fails?**

- The code auto-downloads punkt tokenizer
- If fails, manually: `python -c "import nltk; nltk.download('punkt')"`
