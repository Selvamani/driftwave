@echo off
setlocal

echo.
echo  Driftwave - Windows Desktop Build
echo  ===================================
echo.

:: Check Node
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found. Download from https://nodejs.org
    pause & exit /b 1
)

:: Check Cargo
where cargo >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Rust/Cargo not found. Download from https://rustup.rs
    pause & exit /b 1
)

echo [OK] Node: & node --version
echo [OK] Cargo: & cargo --version
echo.

:: Install JS deps
echo [1/3] Installing npm dependencies...
call npm install
if %errorlevel% neq 0 ( echo [ERROR] npm install failed & pause & exit /b 1 )

:: Build
echo.
echo [2/3] Building Tauri app (first run takes 5-10 min)...
call npm run tauri:build
if %errorlevel% neq 0 ( echo [ERROR] Build failed & pause & exit /b 1 )

:: Show output
echo.
echo [3/3] Done!
echo.
echo  Installer location:
echo  src-tauri\target\release\bundle\nsis\
echo  src-tauri\target\release\bundle\msi\
echo.
explorer src-tauri\target\release\bundle
pause
