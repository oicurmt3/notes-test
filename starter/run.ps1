# Start the web app
#
# Right-click this file -> "Run with PowerShell", or run:
#   .\run.ps1
#
# Then your browser opens http://127.0.0.1:8000
# Press Ctrl+C in the window to stop the server.

$root = $PSScriptRoot
Set-Location $root

# Open the browser a moment after the server starts.
Start-Job -ScriptBlock {
    Start-Sleep -Milliseconds 1200
    Start-Process 'http://127.0.0.1:8000'
} | Out-Null

Write-Host ""
Write-Host "  Serving your web app at http://127.0.0.1:8000" -ForegroundColor Cyan
Write-Host "  Press Ctrl+C to stop." -ForegroundColor DarkGray
Write-Host ""

php -S 127.0.0.1:8000 -t .
