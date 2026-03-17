@echo off
REM Launch Electron app for Darkroom
cd /d "%~dp0\frontend"
REM Use npx to run electron if not globally installed
npx electron .
pause
