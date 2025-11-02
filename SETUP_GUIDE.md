# TutorAI - Setup Guide

## Prerequisites

Pastikan Anda telah menginstall:

- Node.js 18+ ([Download](https://nodejs.org/))
- Python 3.11+ ([Download](https://www.python.org/downloads/))
- PostgreSQL 14+ ([Download](https://www.postgresql.org/download/))
- Git ([Download](https://git-scm.com/downloads))

## Step-by-Step Setup

### 1. Install PostgreSQL dan pgvector

#### Windows:

```powershell
# Install PostgreSQL dari installer
# Download pgvector dari GitHub releases
# https://github.com/pgvector/pgvector/releases

# Atau compile dari source (butuh Visual Studio):
git clone https://github.com/pgvector/pgvector.git
cd pgvector
# Follow Windows compilation instructions
```

#### Linux/Mac:

```bash
# Install PostgreSQL
sudo apt install postgresql postgresql-contrib  # Ubuntu/Debian
brew install postgresql  # macOS

# Install pgvector
git clone https://github.com/pgvector/pgvector.git
cd pgvector
make
sudo make install
```

### 2. Setup Database

```powershell
# Create database
createdb tutorai

# Run schema
psql tutorai -f database/schema.sql

# Verify
psql tutorai -c "SELECT * FROM profiles;"
```

### 3. Get Gemini API Key

1. Kunjungi https://makersuite.google.com/app/apikey
2. Login dengan Google Account
3. Click "Create API Key"
4. Copy API key yang dibuat

### 4. Setup Indexer Service (Python)

```powershell
cd indexer

# Create virtual environment
python -m venv venv

# Activate virtual environment
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac

# Install dependencies
pip install -r requirements.txt

# Create .env file
copy .env.example .env

# Edit .env dan isi:
# DATABASE_URL=postgresql://postgres:password@localhost:5432/tutorai
# GEMINI_API_KEY=your_gemini_api_key_here

# Test run
python chunker_embedder.py

# Start indexer service
uvicorn indexer_rag:app --reload --port 8000
```

### 5. Setup Backend API (Node.js)

```powershell
cd tutor-cerdas-api

# Install dependencies
npm install

# Create .env file
copy .env.example .env

# Edit .env dan isi:
# DATABASE_URL=postgresql://postgres:password@localhost:5432/tutorai
# GEMINI_API_KEY=your_gemini_api_key_here
# JWT_SECRET=your_random_secret_key_min_32_chars
# PORT=3000
# NODE_ENV=development
# INDEXER_URL=http://localhost:8000

# Generate JWT secret (optional):
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Start server
npm run dev
```

### 6. Setup Frontend (React)

```powershell
cd trial-web

# Install dependencies
npm install

# Create .env file
copy .env.example .env

# Edit .env dan isi:
# VITE_API_BASE_URL=http://localhost:3000/api

# Start development server
npm run dev
```

## Verifikasi Setup

### 1. Check Indexer

```powershell
# Open browser: http://localhost:8000
# Should show: {"service": "TutorAI Indexer", "status": "running"}

# Check health:
# http://localhost:8000/health
```

### 2. Check Backend API

```powershell
# Open browser: http://localhost:3000
# Should show API info

# Check health:
# http://localhost:3000/health
```

### 3. Check Frontend

```powershell
# Open browser: http://localhost:5173
# Should show TutorAI login page
```

## Test Flow

### 1. Register & Login

1. Open http://localhost:5173
2. Click "Register"
3. Fill form: Name, Email, Password
4. Login dengan credentials yang dibuat

### 2. Upload Document (Admin)

Default admin account:

- Email: admin@tutorai.com
- Password: admin123 (CHANGE THIS!)

1. Login sebagai admin
2. Go to Documents page
3. Upload PDF file
4. Wait for indexing to complete

### 3. Chat dengan AI

1. Login sebagai user
2. Type question in chat box
3. Wait for AI response
4. Check sources if available

## Troubleshooting

### Error: "Cannot connect to database"

```powershell
# Check PostgreSQL is running:
# Windows: Services -> PostgreSQL
# Linux/Mac: sudo systemctl status postgresql

# Check connection string in .env
# Format: postgresql://user:password@host:port/database
```

### Error: "Module not found"

```powershell
# Indexer:
cd indexer
pip install -r requirements.txt

# Backend:
cd tutor-cerdas-api
npm install

# Frontend:
cd trial-web
npm install
```

### Error: "GEMINI_API_KEY not found"

```powershell
# Make sure .env file exists and contains:
GEMINI_API_KEY=your_api_key_here

# Restart the service after adding key
```

### Error: "Port already in use"

```powershell
# Find and kill process using port:
# Windows:
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Linux/Mac:
lsof -ti:8000 | xargs kill -9
```

### Error: "pgvector extension not found"

```sql
-- Connect to database:
psql tutorai

-- Check extensions:
SELECT * FROM pg_available_extensions WHERE name = 'vector';

-- If not available, reinstall pgvector
```

## Development Tips

### Hot Reload

All services support hot reload:

- Indexer: uvicorn --reload
- Backend: nodemon
- Frontend: Vite HMR

### Debugging

#### Backend:

```javascript
// Add console.log in any file
console.log("Debug:", variable);
```

#### Indexer:

```python
# Add print statements
print(f'Debug: {variable}')
```

#### Frontend:

```javascript
// Use browser console
console.log("Debug:", variable);
```

### Database Inspection

```powershell
# Connect to database
psql tutorai

# Useful queries:
SELECT COUNT(*) FROM profiles;
SELECT COUNT(*) FROM documents;
SELECT COUNT(*) FROM chunks;
SELECT COUNT(*) FROM chat_history;
```

## Production Deployment

Lihat `DEPLOYMENT.md` untuk deployment ke production (Coming soon)

## Need Help?

- Check project documentation in README.md
- Check PROJECT_ROADMAP_UPDATED.md for technical details
- Review API endpoints in backend routes
- Check logs in terminal windows

## Congratulations!

Setup selesai! Anda sekarang bisa:

- Register dan login user
- Upload PDF documents (admin)
- Chat dengan AI menggunakan RAG
- View chat history
- Admin dashboard

Happy coding!
