@echo off
setlocal enabledelayedexpansion

echo ========================================================
echo  Newtonite Operations Platform - Automated Setup Script
echo ========================================================

cd /d "%~dp0"

echo [1/4] Checking Python environment...
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Python was not found in PATH. Please install Python 3.11+.
    exit /b 1
)

if not exist ".venv" (
    echo [INFO] Creating Python virtual environment in .venv...
    python -m venv .venv
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to create virtual environment.
        exit /b 1
    )
) else (
    echo [INFO] Existing .venv directory found.
)

echo [2/4] Installing backend dependencies...
call .\.venv\Scripts\activate.bat
python -m pip install --upgrade pip
pip install -r backend\requirements.txt
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install Python dependencies.
    exit /b 1
)

echo [3/4] Initializing and seeding local database...
set PYTHONPATH=%cd%\backend
python -m app.db.seed
if %errorlevel% neq 0 (
    echo [ERROR] Failed to seed database.
    exit /b 1
)

echo [4/4] Installing frontend dependencies...
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js / npm was not found in PATH. Please install Node.js 18+.
    exit /b 1
)

cd frontend
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Frontend npm install failed.
    exit /b 1
)
cd ..

echo.
echo ========================================================
echo  Setup Completed Successfully!
echo ========================================================
echo You can now start the application with:
echo   run.bat   (or .\run.ps1 in PowerShell)
echo Or use Docker Compose:
echo   docker compose up --build
echo.
pause
