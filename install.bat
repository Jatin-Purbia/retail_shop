@echo off
echo Installing Retail Management System...
echo This may take a few minutes. Please wait...

:: Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Node.js is not installed. Please install Node.js first.
    echo Download from: https://nodejs.org/
    pause
    exit
)

:: Install backend dependencies
echo Installing backend dependencies...
cd backend
call npm install
if %errorlevel% neq 0 (
    echo Error installing backend dependencies
    pause
    exit
)

:: Install frontend dependencies
echo Installing frontend dependencies...
cd ../frontend
call npm install
if %errorlevel% neq 0 (
    echo Error installing frontend dependencies
    pause
    exit
)

:: Create database directory if it doesn't exist
cd ../backend
if not exist "data" mkdir data

echo Installation completed successfully!
echo You can now run the application using start_app.bat
pause 