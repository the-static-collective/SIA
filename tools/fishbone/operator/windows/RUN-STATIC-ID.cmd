@echo off
setlocal
cd /d "%~dp0\..\..\..\.."
node tools\fishbone\operator\cli.mjs run tools\fishbone\operator\plans\static-id.json --profile static-id
echo.
pause
