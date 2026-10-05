@echo off
setlocal enableextensions
title SENTINEL - Stopping

REM ============================================================
REM  SENTINEL - stop the backend and frontend dev servers.
REM
REM  The backend port is read from dev-ports.mjs.
REM
REM  Matching purely by "which pid owns the port" is unreliable
REM  here: uvicorn --reload spawns a child worker that inherits
REM  the listening socket, so netstat can report a pid that is
REM  already dead while the live worker keeps serving.  This
REM  therefore matches on the uvicorn / reload-worker / vite
REM  command lines, then frees the ports as a second pass.
REM
REM  The matcher deliberately excludes this script's own shell.
REM  A previous version matched the word "sentinel" and killed
REM  the PowerShell running the cleanup before it could report.
REM ============================================================

set "ROOT=%~dp0"
cd /d "%ROOT%"
set "FRONTEND_PORT=3002"

set "BACKEND_PORT="
for /f "usebackq delims=" %%A in (`node -e "import('./dev-ports.mjs').then(m=>process.stdout.write(String(m.BACKEND_PORT)))"`) do set "BACKEND_PORT=%%A"
if not defined BACKEND_PORT set "BACKEND_PORT=8010"

echo.
echo   Stopping SENTINEL services...
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$self = $PID;" ^
  "$me = (Get-CimInstance Win32_Process -Filter ('ProcessId=' + $self) -ErrorAction SilentlyContinue).ParentProcessId;" ^
  "$targets = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object {" ^
  "  $_.ProcessId -ne $self -and $_.ProcessId -ne $me -and" ^
  "  $_.Name -in @('python.exe','pythonw.exe','node.exe','cmd.exe') -and" ^
  "  $_.CommandLine -and" ^
  "  $_.CommandLine -notmatch 'stop-all' -and" ^
  "  (" ^
  "    $_.CommandLine -match 'uvicorn' -or" ^
  "    $_.CommandLine -match 'multiprocessing\.spawn' -or" ^
  "    $_.CommandLine -match 'vite'" ^
  "  )" ^
  "};" ^
  "$killed = 0;" ^
  "foreach ($t in $targets) {" ^
  "  $cl = $t.CommandLine -replace '\s+',' ';" ^
  "  Write-Host ('  stopping pid ' + $t.ProcessId + '  ' + $cl.Substring(0, [Math]::Min(58, $cl.Length)));" ^
  "  & taskkill /F /T /PID $t.ProcessId 2>$null | Out-Null;" ^
  "  $killed++;" ^
  "}" ^
  "Start-Sleep -Seconds 2;" ^
  "foreach ($port in @(%BACKEND_PORT%, %FRONTEND_PORT%)) {" ^
  "  $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue;" ^
  "  foreach ($c in $conns) {" ^
  "    if ($c.OwningProcess -ne $self) {" ^
  "      Write-Host ('  freeing port ' + $port + ' held by pid ' + $c.OwningProcess);" ^
  "      & taskkill /F /T /PID $c.OwningProcess 2>$null | Out-Null;" ^
  "    }" ^
  "  }" ^
  "}" ^
  "Start-Sleep -Seconds 2;" ^
  "$left = @();" ^
  "foreach ($port in @(%BACKEND_PORT%, %FRONTEND_PORT%)) {" ^
  "  if (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) { $left += $port }" ^
  "}" ^
  "Write-Host '';" ^
  "if ($left.Count) { Write-Host ('  [!] still listening on: ' + ($left -join ', ')) }" ^
  "else { Write-Host ('  Done. Stopped ' + $killed + ' process(es); ports %BACKEND_PORT% and %FRONTEND_PORT% are free.') }"

echo.
exit /b 0
