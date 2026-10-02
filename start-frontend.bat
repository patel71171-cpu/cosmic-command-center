@echo off
echo Starting SENTINEL Frontend...
cd /d "%~dp0"
npm run dev -- --port 3002
