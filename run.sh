#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [ ! -d ".venv" ]; then
    echo "[ERROR] Virtual environment .venv not found. Please run ./setup.sh first."
    exit 1
fi

echo "========================================================"
echo " Starting Newtonite Operations Platform"
echo "========================================================"

source .venv/bin/activate
export PYTHONPATH="$SCRIPT_DIR/backend"

# Trap Ctrl+C to kill child jobs
trap 'kill $(jobs -p)' EXIT

echo "[INFO] Starting Backend API on http://localhost:8000..."
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &

echo "[INFO] Starting Frontend Dev Server on http://localhost:5173..."
cd frontend
npm run dev &

wait
