$ErrorActionPreference = 'Stop'

# Ensure script runs from the frontend folder where this file lives
Set-Location -Path (Split-Path -Path $MyInvocation.MyCommand.Definition -Parent)

# Make dev server URL explicit so Electron skips probing
$env:DEV_SERVER_URL = 'http://127.0.0.1:5173/'

Write-Output "Starting Vite + Electron dev (DEV_SERVER_URL=$env:DEV_SERVER_URL)..."

# Run Vite and then start Electron once the dev server is reachable.
npx concurrently "npm run dev -- --host 127.0.0.1" "npx wait-on http://127.0.0.1:5173 && npx electron . --dev"