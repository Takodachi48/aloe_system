@echo off
setlocal enabledelayedexpansion

echo.
echo ===============================================
echo AloeShield - Starting All Services
echo ===============================================
echo.

if not exist "backend" (
    echo ERROR: backend directory not found
    pause
    exit /b 1
)

mkdir logs 2>nul

echo Starting Node.js Backend Service...
echo Backend API: http://localhost:3000
cd backend
start "AloeShield Backend" cmd /k "npm start"
timeout /t 3 /nobreak
cd ..

echo.
echo Starting Python ML Service...
echo ML Service: http://localhost:5000
cd backend\ml_service
start "AloeShield ML Service" cmd /k "venv\Scripts\activate.bat && python app.py"
cd ..\..

echo.
echo ===============================================
echo Services Starting...
echo ===============================================
echo.
echo Backend API:  http://localhost:3000
echo ML Service:   http://localhost:5000
echo.
echo To stop services, close the respective command windows.
echo.
