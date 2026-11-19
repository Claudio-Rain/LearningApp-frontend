@echo off
rem Build and deploy the web app to Firebase Hosting.
rem Usage: .\deploy   (from PowerShell or cmd, in this folder)
setlocal
cd /d "%~dp0"

rem firebase-tools is a local devDependency, so always go through npx.
call npx firebase login:list | findstr /C:"Logged in as" >nul
if errorlevel 1 (
  echo Not logged in to Firebase, opening the browser to sign in...
  call npx firebase login || goto :failed
)

call npm run firebase:deploy || goto :failed

echo.
echo Deploy finished.
goto :end

:failed
echo.
echo Deploy FAILED - see the output above.
set "code=1"

:end
exit /b %code%
