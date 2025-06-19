@echo off
REM Olorin Service Startup Script for Windows
REM This batch file runs the Python startup script

setlocal

REM Get the directory where this batch file is located
set SCRIPT_DIR=%~dp0

REM Change to the script directory
cd /d "%SCRIPT_DIR%"

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo Error: Python not found. Please install Python 3.7 or later.
    echo Download from: https://www.python.org/downloads/
    pause
    exit /b 1
)

REM Run the Python startup script with all arguments
python start_olorin.py %*

REM If no arguments were provided and the script exits, pause to show any messages
if "%1"=="" pause

endlocal 