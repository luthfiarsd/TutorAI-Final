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
import google.generativeai as genai 

# OCR Dependencies
import pypdf
import pytesseract
from pdf2image import convert_from_path
from PIL import Image

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
    use_vision: bool = False


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

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

    
# Configure Tesseract path for Windows (adjust if needed)
pytesseract.pytesseract.tesseract_cmd = r'tesseract/tesseract.exe'

# OCR Code
def extract_text_with_ocr(file_path: str, dpi: int = 300) -> str:
    """
    Extract text from PDF using OCR (for scanned/image-based PDFs)
    
    Args:
        file_path: Path to PDF file
        dpi: Resolution for image conversion (higher = better quality, slower)
    
    Returns:
        OCR-extracted text
    """
    try:
        print(f"Converting PDF to images for OCR (DPI: {dpi})...")
        
        images = convert_from_path(file_path, dpi=dpi)
        
        ocr_text = ""
        for i, image in enumerate(images):
            print(f"Processing page {i+1}/{len(images)} with OCR...")
            page_text = pytesseract.image_to_string(image, lang='eng+ind')
            ocr_text += page_text + "\n"
        
        print(f"OCR extraction complete: {len(ocr_text)} characters")
        return ocr_text
        
    except Exception as e:
        print(f"Error in OCR extraction: {e}")
        return ""


def extract_image_descriptions_from_pdf(file_path: str, dpi: int = 150) -> List[str]:
    """
    Extract image descriptions from PDF using Gemini 1.5 Flash (cheapest model)
    
    Args:
        file_path: Path to PDF file
        dpi: Resolution for image conversion (150 is sufficient for vision)
    
    Returns:
        List of image descriptions
    """
    try:
        print(f"Converting PDF to images for vision analysis...")
        
        images = convert_from_path(file_path, dpi=dpi)
        
        # Use Gemini 1.5 Flash (cheapest model with vision)
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        descriptions = []
        
        for i, image in enumerate(images):
            print(f"Analyzing page {i+1}/{len(images)} for visual content...")
            
            try:
                response = model.generate_content([
                    "Describe all images, diagrams, charts, graphs, and visual elements in this page. "
                    "If no significant visual elements, respond 'No images'. Be concise.",
                    image
                ])
                
                description = response.text.strip()
                
                if description and description.lower() != "no images":
                    descriptions.append(f"[Page {i+1} Visual]: {description}")
                    print(f"  ✓ Found: {description[:60]}...")
                    
            except Exception as e:
                print(f"  ⚠ Error on page {i+1}: {e}")
                continue
        
        return descriptions
        
    except Exception as e:
        print(f"❌ Vision extraction error: {e}")
        return []


def extract_text_from_pdf(file_path: str, use_ocr: bool = True, use_vision: bool = False) -> str:
    """
    Extract text from PDF with optional OCR and image description
    
    Args:
        file_path: Path to PDF file
        use_ocr: Use OCR if normal extraction yields little text
        use_vision: Use Gemini Vision to describe images/diagrams
    
    Returns:
        Extracted text with optional image descriptions
    """
    pdf_text = ""
    
    # Try normal text extraction first
    try:
        with open(file_path, "rb") as pdf_file:
            pdf_reader = pypdf.PdfReader(pdf_file)
            for page in pdf_reader.pages:
                pdf_text += page.extract_text() + "\n"
    except Exception as e:
        print(f"Error in normal PDF extraction: {e}")
    
    # If extracted text is too short, use OCR
    if use_ocr and len(pdf_text.strip()) < 100:
        print("Text extraction yielded little content, switching to OCR...")
        pdf_text = extract_text_with_ocr(file_path)
    
    # Optionally add image descriptions
    if use_vision:
        print("🖼️ Extracting image descriptions using Gemini Vision...")
        image_descriptions = extract_image_descriptions_from_pdf(file_path)
        
        if image_descriptions:
            pdf_text += "\n\n=== Visual Content Descriptions ===\n"
            pdf_text += "\n\n".join(image_descriptions)
            print(f"✓ Added {len(image_descriptions)} image descriptions")
    
    return pdf_text

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

        # Check if file exists
        if not os.path.exists(request.file_path):
            raise HTTPException(
                status_code=404, detail=f"File not found: {request.file_path}"
            )

        # Extract text from PDF WITH OCR and optional Vision (ONLY ONCE)
        print(f"Extracting text from PDF: {request.file_path}")
        pdf_text = extract_text_from_pdf(
            request.file_path, 
            use_ocr=True,
            use_vision=request.use_vision  # ← Single extraction call
        )

        if not pdf_text.strip():
            raise HTTPException(status_code=400, detail="No text extracted from PDF (tried OCR)")

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

@app.get("/chunks/{chunk_id}")
async def get_chunk_details(chunk_id: int):
    """
    Get detailed information about a specific chunk including its embedding
    
    Args:
        chunk_id: ID of the chunk to retrieve
    
    Returns:
        Chunk details with embedding vector
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute(
            """
            SELECT 
                id, 
                document_id, 
                content, 
                chunk_index, 
                status,
                embedding,
                retry_count,
                error_message,
                created_at,
                updated_at
            FROM chunks 
            WHERE id = %s
            """,
            (chunk_id,)
        )
        
        result = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if not result:
            raise HTTPException(status_code=404, detail=f"Chunk {chunk_id} not found")
        
        # Parse embedding (PostgreSQL vector to Python list)
        embedding_vector = None
        if result[5]:  # If embedding exists
            # Convert pgvector to list
            embedding_str = result[5].strip('[]')
            embedding_vector = [float(x) for x in embedding_str.split(',')]
        
        chunk_data = {
            "id": result[0],
            "document_id": result[1],
            "content": result[2],
            "chunk_index": result[3],
            "status": result[4],
            "embedding": {
                "exists": result[5] is not None,
                "dimension": len(embedding_vector) if embedding_vector else 0,
                "values": embedding_vector,  # Full embedding vector
                "first_10_values": embedding_vector[:10] if embedding_vector else None,
                "last_10_values": embedding_vector[-10:] if embedding_vector else None,
            },
            "retry_count": result[6],
            "error_message": result[7],
            "created_at": result[8].isoformat() if result[8] else None,
            "updated_at": result[9].isoformat() if result[9] else None
        }
        
        return chunk_data
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error retrieving chunk: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/chunks/{chunk_id}/embedding")
async def get_chunk_embedding_only(chunk_id: int):
    """
    Get ONLY the embedding vector for a chunk (for inspection)
    
    Args:
        chunk_id: ID of the chunk
    
    Returns:
        Raw embedding vector as array of floats
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute(
            "SELECT embedding FROM chunks WHERE id = %s",
            (chunk_id,)
        )
        
        result = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if not result:
            raise HTTPException(status_code=404, detail=f"Chunk {chunk_id} not found")
        
        if not result[0]:
            return {
                "chunk_id": chunk_id,
                "embedding": None,
                "message": "No embedding generated yet"
            }
        
        # Convert pgvector to list
        embedding_str = result[0].strip('[]')
        embedding_vector = [float(x) for x in embedding_str.split(',')]
        
        return {
            "chunk_id": chunk_id,
            "embedding": embedding_vector,
            "dimension": len(embedding_vector),
            "sample_values": {
                "first_5": embedding_vector[:5],
                "middle_5": embedding_vector[len(embedding_vector)//2:len(embedding_vector)//2+5],
                "last_5": embedding_vector[-5:]
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error retrieving embedding: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/compare-embeddings")
async def compare_embeddings(chunk_id1: int, chunk_id2: int):
    """
    Compare embeddings of two chunks to see their similarity
    
    Args:
        chunk_id1: First chunk ID
        chunk_id2: Second chunk ID
    
    Returns:
        Comparison of two embeddings with cosine similarity
    """
    try:
        import numpy as np
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get both embeddings
        cursor.execute(
            "SELECT id, content, embedding FROM chunks WHERE id IN (%s, %s)",
            (chunk_id1, chunk_id2)
        )
        
        results = cursor.fetchall()
        cursor.close()
        conn.close()
        
        if len(results) != 2:
            raise HTTPException(status_code=404, detail="One or both chunks not found")
        
        # Parse embeddings
        chunks_data = []
        for row in results:
            if not row[2]:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Chunk {row[0]} has no embedding"
                )
            
            embedding_str = row[2].strip('[]')
            embedding = [float(x) for x in embedding_str.split(',')]
            chunks_data.append({
                "id": row[0],
                "content": row[1][:100] + "..." if len(row[1]) > 100 else row[1],
                "embedding": embedding
            })
        
        # Calculate cosine similarity
        vec1 = np.array(chunks_data[0]["embedding"])
        vec2 = np.array(chunks_data[1]["embedding"])
        
        cosine_sim = np.dot(vec1, vec2) / (np.linalg.norm(vec1) * np.linalg.norm(vec2))
        
        # Calculate euclidean distance
        euclidean_dist = np.linalg.norm(vec1 - vec2)
        
        return {
            "chunk_1": {
                "id": chunks_data[0]["id"],
                "content_preview": chunks_data[0]["content"],
                "embedding_dimension": len(chunks_data[0]["embedding"])
            },
            "chunk_2": {
                "id": chunks_data[1]["id"],
                "content_preview": chunks_data[1]["content"],
                "embedding_dimension": len(chunks_data[1]["embedding"])
            },
            "similarity_metrics": {
                "cosine_similarity": float(cosine_sim),
                "euclidean_distance": float(euclidean_dist),
                "interpretation": "Higher cosine similarity (closer to 1) = more similar content"
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error comparing embeddings: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
