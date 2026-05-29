@echo off
cd /d "%~dp0"
where npm >nul 2>nul
if errorlevel 1 (
  echo npm was not found. Please install Node.js LTS from https://nodejs.org/ and then run this file again.
  pause
  exit /b 1
)
if not exist node_modules (
  echo Installing dependencies...
  npm install
)
echo Starting SmartCovering ERP...
npm run dev
pause
