@echo off
setlocal enabledelayedexpansion

echo.
echo ===============================================
echo AloeShield - Complete System Setup
echo ===============================================
echo.

echo Installing Node.js Dependencies...
cd backend
call npm install
if errorlevel 1 (
    echo ERROR: Failed to install Node.js dependencies
    pause
    exit /b 1
)
echo OK: Node.js dependencies installed
cd ..

echo.
echo Setting up Python ML Service...
echo.

cd backend\ml_service

if not exist "venv" (
    echo Creating Python virtual environment...
    python -m venv venv
)

echo Activating virtual environment and installing packages...

venv\Scripts\python -m pip install --upgrade pip
venv\Scripts\pip install -r requirements.txt

echo OK: Python dependencies installed

cd ..\..

echo.
echo ===============================================
echo Setup Complete!
echo ===============================================
echo.
pause
