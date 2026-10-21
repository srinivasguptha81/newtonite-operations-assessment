# Newtonite Operations Platform - Automated PowerShell Setup
$ErrorActionPreference = "Stop"

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host " Newtonite Operations Platform - Automated Setup Script" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

$WorkspaceRoot = $PSScriptRoot
Set-Location $WorkspaceRoot

Write-Host "`n[1/4] Checking Python environment..." -ForegroundColor Yellow
if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Error "Python was not found in PATH. Please install Python 3.11+."
}

if (-not (Test-Path ".venv")) {
    Write-Host "[INFO] Creating Python virtual environment in .venv..." -ForegroundColor Gray
    python -m venv .venv
} else {
    Write-Host "[INFO] Existing .venv directory found." -ForegroundColor Gray
}

Write-Host "`n[2/4] Installing backend dependencies..." -ForegroundColor Yellow
& ".\.venv\Scripts\python.exe" -m pip install --upgrade pip
& ".\.venv\Scripts\pip.exe" install -r "backend\requirements.txt"

Write-Host "`n[3/4] Initializing and seeding local database..." -ForegroundColor Yellow
$env:PYTHONPATH = "$WorkspaceRoot\backend"
& ".\.venv\Scripts\python.exe" -m app.db.seed

Write-Host "`n[4/4] Installing frontend dependencies..." -ForegroundColor Yellow
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Error "Node.js / npm was not found in PATH. Please install Node.js 18+."
}

Set-Location "$WorkspaceRoot\frontend"
npm install
Set-Location $WorkspaceRoot

Write-Host "`n========================================================" -ForegroundColor Green
Write-Host " Setup Completed Successfully!" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
Write-Host "Launch application using: .\run.ps1 (or run.bat)" -ForegroundColor Cyan
Write-Host "Or run automated tests:   .\.venv\Scripts\pytest.exe" -ForegroundColor Cyan
