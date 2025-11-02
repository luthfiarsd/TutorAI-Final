"""
Chunker and Embedder module for TutorAI
Handles semantic text chunking and Gemini API embedding generation
"""

import re
from typing import List, Dict, Any
import google.generativeai as genai
import os
from dotenv import load_dotenv
from langchain_text_splitters import (
    RecursiveCharacterTextSplitter,
    NLTKTextSplitter,
)
import nltk

load_dotenv()

# Configure Gemini API
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY not found in environment variables")

genai.configure(api_key=GEMINI_API_KEY)

# Download NLTK data for semantic chunking (if not already downloaded)
try:
    nltk.data.find("tokenizers/punkt")
except LookupError:
    nltk.download("punkt", quiet=True)
    nltk.download("punkt_tab", quiet=True)


def clean_text(text: str) -> str:
    """
    Clean and preprocess text before chunking

    Args:
        text: Raw text from PDF

    Returns:
        Cleaned text
    """
    # Remove excessive whitespace
    text = re.sub(r"\s+", " ", text)

    # Remove special characters but keep punctuation
    text = re.sub(r"[^\w\s.,!?;:()\-\'\"]+", "", text)

    # Remove page numbers (common pattern: Page X, p. X, etc.)
    text = re.sub(r"\b[Pp]age\s+\d+\b", "", text)
    text = re.sub(r"\bp\.\s*\d+\b", "", text)

    # Trim whitespace
    text = text.strip()

    return text


def chunk_text(
    text: str, chunk_size: int = 1000, overlap: int = 200, method: str = "semantic"
) -> List[Dict[str, Any]]:
    """
    Split text into chunks using semantic-aware splitting

    Args:
        text: Input text to chunk
        chunk_size: Target size of each chunk in characters (default: 1000)
        overlap: Number of overlapping characters between chunks (default: 200)
        method: Chunking method - 'semantic' (NLTK sentence-based) or 'recursive' (fallback)

    Returns:
        List of dicts containing chunk info: {content, chunk_index, start_char, end_char}
    """
    # Clean text first
    text = clean_text(text)

    if not text:
        return []

    chunks = []
    chunk_index = 0

    try:
        if method == "semantic":
            # Use NLTK-based semantic chunking (respects sentence boundaries)
            text_splitter = NLTKTextSplitter(
                chunk_size=chunk_size,
                chunk_overlap=overlap,
            )
        else:
            # Fallback to recursive character splitting
            text_splitter = RecursiveCharacterTextSplitter(
                chunk_size=chunk_size,
                chunk_overlap=overlap,
                separators=["\n\n", "\n", ". ", "! ", "? ", "; ", ", ", " ", ""],
                length_function=len,
            )

        # Split text into chunks
        chunk_texts = text_splitter.split_text(text)

        # Build chunk metadata
        current_pos = 0
        for chunk_text in chunk_texts:
            chunk_text = chunk_text.strip()
            if not chunk_text:
                continue

            # Find position in original text
            start_char = text.find(chunk_text, current_pos)
            if start_char == -1:
                start_char = current_pos
            end_char = start_char + len(chunk_text)

            chunks.append(
                {
                    "content": chunk_text,
                    "chunk_index": chunk_index,
                    "start_char": start_char,
                    "end_char": end_char,
                }
            )
            chunk_index += 1
            current_pos = end_char

    except Exception as e:
        print(f"Error in semantic chunking: {e}")
        print("Falling back to simple chunking...")

        # Fallback to simple overlap chunking
        start = 0
        text_length = len(text)

        while start < text_length:
            end = start + chunk_size

            # Try to break at sentence boundary
            if end < text_length:
                sentence_ends = [".", "!", "?", "\n"]
                best_end = end

                for i in range(end, min(end + 100, text_length)):
                    if text[i] in sentence_ends:
                        best_end = i + 1
                        break

                end = best_end
            else:
                end = text_length

            chunk_content = text[start:end].strip()

            if chunk_content:
                chunks.append(
                    {
                        "content": chunk_content,
                        "chunk_index": chunk_index,
                        "start_char": start,
                        "end_char": end,
                    }
                )
                chunk_index += 1

            start = end - overlap if end < text_length else text_length

    return chunks


def embed_text(text: str, task_type: str = "retrieval_document") -> List[float]:
    """
    Generate embedding for a single text using Gemini API

    Args:
        text: Input text to embed
        task_type: Type of embedding task
                  - "retrieval_document" for document chunks
                  - "retrieval_query" for search queries

    Returns:
        768-dimensional embedding vector
    """
    try:
        result = genai.embed_content(
            model="models/gemini-embedding-001", 
            content=text, 
            task_type=task_type,
            output_dimensionality=768  # Force 768 dimensions to match database schema
        )
        return result["embedding"]
    except Exception as e:
        print(f"Error embedding text: {e}")
        raise


def embed_batches(
    texts: List[str], task_type: str = "retrieval_document", batch_size: int = 100
) -> List[List[float]]:
    """
    Generate embeddings for multiple texts in batches

    Args:
        texts: List of texts to embed
        task_type: Type of embedding task
        batch_size: Number of texts to process at once (Gemini limit: ~100)

    Returns:
        List of 768-dimensional embedding vectors
    """
    embeddings = []

    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]

        try:
            # Process batch
            for text in batch:
                embedding = embed_text(text, task_type)
                embeddings.append(embedding)

        except Exception as e:
            print(f"Error processing batch {i}-{i+batch_size}: {e}")
            raise

    return embeddings


def embed_query(query: str) -> List[float]:
    """
    Generate embedding for a search query

    Args:
        query: Search query text

    Returns:
        768-dimensional embedding vector
    """
    return embed_text(query, task_type="retrieval_query")


if __name__ == "__main__":
    # Test chunking
    sample_text = """
    Artificial Intelligence (AI) adalah cabang dari ilmu komputer yang berfokus pada 
    pembuatan mesin yang dapat berpikir dan belajar seperti manusia. AI telah berkembang 
    pesat dalam beberapa dekade terakhir. Machine Learning adalah subset dari AI yang 
    memungkinkan komputer untuk belajar dari data tanpa diprogram secara eksplisit.
    Deep Learning adalah subset dari Machine Learning yang menggunakan neural networks 
    dengan banyak lapisan untuk memproses data yang kompleks.
    """

    print("Testing Chunker...")
    chunks = chunk_text(sample_text, chunk_size=100, overlap=20)
    print(f"Generated {len(chunks)} chunks")
    for i, chunk in enumerate(chunks):
        print(f"\nChunk {i}:")
        print(f"Content: {chunk['content'][:100]}...")
        print(f"Range: {chunk['start_char']}-{chunk['end_char']}")

    # Test embedding
    print("\n\nTesting Embedder...")
    test_text = "Apa itu Artificial Intelligence?"
    embedding = embed_query(test_text)
    print(f"Generated embedding with dimension: {len(embedding)}")
    print(f"First 10 values: {embedding[:10]}")
