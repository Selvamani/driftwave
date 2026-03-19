@echo off
echo  Driftwave - Windows Dev Mode
echo  ==============================
echo  Make sure your backend is running (make up on WSL2)
echo.
call npm run tauri:dev
pause
