"""
Database migration script for TutorAI
Run this to add chunk status tracking
"""

import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print(" DATABASE_URL not found in .env file")
    exit(1)

print(" Starting database migration...")
print(f" Database: {DATABASE_URL.split('@')[1] if '@' in DATABASE_URL else 'local'}")

try:
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()

    print("\n Running migration SQL...")

    # Step 1: Make embedding nullable
    print("  1. Making embedding column nullable...")
    cursor.execute("ALTER TABLE chunks ALTER COLUMN embedding DROP NOT NULL")

    # Step 2: Add status column
    print("  2. Adding status column...")
    cursor.execute(
        """
        ALTER TABLE chunks 
        ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' 
        CHECK (status IN ('pending', 'embedded', 'failed'))
    """
    )

    # Step 3: Add error_message column
    print("  3. Adding error_message column...")
    cursor.execute("ALTER TABLE chunks ADD COLUMN IF NOT EXISTS error_message TEXT")

    # Step 4: Add retry_count column
    print("  4. Adding retry_count column...")
    cursor.execute(
        "ALTER TABLE chunks ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0"
    )

    # Step 5: Add updated_at column
    print("  5. Adding updated_at column...")
    cursor.execute(
        "ALTER TABLE chunks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()"
    )

    # Step 6: Update existing chunks
    print("  6. Updating existing chunks status...")
    cursor.execute("UPDATE chunks SET status = 'embedded' WHERE embedding IS NOT NULL")
    updated = cursor.rowcount
    print(f"      Updated {updated} existing chunks to 'embedded' status")

    # Step 7: Create indexes
    print("  7. Creating indexes...")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_chunks_status ON chunks(status)")
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_chunks_document_status ON chunks(document_id, status)"
    )

    # Commit changes
    conn.commit()

    # Get stats
    cursor.execute("SELECT COUNT(*), status FROM chunks GROUP BY status")
    stats = cursor.fetchall()

    cursor.close()
    conn.close()

    print("\n Migration completed successfully!")
    print("\n Current chunk status:")
    for count, status in stats:
        print(f"   - {status}: {count} chunks")

except Exception as e:
    print(f"\n Migration failed: {e}")
    exit(1)
