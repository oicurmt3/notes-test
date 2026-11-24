@echo off
rem Start the local web app. Double-click this file.
rem Close the "server" window to stop it.
cd /d "%~dp0"

start "Web app server - close this window to stop" php -S 127.0.0.1:8000 -t .
timeout /t 2 /nobreak >nul
start "" http://127.0.0.1:8000
