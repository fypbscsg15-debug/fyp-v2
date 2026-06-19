# Run this script once to start both backend and frontend
# Usage: Right-click → Run with PowerShell

$root = $PSScriptRoot

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SPSS Pharmacy System - Starting Up   " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# --- Backend ---
Write-Host "`nStarting backend on http://localhost:8000 ..." -ForegroundColor Yellow
Start-Process -FilePath "cmd.exe" -ArgumentList "/k cd /d `"$root\backend`" && venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000" -WindowStyle Normal

Start-Sleep -Seconds 3

# --- Frontend ---
Write-Host "Starting frontend on http://localhost:8080 ..." -ForegroundColor Yellow
Start-Process -FilePath "cmd.exe" -ArgumentList "/k cd /d `"$root\frontend`" && npm run dev" -WindowStyle Normal

Write-Host "`nDone! Open http://localhost:8080 in your browser." -ForegroundColor Green
Write-Host "Login: PHARM-001 / 1234" -ForegroundColor Green
