/**
 * Client-side ZIP package generator for Yaesu FRG-8800 CAT Controller
 * Bundles the entire source code, build scripts, and offline launcher
 * so the user can download and run the app directly on their PC.
 */

import JSZip from 'jszip';

// Vite raw file glob imports
const rawSourceFiles = import.meta.glob(
  [
    '/src/**/*',
    '/package.json',
    '/vite.config.ts',
    '/tsconfig.json',
    '/index.html',
    '/public/icon.svg',
  ],
  { query: '?raw', import: 'default', eager: true }
) as Record<string, string>;

export async function downloadProjectZip(onProgress?: (percent: number) => void): Promise<void> {
  const zip = new JSZip();

  // Add all imported files
  for (const [filePath, content] of Object.entries(rawSourceFiles)) {
    // strip leading slash
    const cleanPath = filePath.replace(/^\/+/, '');
    zip.file(cleanPath, content);
  }

  // Add a handy README.md
  zip.file(
    'README.md',
    `# Yaesu FRG-8800 CAT Controller

This is the standalone CAT interface controller for the vintage Yaesu FRG-8800 communications receiver.

## Requirements
- Node.js 18+ (https://nodejs.org)
- Google Chrome, Microsoft Edge, or Brave (for Web Serial API support)
- USB to TTL Serial Adapter (FTDI FT232R, CP2102, or CH340)

## Quick Start
1. Open a terminal in this folder.
2. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`
3. Start the application:
   \`\`\`bash
   npm run dev
   \`\`\`
4. Open http://localhost:3000 in Chrome or Edge.

## Hardware Wiring (6-Pin DIN Rear CAT Jack)
- Pin 2 (SERIAL IN) -> Connect to USB-to-TTL adapter TXD
- Pin 3 (GND) -> Connect to USB-to-TTL adapter GND
- Set adapter to 5V (or 3.3V) TTL.
- Standard protocol: 4800 baud, 8 data bits, 2 stop bits, no parity (8N2).
`
  );

  // Add easy 1-click start scripts for Windows and Mac/Linux
  zip.file(
    'start-windows.bat',
    `@echo off
setlocal enabledelayedexpansion
title Yaesu FRG-8800 CAT Controller Launcher

echo ========================================================
echo       YAESU FRG-8800 CAT CONTROLLER LAUNCHER
echo ========================================================
echo.

:: 1. Check if npm is in the system PATH
where npm >nul 2>nul
if %errorlevel% equ 0 (
    goto :HAVE_NPM
)

:: 2. Check if Node.js is installed in standard Windows directories
if exist "C:\\Program Files\\nodejs\\npm.cmd" (
    set "PATH=%PATH%;C:\\Program Files\\nodejs"
    goto :HAVE_NPM
)
if exist "C:\\Program Files (x86)\\nodejs\\npm.cmd" (
    set "PATH=%PATH%;C:\\Program Files (x86)\\nodejs"
    goto :HAVE_NPM
)
if exist "%LOCALAPPDATA%\\Programs\\nodejs\\npm.cmd" (
    set "PATH=%PATH%;%LOCALAPPDATA%\\Programs\\nodejs"
    goto :HAVE_NPM
)

:: 3. Node.js is not found
echo [ERROR] Node.js is NOT installed on this computer!
echo.
echo The Yaesu FRG-8800 CAT Controller requires Node.js (and npm)
echo to run its local offline web server.
echo.
echo --------------------------------------------------------
echo How to fix this in 1 minute:
echo 1. Download the free Node.js installer (LTS Version)
echo    from: https://nodejs.org
echo 2. Run the downloaded installer (accept the default options).
echo 3. Once installed, double-click this "start-windows.bat" file again!
echo --------------------------------------------------------
echo.

set /p OPEN_BROWSER="Would you like to open https://nodejs.org in your browser now? (Y/N): "
if /i "!OPEN_BROWSER!"=="Y" (
    start https://nodejs.org
)

echo.
echo Press any key to exit...
pause >nul
exit /b 1

:HAVE_NPM
echo [OK] Node.js environment detected.
echo.
echo [1/2] Installing / verifying application packages...
call npm install
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Package installation failed. Please check your internet connection.
    pause
    exit /b 1
)

echo.
echo [2/2] Launching Yaesu FRG-8800 CAT Server on port 3000...
echo Opening browser to http://localhost:3000
start "" http://localhost:3000

call npm run dev
pause
`
  );

  zip.file(
    'start-mac-linux.sh',
    `#!/usr/bin/env bash
echo "========================================================"
echo "      YAESU FRG-8800 CAT CONTROLLER LAUNCHER"
echo "========================================================"
echo ""

if ! command -v npm &> /dev/null; then
    echo "[ERROR] Node.js (npm) is not installed!"
    echo "Please install Node.js 18+ from https://nodejs.org before running this script."
    exit 1
fi

echo "[1/2] Installing dependencies..."
npm install

echo "[2/2] Starting server at http://localhost:3000..."
npm run dev
`
  );

  // Generate ZIP blob
  const blob = await zip.generateAsync(
    {
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    },
    (metadata) => {
      if (onProgress) {
        onProgress(Math.round(metadata.percent));
      }
    }
  );

  // Trigger browser download
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'yaesu-frg8800-cat-controller.zip';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
