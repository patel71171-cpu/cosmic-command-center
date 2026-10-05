@echo off
setlocal enableextensions
title SENTINEL - Starting

REM ============================================================
REM  SENTINEL - start both services and wait until they answer.
REM
REM  The backend port is read from dev-ports.mjs so it is defined
REM  in exactly one place (shared with vite.config.ts).
REM
REM  Notes for future edits:
REM   - Do not put literal parentheses inside an "if (" block.
REM     An unescaped ")" closes the block early.
REM   - Use the ping sleep helper below rather than "timeout", which
REM     fails with "Input redirection is not supported" when stdin
REM     is redirected.
REM ============================================================

set "ROOT=%~dp0"
cd /d "%ROOT%"
set "FRONTEND_PORT=3002"
set "BACKEND_TIMEOUT=60"
set "FRONTEND_TIMEOUT=180"

REM --- Resolve the backend port from dev-ports.mjs ---------------
set "BACKEND_PORT="
for /f "usebackq delims=" %%A in (`node -e "import('./dev-ports.mjs').then(m=>process.stdout.write(String(m.BACKEND_PORT)))"`) do set "BACKEND_PORT=%%A"
if not defined BACKEND_PORT (
  echo   [X] Could not read BACKEND_PORT from dev-ports.mjs
  goto :fail
)

set "BACKEND_URL=http://localhost:%BACKEND_PORT%/health"
set "FRONTEND_URL=http://localhost:%FRONTEND_PORT%/login"

echo.
echo   SENTINEL - Active Defense Edition
echo   =================================
echo.

REM --- Preflight: make sure the tools we need are actually here -------
where node >nul 2>nul
if errorlevel 1 (
  echo   [X] Node.js not found on PATH.
  echo       Install it from https://nodejs.org and try again.
  goto :fail
)

where python >nul 2>nul
if errorlevel 1 (
  echo   [X] Python not found on PATH.
  echo       Install Python 3 and try again.
  goto :fail
)

if not exist "%ROOT%node_modules" (
  echo   [!] node_modules is missing. Run "npm install" first.
  echo.
)

REM --- Reuse anything already listening instead of fighting it -------
set "BACKEND_ALREADY="
set "FRONTEND_ALREADY="

call :is_up "%BACKEND_URL%"
if not errorlevel 1 (
  echo   [=] Backend already running on port %BACKEND_PORT%.
  set "BACKEND_ALREADY=1"
)

call :is_up "%FRONTEND_URL%"
if not errorlevel 1 (
  echo   [=] Frontend already running on port %FRONTEND_PORT%.
  set "FRONTEND_ALREADY=1"
)

REM --- Backend --------------------------------------------------------
if not defined BACKEND_ALREADY (
  echo   [1/2] Starting backend on port %BACKEND_PORT%...
  start "SENTINEL Backend" cmd /c ""%ROOT%start-backend.bat""

  call :wait_for "%BACKEND_URL%" %BACKEND_TIMEOUT% "Backend"
  if errorlevel 1 goto :fail
  echo   [ok]  Backend is answering.
) else (
  echo   [ok]  Backend was already up.
)

REM --- Frontend -------------------------------------------------------
REM Vite can take well over a minute on a cold start, so poll rather than
REM sleeping a fixed few seconds and hoping.
if not defined FRONTEND_ALREADY (
  echo   [2/2] Starting frontend on port %FRONTEND_PORT%...
  echo         Vite can take 1-2 minutes on a cold start -- please wait.
  start "SENTINEL Frontend" cmd /c ""%ROOT%start-frontend.bat""

  call :wait_for "%FRONTEND_URL%" %FRONTEND_TIMEOUT% "Frontend"
  if errorlevel 1 goto :fail
  echo   [ok]  Frontend is answering.
) else (
  echo   [ok]  Frontend was already up.
)

echo.
echo   =================================
echo   SENTINEL is ready.
echo.
echo     Frontend : http://localhost:%FRONTEND_PORT%
echo     Backend  : http://localhost:%BACKEND_PORT%
echo     API Docs : http://localhost:%BACKEND_PORT%/docs
echo.
echo   Sign in with: admin@sentinel.local / admin123
echo   Sign-in is email and password only.
echo.
echo   To stop everything, run stop-all.bat
echo.
start "" "http://localhost:%FRONTEND_PORT%"
exit /b 0

REM ============================================================
REM  Helpers
REM ============================================================

:fail
echo.
echo   Startup did not complete. Check the "SENTINEL Backend"
echo   and "SENTINEL Frontend" windows for the actual error.
echo.
pause
exit /b 1

REM is_up <url>  -> errorlevel 0 when the URL answers
:is_up
powershell -NoProfile -Command "try { $r = Invoke-WebRequest -Uri '%~1' -UseBasicParsing -TimeoutSec 5; if ($r.StatusCode -lt 500) { exit 0 } } catch {}; exit 1" >nul 2>nul
exit /b %errorlevel%

REM wait_for <url> <seconds> <label>
:wait_for
setlocal
set "URL=%~1"
set "DEADLINE=%~2"
set "LABEL=%~3"
set /a ELAPSED=0
:wait_loop
call :is_up "%URL%"
if not errorlevel 1 (
  endlocal & exit /b 0
)
call :sleep 3
set /a ELAPSED+=3
if %ELAPSED% GEQ %DEADLINE% (
  echo   [X] %LABEL% did not come up within %DEADLINE%s.
  endlocal & exit /b 1
)
goto :wait_loop

REM sleep <seconds> - stdin-independent, unlike "timeout"
:sleep
setlocal
set /a TICKS=%~1+1
ping -n %TICKS% 127.0.0.1 >nul
endlocal
exit /b 0
