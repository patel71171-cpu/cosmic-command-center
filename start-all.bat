@echo off
echo Starting SENTINEL - Active Defense Edition...
echo.

echo [1/2] Starting Backend Server on port 8000...
start "SENTINEL Backend" cmd /c "%~dp0start-backend.bat"

echo [2/2] Waiting for backend to initialize...
timeout /t 5 /nobreak >nul

echo [3/2] Starting Frontend on port 3002...
start "SENTINEL Frontend" cmd /c "%~dp0start-frontend.bat"

echo.
echo SENTINEL is starting...
echo   Backend:  http://localhost:8000
echo   Frontend: http://localhost:3002
echo   API Docs: http://localhost:8000/docs
echo.
pause
