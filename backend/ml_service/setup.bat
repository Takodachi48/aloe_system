@echo off
echo 🌿 Setting up AloeShield ML Service...

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is not installed. Please install Python 3.6 or higher.
    pause
    exit /b 1
)

REM Check Python version
echo 🐍 Checking Python version...
python --version

REM Create virtual environment if it doesn't exist
if not exist "venv" (
    echo 📦 Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
echo 🔧 Activating virtual environment...
call venv\Scripts\activate.bat

REM Upgrade pip
echo ⬆️  Upgrading pip...
python -m pip install --upgrade pip

REM Install requirements
echo 📚 Installing requirements...
pip install -r requirements.txt

echo ✅ ML Service setup complete!
echo.
echo To start the ML service:
echo 1. Activate virtual environment: venv\Scripts\activate.bat
echo 2. Run: python app.py
echo.
echo Or use the integrated startup script from the backend directory.
pause
