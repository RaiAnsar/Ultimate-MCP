@echo off
REM Ultimate MCP Server Setup Script for Windows

echo =====================================
echo   Ultimate MCP Server Setup
echo =====================================
echo.

REM Check Node.js version
echo Checking Node.js version...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Node.js is not installed!
    echo Please install Node.js 20+ from https://nodejs.org
    exit /b 1
)

for /f "tokens=2 delims=v." %%a in ('node -v') do set NODE_VERSION=%%a
if %NODE_VERSION% lss 20 (
    echo Error: Node.js version 20+ is required
    exit /b 1
)
echo ✓ Node.js detected

REM Install dependencies
echo Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo Error: Failed to install dependencies
    exit /b 1
)

REM Build the server
echo Building the server...
call npm run build
if %errorlevel% neq 0 (
    echo Error: Failed to build server
    exit /b 1
)

REM Check for OpenRouter API key
echo.
if "%OPENROUTER_API_KEY%"=="" (
    echo OpenRouter API key not found in environment.
    set /p OPENROUTER_API_KEY=Please enter your OpenRouter API key: 
    echo.
)

REM Create .env file if it doesn't exist
if not exist .env (
    echo Creating .env file...
    (
        echo # OpenRouter API Key
        echo OPENROUTER_API_KEY=%OPENROUTER_API_KEY%
        echo.
        echo # Environment
        echo NODE_ENV=production
        echo.
        echo # Logging
        echo LOG_LEVEL=info
    ) > .env
    echo ✓ .env file created
) else (
    echo ✓ .env file already exists
)

REM Get current directory
set SCRIPT_DIR=%~dp0
set SCRIPT_DIR=%SCRIPT_DIR:~0,-1%

REM Check for Claude
echo.
echo Detecting Claude installation...

where claude >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ Claude Code detected
    echo.
    echo Adding Ultimate MCP Server to Claude Code...
    
    REM Remove old installation if any
    claude mcp remove ultimate >nul 2>&1
    
    REM Add with user scope
    claude mcp add ultimate node "%SCRIPT_DIR%\dist\index.js" -e OPENROUTER_API_KEY=%OPENROUTER_API_KEY% --scope user
    
    echo ✓ Added to Claude Code
) else (
    echo Claude Code not found.
    echo.
    echo For Claude Desktop, add this to your claude.json:
    echo.
    echo {
    echo   "mcpServers": {
    echo     "ultimate": {
    echo       "command": "node",
    echo       "args": ["%SCRIPT_DIR%\dist\index.js"],
    echo       "env": {
    echo         "OPENROUTER_API_KEY": "%OPENROUTER_API_KEY%",
    echo         "LOG_LEVEL": "info"
    echo       }
    echo     }
    echo   }
    echo }
    echo.
    echo Location: %%APPDATA%%\Claude\claude.json
)

REM Success message
echo.
echo =====================================
echo   Setup Complete! 🎉
echo =====================================
echo.
echo Features enabled:
echo   ✓ 100+ AI models via OpenRouter
echo   ✓ 7 orchestration strategies
echo   ✓ Advanced debugging tools
echo   ✓ Codebase analysis (NEW!)
echo   ✓ Thinking mode (NEW!)
echo.
echo Next steps:
echo 1. Restart Claude to load the Ultimate MCP Server
echo 2. Test with: /ask analyze_error "TypeError: Cannot read property 'x' of undefined"
echo 3. Try codebase analysis: /ask analyze_codebase
echo.
echo Built to be praised by kings and loved by ministers 👑
echo.
pause