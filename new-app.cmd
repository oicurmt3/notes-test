@echo off
rem Create a new web app from the starter template.
rem   new-app.cmd calc
rem Runs new-app.ps1 with the execution policy bypassed for this call only,
rem because script execution is disabled on this machine.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0new-app.ps1" %*
