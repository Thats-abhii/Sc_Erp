@echo off
cd /d "%~dp0"
set PYTHON_EXE=C:\Users\abhishek.pareek\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe
if not exist "%PYTHON_EXE%" (
  echo Python runtime was not found. Opening the HTML file directly instead.
  start "" "%~dp0smart-covering-management-login.html"
  pause
  exit /b 0
)
start "SmartCovering ERP Server" /min "%PYTHON_EXE%" -m http.server 8088 --bind 127.0.0.1
timeout /t 2 >nul
start "" "http://127.0.0.1:8088/smart-covering-management-login.html"
