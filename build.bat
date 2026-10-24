@echo off
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Install the LTS version from https://nodejs.org then run this file again.
  pause
  exit /b 1
)
call npm install
if errorlevel 1 (
  echo npm install failed. Check your internet connection.
  pause
  exit /b 1
)
call npm run dist
echo.
echo Done. Your .exe files are in the dist folder.
explorer dist
pause
