@echo off
setlocal enableextensions
title SENTINEL Backend

REM ============================================================
REM  SENTINEL backend - FastAPI.
REM
REM  The port is read from dev-ports.mjs via Node, so there is a
REM  single source of truth shared with vite.config.ts.  8000 was
REM  avoided because it is frequently already taken.
REM
REM  The app falls back to SQLite when Postgres is unreachable,
REM  so no .env is required for local development.
REM ============================================================

cd /d "%~dp0"

REM --- Resolve the backend port from dev-ports.mjs ---------------
set "PORT="
for /f "usebackq delims=" %%A in (`node -e "import('./dev-ports.mjs').then(m=>process.stdout.write(String(m.BACKEND_PORT)))"`) do set "PORT=%%A"
if not defined PORT (
  echo [X] Could not read BACKEND_PORT from dev-ports.mjs
  echo     Check that Node.js is installed and dev-ports.mjs is intact.
  pause
  exit /b 1
)

cd /d "%~dp0backend"

if not exist "app\main.py" (
  echo [X] app\main.py not found. Run this from the repository root.
  pause
  exit /b 1
)

python -c "import uvicorn" >nul 2>nul
if errorlevel 1 (
  echo [X] uvicorn is not installed for this Python.
  echo     Fix:  python -m pip install -r requirements.txt
  pause
  exit /b 1
)

echo Starting SENTINEL backend on http://localhost:%PORT% ...
echo API docs: http://localhost:%PORT%/docs
echo.

python -m uvicorn app.main:app --host 0.0.0.0 --port %PORT% --reload

REM Only reached if uvicorn exits or fails to bind.
echo.
echo [X] Backend stopped. If this was "address already in use",
echo     another process already holds port %PORT%.
echo     Edit dev-ports.mjs to pick a different one.
pause
