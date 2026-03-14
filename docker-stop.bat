@echo off
echo 🛑 Stopping KELALBINGO Admin System...
echo.

docker-compose down

if %errorlevel% equ 0 (
    echo ✅ KELALBINGO Admin System stopped successfully
) else (
    echo ❌ Failed to stop system
)

echo.
pause