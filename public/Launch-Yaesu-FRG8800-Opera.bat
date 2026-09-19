@echo off
title Yaesu FRG-8800 CAT Controller (Opera App Mode)
echo ===================================================================
echo     YAESU FRG-8800 CAT RECEIVER CONTROLLER - OPERA APP LAUNCHER
echo ===================================================================
echo.

set "APP_URL=https://ais-dev-b2oecxsurjcbdg4a3p5o6p-584336260046.asia-southeast1.run.app"

:: 1. Check user's Local AppData Opera (standard modern Opera One installation)
if exist "%LOCALAPPDATA%\Programs\Opera\launcher.exe" (
    echo Launching Opera One in Standalone App Window...
    start "" "%LOCALAPPDATA%\Programs\Opera\launcher.exe" --app="%APP_URL%"
    exit /b 0
)

:: 2. Check user's Local AppData Opera GX
if exist "%LOCALAPPDATA%\Programs\Opera GX\launcher.exe" (
    echo Launching Opera GX in Standalone App Window...
    start "" "%LOCALAPPDATA%\Programs\Opera GX\launcher.exe" --app="%APP_URL%"
    exit /b 0
)

:: 3. Check 64-bit Program Files Opera
if exist "%ProgramFiles%\Opera\launcher.exe" (
    echo Launching Opera in Standalone App Window...
    start "" "%ProgramFiles%\Opera\launcher.exe" --app="%APP_URL%"
    exit /b 0
)

:: 4. Check 32-bit Program Files Opera
if exist "%ProgramFiles(x86)%\Opera\launcher.exe" (
    echo Launching Opera in Standalone App Window...
    start "" "%ProgramFiles(x86)%\Opera\launcher.exe" --app="%APP_URL%"
    exit /b 0
)

:: 5. Check system PATH 'opera'
where opera >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo Launching Opera from PATH in Standalone App Window...
    start "" opera --app="%APP_URL%"
    exit /b 0
)

:: 6. Fallback: Open in default browser
echo Launching in default browser...
start "" "%APP_URL%"
exit /b 0
