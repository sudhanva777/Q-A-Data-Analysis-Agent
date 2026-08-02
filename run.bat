@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

set "BACKEND_HOST=0.0.0.0"
set "BACKEND_PORT=8000"
set "FRONTEND_HOST=0.0.0.0"
set "FRONTEND_PORT=5174"

python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python was not found on your system PATH.
    goto :fail
)

if not exist "venv\" (
    echo [INFO] Creating virtual environment in venv\...
    python -m venv venv
    if errorlevel 1 goto :fail
)

call venv\Scripts\activate.bat
if errorlevel 1 goto :fail

python -m pip install -q -r requirements.txt
if errorlevel 1 goto :fail

if not exist ".env" (
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo [INFO] Created .env from .env.example.
    )
)

where npm >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm was not found on your system PATH.
    goto :fail
)

cd frontend
if not exist "node_modules\" (
    echo [INFO] Installing frontend dependencies...
    npm install
    if errorlevel 1 goto :fail
)
cd ..

echo.
echo ============================================================
echo           CSV / Data Q&A Agent Launcher
echo ============================================================
echo.
echo Select application mode:
echo   [1] Launch FastAPI backend only
echo   [2] Launch React frontend only
echo   [3] Launch both backend and frontend
echo   [4] Launch CLI REPL only
echo   [5] Exit
echo.
choice /c 12345 /n /m "Press 1, 2, 3, 4, or 5: "

if errorlevel 5 goto :done
if errorlevel 4 goto :launch_cli
if errorlevel 3 goto :launch_both
if errorlevel 2 goto :launch_frontend
if errorlevel 1 goto :launch_backend

goto :fail

:launch_backend
echo.
echo [INFO] Starting FastAPI backend on http://%BACKEND_HOST%:%BACKEND_PORT%
echo.
uvicorn api:app --host %BACKEND_HOST% --port %BACKEND_PORT%
goto :done

:launch_cli
echo.
echo [INFO] Launching CLI REPL only
echo.
python main.py --file data/sales_data.csv
goto :done

:launch_frontend
echo.
echo [INFO] Starting React frontend on http://%FRONTEND_HOST%:%FRONTEND_PORT%
echo.
cd frontend
npm run dev -- --host %FRONTEND_HOST% --port %FRONTEND_PORT%
goto :done

:launch_both
start "Backend" cmd /k "cd /d %~dp0 && call venv\Scripts\activate.bat && uvicorn api:app --host %BACKEND_HOST% --port %BACKEND_PORT%"
start "Frontend" cmd /k "cd /d %~dp0\frontend && npm run dev -- --host %FRONTEND_HOST% --port %FRONTEND_PORT%"
echo [INFO] Backend and frontend started in separate terminals.
echo [INFO] Open http://%FRONTEND_HOST%:%FRONTEND_PORT% for the React UI.
goto :done

:fail
echo.
echo [LAUNCHER ERROR] Process stopped due to error(s) listed above.
:done
echo.
pause
endlocal
