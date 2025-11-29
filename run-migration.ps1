# PowerShell Migration Script for Chat Context Feature
# Run this with: .\run-migration.ps1

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  TutorAI - Chat Context Migration  " -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Check if psql is available
try {
    $psqlVersion = psql --version 2>&1
    Write-Host " PostgreSQL client found: $psqlVersion" -ForegroundColor Green
} catch {
    Write-Host " PostgreSQL client (psql) not found!" -ForegroundColor Red
    Write-Host "  Please install PostgreSQL or add it to PATH" -ForegroundColor Yellow
    exit 1
}

# Database connection details - EDIT THESE
$DB_HOST = "localhost"
$DB_PORT = "5432"
$DB_NAME = "tutorai"
$DB_USER = "postgres"

Write-Host "Database Configuration:" -ForegroundColor Cyan
Write-Host "  Host: $DB_HOST"
Write-Host "  Port: $DB_PORT"
Write-Host "  Database: $DB_NAME"
Write-Host "  User: $DB_USER"
Write-Host ""

# Ask for password securely
$DB_PASSWORD = Read-Host "Enter PostgreSQL password" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($DB_PASSWORD)
$PlainPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

# Set environment variable for psql
$env:PGPASSWORD = $PlainPassword

Write-Host ""
Write-Host "Running migration..." -ForegroundColor Yellow
Write-Host ""

# Run migration
$migrationFile = "database\migration_add_sessions.sql"

if (Test-Path $migrationFile) {
    try {
        psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f $migrationFile
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host " Migration completed successfully!" -ForegroundColor Green
            Write-Host ""
            Write-Host "Next steps:" -ForegroundColor Cyan
            Write-Host "  1. Restart your backend server (npm run dev)" -ForegroundColor White
            Write-Host "  2. Test the new chat context feature" -ForegroundColor White
            Write-Host "  3. Check documentation for usage guide" -ForegroundColor White
        } else {
            Write-Host ""
            Write-Host " Migration failed with exit code: $LASTEXITCODE" -ForegroundColor Red
            Write-Host "  Check error messages above" -ForegroundColor Yellow
        }
    } catch {
        Write-Host ""
        Write-Host " Migration error: $_" -ForegroundColor Red
    }
} else {
    Write-Host " Migration file not found: $migrationFile" -ForegroundColor Red
    Write-Host "  Make sure you're running this from the project root" -ForegroundColor Yellow
}

# Clear password from environment
$env:PGPASSWORD = ""

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
