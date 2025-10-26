#!/bin/bash

echo ""
echo "==============================================="
echo "AloeShield - Starting All Services"
echo "==============================================="
echo ""

if [ ! -d "backend" ]; then
    echo "ERROR: backend directory not found"
    exit 1
fi

mkdir -p logs

cd "backend"

echo "Starting Node.js Backend Service..."
echo "Backend API: http://localhost:3000"
npm start &
BACKEND_PID=$!

cd ..

cd "backend/ml_service"

echo ""
echo "Starting Python ML Service..."
echo "ML Service: http://localhost:5000"

source venv/bin/activate
python app.py &
ML_PID=$!

deactivate

cd ../..

echo ""
echo "==============================================="
echo "Services Starting..."
echo "==============================================="
echo ""
echo "Backend API:  http://localhost:3000"
echo "ML Service:   http://localhost:5000"
echo ""
echo "Process IDs:"
echo "  Backend:   $BACKEND_PID"
echo "  ML Service: $ML_PID"
echo ""
echo "To stop services, run:"
echo "  kill $BACKEND_PID $ML_PID"
echo ""

wait
