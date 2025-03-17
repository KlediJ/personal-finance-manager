@echo off
REM Install cross-env if not already installed
call npm list -g cross-env >nul 2>&1 || call npm install -g cross-env

REM Kill any existing webpack or electron processes
taskkill /F /IM electron.exe >nul 2>&1
taskkill /F /IM node.exe >nul 2>&1

REM Start the application with webpack server first
call npm run start:webpack
