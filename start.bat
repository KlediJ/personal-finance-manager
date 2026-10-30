@echo off
cd /d "%~dp0"
REM Use the project's supported launcher; leave other applications running.
call npm start
exit /b %errorlevel%
