#!/usr/bin/env bash
set -e

echo "========================================================"
echo " Newtonite Operations Platform - Setup Script"
echo "========================================================"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "[1/4] Checking Python environment..."
if ! command -v python3 &> /dev/null; then
    echo "[ERROR] python3 not found. Please install Python 3.11+."
    exit 1
fi

if [ ! -d ".venv" ]; then
    echo "[INFO] Creating virtual environment .venv..."
    python3 -m venv .venv
else
    echo "[INFO] Existing .venv found."
fi

echo "[2/4] Installing backend dependencies..."
source .venv/bin/activate
pip install --upgrade pip
pip install -r backend/requirements.txt

echo "[3/4] Initializing database and demo data..."
export PYTHONPATH="$SCRIPT_DIR/backend"
python3 -m app.db.seed

echo "[4/4] Installing frontend dependencies..."
if ! command -v npm &> /dev/null; then
    echo "[ERROR] npm not found. Please install Node.js 18+."
    exit 1
fi

cd frontend
npm install
cd "$SCRIPT_DIR"

echo "========================================================"
echo " Setup Completed Successfully!"
echo "========================================================"
echo "Start application with: ./run.sh"
echo "Or with Docker: docker compose up --build"
