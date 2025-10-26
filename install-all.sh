#!/bin/bash

echo ""
echo "==============================================="
echo "AloeShield - Complete System Setup"
echo "==============================================="
echo ""

set -e

echo "Installing Node.js Dependencies..."
cd backend
npm install
echo "OK: Node.js dependencies installed"
cd ..

echo ""
echo "Setting up Python ML Service..."
echo ""

cd backend/ml_service

if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

echo "Activating virtual environment and installing packages..."
source venv/bin/activate

pip install --upgrade pip
pip install -r requirements.txt

deactivate
echo "OK: Python dependencies installed"

cd ../..

echo ""
echo "==============================================="
echo "Setup Complete!"
echo "==============================================="
echo ""
