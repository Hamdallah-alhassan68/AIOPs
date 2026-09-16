@echo off
rem ===============================================================
rem  AIOps NOC Console - One-click launcher (Windows)
rem  Starts the FastAPI backend + the Vite UI in two windows.
rem  Uses `python -m uvicorn` so it works without uvicorn on PATH.
rem ===============================================================
title AIOps Launcher

echo [1/2] Starting AIOps API  (http://127.0.0.1:8000/docs)
start "AIOps API" cmd /k "cd /d %~dp0backened && python -m uvicorn app:app --reload --port 8000"

echo [2/2] Starting AIOps UI   (http://localhost:5173)
start "AIOps UI" cmd /k "cd /d %~dp0frontend && npm run dev -- --port 5173"

echo.
echo Both servers are starting...
echo   API - Swagger docs at http://127.0.0.1:8000/docs
echo   UI  - Console at http://localhost:5173
echo.
echo To stop: close each window.
echo If the API window reports 'Could not import module "app"',
echo run it manually:  cd backened && python -m uvicorn app:app --port 8000
timeout /t 3 >NUL