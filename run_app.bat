@echo off
setlocal

echo ===========================================
echo      FlowML App - Automated Setup & Run
echo ===========================================

REM --- Backend Setup ---
echo.
echo [1/4] Setting up Backend...
cd backend

IF NOT EXIST "venv" (
    echo    - Creating Python virtual environment...
    python -m venv venv
) ELSE (
    echo    - Virtual environment exists.
)

echo    - Activating virtual environment...
call venv\Scripts\activate

echo    - Installing/Updating requirements...
pip install -r requirements.txt
if %ERRORLEVEL% NEQ 0 (
    echo    Error: Failed to install python dependencies.
    pause
    exit /b %ERRORLEVEL%
)

echo    - Starting Backend Server (New Window)...
start "FlowML Backend" cmd /k "cd /d %CD% && venv\Scripts\activate && python main.py"

REM --- Frontend Setup ---
echo.
echo [3/4] Setting up Frontend...
cd ..\frontend

IF NOT EXIST "node_modules" (
    echo    - Installing node modules (this may take a moment)...
    call npm install
) ELSE (
    echo    - Node modules exist. Skipping install (run 'npm install' manually if needed).
)

echo    - Starting Frontend Server (New Window)...
echo.
echo [4/4] Launching Application...
start "FlowML Frontend" cmd /k "cd /d %CD% && npm run dev"

echo.
echo ===========================================
echo      App is running! 🚀
echo      Backend: http://localhost:8000
echo      Frontend: http://localhost:5173
echo ===========================================
echo.
pause
