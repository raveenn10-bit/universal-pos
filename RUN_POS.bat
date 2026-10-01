@echo off
title Harsh Apex Universal POS
echo ======================================================================
echo           HARSH APEX UNIVERSAL POS - SYSTEM LAUNCHER
echo ======================================================================
echo.
echo Starting Application...
echo.

cd /d "%~dp0"
npx electron .

if %errorlevel% neq 0 (
  echo.
  echo [ERROR] Application encountered an issue.
  echo Starting standalone executable...
  start "" "%~dp0dist\installer\win-unpacked\Harsh Apex Universal POS.exe"
)

pause
