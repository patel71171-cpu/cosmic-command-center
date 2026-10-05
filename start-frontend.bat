@echo off
setlocal enableextensions
title SENTINEL Frontend

REM ============================================================
REM  SENTINEL frontend - Vite dev server on port 3002.
REM  The port is pinned in vite.config.ts (strictPort), so the
REM  --port flag here is belt-and-braces only.
REM ============================================================

cd /d "%~dp0"

if not exist "package.json" (
  echo [X] package.json not found. Run this from the repository root.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo [!] node_modules is missing - running "npm install" first...
  call npm install
  if errorlevel 1 (
    echo [X] npm install failed.
    pause
    exit /b 1
  )
)

echo Starting SENTINEL frontend on http://localhost:3002 ...
echo This can take 1-2 minutes on a cold start.
echo.

call npm run dev

echo.
echo [X] Frontend stopped.
pause
