@echo off
echo Starting Backend on port 8000 (with in-process OCR)...
start "Backend" cmd /k "cd /d "%~dp0backend" && venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

timeout /t 3 /nobreak >nul

echo Starting Frontend on port 8080 (Electron)...
start "Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo Both servers starting in separate windows.
echo - Backend (with OCR): http://localhost:8000
echo - Frontend:           http://localhost:8080
echo.
pause
