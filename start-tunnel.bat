@echo off
setlocal enableextensions enabledelayedexpansion
title SENTINEL - Public Tunnel (Cloudflare Quick Tunnel)

REM ============================================================
REM  Exposes the locally running frontend on a public URL.
REM
REM  Cloudflare "quick tunnels" need no account and no login. They
REM  print a random https://<words>.trycloudflare.com address.
REM
REM  IMPORTANT
REM   - This forwards ONLY the frontend (port 3002). The backend,
REM     Postgres and Redis stay private; the browser reaches the API
REM     through server.mjs, which proxies /api over the compose network.
REM   - The URL is public to anyone who has it, and it changes every
REM     time this script runs (unless you set up a named tunnel).
REM   - It only works while this window is open and this PC is on.
REM   - The admin password has been changed from the default admin123. Keep it
REM     that way before sharing the link with anyone.
REM
REM  Requires the stack to be up:  docker compose up -d
REM ============================================================

set "FRONTEND_PORT=3002"

REM Prefer a PATH install; otherwise fall back to the direct download.
where cloudflared >nul 2>nul
if errorlevel 1 (
  set "CF=%LOCALAPPDATA%\cloudflared\cloudflared.exe"
  if not exist "!CF!" (
    echo [X] cloudflared not found.
    echo.
    echo     Either install it:  winget install --id Cloudflare.cloudflared
    echo     Or download cloudflared-windows-amd64.exe from
    echo       https://github.com/cloudflare/cloudflared/releases
    echo     and save it as:
    echo       %LOCALAPPDATA%\cloudflared\cloudflared.exe
    echo.
    pause
    exit /b 1
  )
) else (
  set "CF=cloudflared"
)

echo.
echo   Checking that the frontend is up on port %FRONTEND_PORT% ...
powershell -NoProfile -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:%FRONTEND_PORT%/healthz' -UseBasicParsing -TimeoutSec 6; if ($r.StatusCode -lt 500) { exit 0 } } catch {}; exit 1" >nul 2>nul
if errorlevel 1 (
  echo   [X] Nothing is answering on port %FRONTEND_PORT%.
  echo       Start the stack first:  docker compose up -d
  echo.
  pause
  exit /b 1
)
echo   [ok] Frontend is answering.
echo.
echo   ==========================================================
echo    Starting the tunnel. Watch for the https:// URL below.
echo    Press Ctrl+C to close it.
echo   ==========================================================
echo.

REM --protocol http2 is deliberate. The default QUIC transport runs over UDP,
REM which was repeatedly dropped on this network with "datagram manager
REM error: timeout: no recent network activity", leaving the public URL
REM intermittently unreachable. HTTP/2 over TCP survives that.
"%CF%" tunnel --url http://localhost:%FRONTEND_PORT% --protocol http2 --no-autoupdate

echo.
echo   Tunnel closed.
pause
