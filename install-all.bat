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
call venv\Scripts\activate.bat

python -m pip install --upgrade pip
pip install -r requirements.txt

call venv\Scripts\deactivate.bat
echo OK: Python dependencies installed

cd ..\..

echo.
echo ===============================================
echo Setup Complete!
echo ===============================================
echo.
pause
