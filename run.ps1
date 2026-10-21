# Newtonite Operations Platform - PowerShell Application Launcher
$ErrorActionPreference = "Stop"

$WorkspaceRoot = $PSScriptRoot
Set-Location $WorkspaceRoot

if (-not (Test-Path ".venv")) {
    Write-Error "Virtual environment .venv not found. Please run .\setup.ps1 first."
}

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host " Starting Newtonite Operations Platform" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

# Start Backend API in background process
Write-Host "[INFO] Starting Backend API on http://localhost:8000..." -ForegroundColor Yellow
$backendJob = Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$env:PYTHONPATH='$WorkspaceRoot\backend'; Set-Location '$WorkspaceRoot'; .\.venv\Scripts\uvicorn.exe app.main:app --host 0.0.0.0 --port 8000 --reload" -PassThru

# Start Frontend Dev Server in background process
Write-Host "[INFO] Starting Frontend Dev Server on http://localhost:5173..." -ForegroundColor Yellow
$frontendJob = Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$WorkspaceRoot\frontend'; npm run dev" -PassThru

Write-Host "`nPlatform running successfully!" -ForegroundColor Green
Write-Host "- Frontend UI:         http://localhost:5173" -ForegroundColor Cyan
Write-Host "- Swagger Docs:        http://localhost:8000/api/v1/docs" -ForegroundColor Cyan
Write-Host "- Health Endpoint:     http://localhost:8000/api/v1/health" -ForegroundColor Cyan
Write-Host "`nPre-seeded test accounts: password 'NewtoniteDemo2026!'" -ForegroundColor Gray
Write-Host "- admin@newtonite.internal (Global Administrator)" -ForegroundColor Gray
Write-Host "- manager.eng@newtonite.internal (Core Engineering Manager)" -ForegroundColor Gray
Write-Host "- manager.ops@newtonite.internal (Customer Support Manager)" -ForegroundColor Gray
