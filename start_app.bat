@echo off
echo Starting Retail Management System...
echo Please wait while the application starts...

:: Start backend server
start cmd /k "cd backend && npm run dev"

:: Wait for backend to start
timeout /t 5

:: Start frontend server
start cmd /k "npm run dev"

echo Application is starting...
echo Please wait for the browser to open automatically.
echo Do not close any command prompt windows.
echo To stop the application, close all command prompt windows.

pause 