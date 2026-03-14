@echo off
echo 🐳 Starting KELALBINGO Admin System with Docker...
echo.

REM Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker Desktop is not running!
    echo Please start Docker Desktop and try again.
    pause
    exit /b 1
)

echo ✅ Docker is running
echo.

REM Build and start the container
echo 🔨 Building Docker image...
docker-compose build

if %errorlevel% neq 0 (
    echo ❌ Failed to build Docker image
    pause
    exit /b 1
)

echo ✅ Docker image built successfully
echo.

echo 🚀 Starting KELALBINGO Admin container...
docker-compose up -d

if %errorlevel% neq 0 (
    echo ❌ Failed to start container
    pause
    exit /b 1
)

echo.
echo 🎉 KELALBINGO Admin System is now running!
echo.
echo 📊 Admin Panel: http://localhost:3000
echo 👤 Username: kelalbingo_admin
echo 🔑 Password: KelalBingo@Admin2026!
echo 📧 2FA Email: ebenezerandualem953@gmail.com
echo.
echo 🔧 Management Commands:
echo   - View logs: docker-compose logs -f
echo   - Stop system: docker-compose down
echo   - Restart: docker-compose restart
echo.
echo Press any key to open admin panel in browser...
pause >nul

start http://localhost:3000