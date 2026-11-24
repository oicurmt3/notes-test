# Create a new web app from the starter template.
#
#   .\new-app.ps1 calc
#   cd calc
#   .\run.ps1                                  # http://127.0.0.1:8000
#   node deploy.mjs --apply --folder=calc      # creates /calc/ + its database
#
# The name becomes the folder under sandgroper.net and the database suffix,
# so keep it short, lowercase, and URL-friendly.

param(
    [Parameter(Mandatory = $true, Position = 0, ValueFromRemainingArguments = $true)]
    [string[]]$NameParts
)

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$Name = ($NameParts -join '-')

if ($Name -cnotmatch '^[a-z0-9][a-z0-9-]*$') {
    Write-Host "Name must be lowercase letters, digits and hyphens (e.g. 'calc', 'trip-planner')." -ForegroundColor Red
    exit 1
}

$target = Join-Path $root $Name
if (Test-Path $target) {
    Write-Host "A folder named '$Name' already exists. Pick another name." -ForegroundColor Red
    exit 1
}

$template = Join-Path $root "starter"
if (-not (Test-Path $template)) {
    Write-Host "The 'starter' template folder is missing." -ForegroundColor Red
    exit 1
}

Copy-Item -Recurse -Path $template -Destination $target
Remove-Item -Recurse -Force (Join-Path $target "data") -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force (Join-Path $target "node_modules") -ErrorAction SilentlyContinue

# A local .gitignore is harmless but the root one already covers it.
Remove-Item -Force (Join-Path $target ".gitignore") -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "  Created $Name" -ForegroundColor Green
Write-Host ""
Write-Host "  Build it:"
Write-Host "    cd $Name"
Write-Host "    .\run.cmd                                 # http://127.0.0.1:8000"
Write-Host ""
Write-Host "  Ship it:"
Write-Host "    node deploy.mjs --apply --folder=$Name"
Write-Host ""
Write-Host "  Live at: https://sandgroper.net/$Name/"
Write-Host ""
Write-Host "  The database name will be perthrel_$($Name -replace '[^a-z0-9]', '')"
Write-Host ""
