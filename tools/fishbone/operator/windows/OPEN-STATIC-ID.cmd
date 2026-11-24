@echo off
setlocal
cd /d "%~dp0\..\..\..\.."
node tools\fishbone\operator\cli.mjs open --site static-id --profile static-id
echo.
pause
