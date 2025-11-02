"""
TutorAI Indexer Service
FastAPI service for PDF processing, text chunking, embedding, and semantic retrieval
"""

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import psycopg2
from psycopg2.extras import execute_values
import os
from dotenv import load_dotenv
import pypdf
import tempfile

try:
    from chunker_embedder import chunk_text, embed_batches, embed_query, embed_text
except ImportError:
    from .chunker_embedder import chunk_text, embed_batches, embed_query, embed_text

load_dotenv()

# Initialize FastAPI app
app = FastAPI(
    title="TutorAI Indexer Service",
    description="PDF processing, embedding generation, and semantic retrieval",
    version="1.0.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify allowed origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database connection
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL not found in environment variables")


def get_db_connection():
    """Create and return a database connection"""
    return psycopg2.connect(DATABASE_URL)


# Pydantic models
class IndexRequest(BaseModel):
    document_id: int
    file_path: str


class IndexResponse(BaseModel):
    success: bool
    document_id: int
    chunks_created: int
    message: str


class RetrieveRequest(BaseModel):
    query: str
    top_k: int = 5
    document_id: Optional[int] = None


class ChunkResult(BaseModel):
    chunk_id: int
    document_id: int
    content: str
    chunk_index: int
    similarity: float


class RetrieveResponse(BaseModel):
    success: bool
    query: str
    results: List[ChunkResult]


@app.get("/")
async def root():
    """Health check endpoint"""
    return {"service": "TutorAI Indexer", "status": "running", "version": "1.0.0"}


@app.get("/health")
async def health_check():
    """Detailed health check with database connectivity"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        cursor.close()
        conn.close()

        return {
            "status": "healthy",
            "database": "connected",
            "gemini_api": (
                "configured" if os.getenv("GEMINI_API_KEY") else "not configured"
            ),
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "database": f"error: {str(e)}",
            "gemini_api": (
                "configured" if os.getenv("GEMINI_API_KEY") else "not configured"
            ),
        }


@app.post("/index", response_model=IndexResponse)
async def index_document(request: IndexRequest):
    """
    Process a PDF document: extract text, chunk, and store to database
    Embeddings are generated separately via /embed endpoint

    Args:
        document_id: ID of the document in the documents table
        file_path: Absolute path to the PDF file

    Returns:
        IndexResponse with success status and number of chunks created
    """
    try:
        # Update document status to processing
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute(
            "UPDATE documents SET status = 'processing', updated_at = NOW() WHERE id = %s",
            (request.document_id,),
        )
        conn.commit()

        # Read PDF file
        if not os.path.exists(request.file_path):
            raise HTTPException(
                status_code=404, detail=f"File not found: {request.file_path}"
            )

        # Extract text from PDF
        print(f"Extracting text from PDF: {request.file_path}")
        pdf_text = ""

        with open(request.file_path, "rb") as pdf_file:
            pdf_reader = pypdf.PdfReader(pdf_file)
            for page in pdf_reader.pages:
                pdf_text += page.extract_text() + "\n"

        if not pdf_text.strip():
            raise HTTPException(status_code=400, detail="No text extracted from PDF")

        print(f"Extracted {len(pdf_text)} characters from PDF")

        # Chunk text with semantic chunking
        print("Chunking text with semantic splitting...")
        chunks = chunk_text(pdf_text, chunk_size=1000, overlap=200, method="semantic")

        if not chunks:
            raise HTTPException(status_code=400, detail="No chunks created from text")

        print(f"Created {len(chunks)} semantic chunks")

        # Store chunks to database WITHOUT embeddings (status = 'pending')
        print("Storing chunks to database...")
        chunk_data = [
            (
                request.document_id,
                chunks[i]["content"],
                chunks[i]["chunk_index"],
                "pending",  # Initial status
            )
            for i in range(len(chunks))
        ]

        execute_values(
            cursor,
            """
            INSERT INTO chunks (document_id, content, chunk_index, status)
            VALUES %s
            """,
            chunk_data,
        )

        # Update document status to completed (chunking done)
        cursor.execute(
            """
            UPDATE documents 
            SET status = 'completed', updated_at = NOW() 
            WHERE id = %s
            """,
            (request.document_id,),
        )

        conn.commit()
        cursor.close()
        conn.close()

        print(f"Successfully chunked document {request.document_id}")
        print(f"Note: Run /embed endpoint to generate embeddings for these chunks")

        return IndexResponse(
            success=True,
            document_id=request.document_id,
            chunks_created=len(chunks),
            message=f"Successfully chunked document with {len(chunks)} chunks. Run /embed to generate embeddings.",
        )

    except Exception as e:
        print(f"Error indexing document: {e}")

        # Update document status to failed
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute(
                """
                UPDATE documents 
                SET status = 'failed', error_message = %s, updated_at = NOW() 
                WHERE id = %s
                """,
                (str(e), request.document_id),
            )
            conn.commit()
            cursor.close()
            conn.close()
        except Exception as db_error:
            print(f"Error updating document status: {db_error}")

        raise HTTPException(status_code=500, detail=str(e))


@app.post("/embed")
async def embed_pending_chunks(
    document_id: Optional[int] = None, batch_size: int = 50, max_retries: int = 3
):
    """
    Generate embeddings for chunks with status 'pending' or 'failed'

    Args:
        document_id: Optional - process only chunks from specific document
        batch_size: Number of chunks to process in one batch (default: 50)
        max_retries: Maximum retry count for failed chunks (default: 3)

    Returns:
        Status and statistics of embedding generation
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Get pending/failed chunks (with retry limit)
        if document_id:
            cursor.execute(
                """
                SELECT id, content, retry_count 
                FROM chunks 
                WHERE document_id = %s 
                  AND status IN ('pending', 'failed')
                  AND retry_count < %s
                ORDER BY id
                LIMIT %s
                """,
                (document_id, max_retries, batch_size),
            )
        else:
            cursor.execute(
                """
                SELECT id, content, retry_count 
                FROM chunks 
                WHERE status IN ('pending', 'failed')
                  AND retry_count < %s
                ORDER BY id
                LIMIT %s
                """,
                (max_retries, batch_size),
            )

        pending_chunks = cursor.fetchall()

        if not pending_chunks:
            cursor.close()
            conn.close()
            return {
                "success": True,
                "message": "No pending chunks to process",
                "processed": 0,
                "succeeded": 0,
                "failed": 0,
            }

        print(f"Processing {len(pending_chunks)} pending chunks...")

        succeeded = 0
        failed = 0
        failed_ids = []

        # Process each chunk
        for chunk_id, content, retry_count in pending_chunks:
            try:
                # Generate embedding
                embedding = embed_text(content, task_type="retrieval_document")

                # Update chunk with embedding
                cursor.execute(
                    """
                    UPDATE chunks 
                    SET embedding = %s::vector, 
                        status = 'embedded',
                        updated_at = NOW(),
                        error_message = NULL
                    WHERE id = %s
                    """,
                    (embedding, chunk_id),
                )
                succeeded += 1

            except Exception as e:
                error_msg = str(e)
                print(f"Error embedding chunk {chunk_id}: {error_msg}")

                # Update chunk as failed with retry count
                cursor.execute(
                    """
                    UPDATE chunks 
                    SET status = 'failed',
                        error_message = %s,
                        retry_count = retry_count + 1,
                        updated_at = NOW()
                    WHERE id = %s
                    """,
                    (error_msg, chunk_id),
                )
                failed += 1
                failed_ids.append(chunk_id)

        conn.commit()
        cursor.close()
        conn.close()

        print(f"Embedding complete: {succeeded} succeeded, {failed} failed")

        return {
            "success": True,
            "message": f"Processed {len(pending_chunks)} chunks",
            "processed": len(pending_chunks),
            "succeeded": succeeded,
            "failed": failed,
            "failed_chunk_ids": failed_ids if failed > 0 else [],
        }

    except Exception as e:
        print(f"Error in embed_pending_chunks: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/retry-failed")
async def retry_failed_chunks(document_id: Optional[int] = None):
    """
    Retry embedding for failed chunks (reset retry_count)

    Args:
        document_id: Optional - retry only chunks from specific document

    Returns:
        Number of chunks reset for retry
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        if document_id:
            cursor.execute(
                """
                UPDATE chunks 
                SET status = 'pending', 
                    retry_count = 0, 
                    error_message = NULL,
                    updated_at = NOW()
                WHERE document_id = %s AND status = 'failed'
                RETURNING id
                """,
                (document_id,),
            )
        else:
            cursor.execute(
                """
                UPDATE chunks 
                SET status = 'pending', 
                    retry_count = 0, 
                    error_message = NULL,
                    updated_at = NOW()
                WHERE status = 'failed'
                RETURNING id
                """
            )

        reset_chunks = cursor.fetchall()
        conn.commit()
        cursor.close()
        conn.close()

        return {
            "success": True,
            "message": f"Reset {len(reset_chunks)} failed chunks for retry",
            "reset_count": len(reset_chunks),
        }

    except Exception as e:
        print(f"Error in retry_failed_chunks: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/retrieve", response_model=RetrieveResponse)
async def retrieve_chunks(request: RetrieveRequest):
    """
    Perform semantic search to retrieve relevant chunks for a query

    Args:
        query: Search query text
        top_k: Number of top results to return (default: 5)
        document_id: Optional filter by specific document

    Returns:
        RetrieveResponse with list of similar chunks
    """
    try:
        # Generate embedding for query
        print(f"Generating embedding for query: {request.query}")
        query_embedding = embed_query(request.query)

        # Search database using match_chunks function
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute(
            """
            SELECT * FROM match_chunks(%s::vector, %s, %s)
            """,
            (query_embedding, request.top_k, request.document_id),
        )

        results = cursor.fetchall()
        cursor.close()
        conn.close()

        # Format results
        chunk_results = [
            ChunkResult(
                chunk_id=row[0],
                document_id=row[1],
                content=row[2],
                chunk_index=row[3],
                similarity=float(row[4]),
            )
            for row in results
        ]

        print(f"Found {len(chunk_results)} relevant chunks")

        return RetrieveResponse(
            success=True, query=request.query, results=chunk_results
        )

    except Exception as e:
        print(f"Error retrieving chunks: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/stats")
async def get_stats():
    """Get indexer statistics with chunk status breakdown"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Get document counts by status
        cursor.execute(
            """
            SELECT status, COUNT(*) 
            FROM documents 
            GROUP BY status
            """
        )
        doc_stats = dict(cursor.fetchall())

        # Get chunk counts by status
        cursor.execute(
            """
            SELECT status, COUNT(*) 
            FROM chunks 
            GROUP BY status
            """
        )
        chunk_stats = dict(cursor.fetchall())

        # Get total chunks
        cursor.execute("SELECT COUNT(*) FROM chunks")
        total_chunks = cursor.fetchone()[0]

        # Get chunks with embeddings
        cursor.execute("SELECT COUNT(*) FROM chunks WHERE embedding IS NOT NULL")
        chunks_with_embeddings = cursor.fetchone()[0]

        cursor.close()
        conn.close()

        return {
            "documents": doc_stats,
            "chunks": {
                "total": total_chunks,
                "with_embeddings": chunks_with_embeddings,
                "by_status": chunk_stats,
            },
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
