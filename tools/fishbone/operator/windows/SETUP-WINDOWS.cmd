@echo off
setlocal
cd /d "%~dp0\..\..\..\.."
echo.
echo FISHBONE 003 - FREE LOCAL BROWSER SETUP
echo -----------------------------------------
where node >nul 2>&1
if errorlevel 1 (
  echo Node.js 22 or newer is required.
  echo Download Node.js from https://nodejs.org/
  pause
  exit /b 1
)
node -e "process.exit(Number(process.versions.node.split('.')[0])>=22?0:1)"
if errorlevel 1 (
  echo Update to Node.js 22 or newer from https://nodejs.org/
  pause
  exit /b 1
)
echo This will install Playwright and its Chromium browser locally.
echo No TinyFish account, token, or subscription is needed.
choice /m "Continue with local installation"
if errorlevel 2 exit /b 0
call npm install --no-save playwright
if errorlevel 1 (
  echo Playwright setup failed.
  pause
  exit /b 1
)
call npx playwright install chromium
if errorlevel 1 (
  echo Chromium setup failed.
  pause
  exit /b 1
)
call npm test
echo.
echo Setup completed. Double-click OPEN-STATIC-ID.cmd next.
pause
