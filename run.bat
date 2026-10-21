@echo off
setlocal enabledelayedexpansion

echo ========================================================
echo  Newtonite Operations Platform - Application Launcher
echo ========================================================

cd /d "%~dp0"

if not exist ".venv" (
    echo [ERROR] Virtual environment .venv not found. Please run setup.bat first.
    exit /b 1
)

echo [INFO] Starting Backend API on http://localhost:8000...
start "Newtonite Backend API" cmd /k "cd /d "%~dp0" && call .\.venv\Scripts\activate.bat && set PYTHONPATH=%cd%\backend && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

echo [INFO] Starting Frontend Dev Server on http://localhost:5173...
start "Newtonite Frontend UI" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo ========================================================
echo  Newtonite Platform is starting!
echo ========================================================
echo - Frontend UI:        http://localhost:5173
echo - Interactive Swagger: http://localhost:8000/api/v1/docs
echo - Health Check:       http://localhost:8000/api/v1/health
echo.
echo Default Demo Accounts:
echo - Administrator: admin@newtonite.internal (password: NewtoniteDemo2026!)
echo - Engineering:   manager.eng@newtonite.internal
echo - Operations:    manager.ops@newtonite.internal
echo.
echo Use the '1-Click Assessment Personas' buttons in the UI to switch roles instantly!
echo.
