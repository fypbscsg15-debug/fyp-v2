@echo off
echo ========================================
echo   SPSS - Restarting Project Servers     
echo ========================================

echo 1. Stopping existing backend...
taskkill /FI "WINDOWTITLE eq Backend*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Administrator: Backend*" /F >nul 2>&1

echo 2. Stopping existing frontend...
taskkill /FI "WINDOWTITLE eq Frontend*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Administrator: Frontend*" /F >nul 2>&1

echo 3. Cleaning up orphaned processes...
taskkill /IM node.exe /F >nul 2>&1

timeout /t 2 /nobreak >nul

echo 4. Restarting servers...
call "%~dp0start_servers.bat"
