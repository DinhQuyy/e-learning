[CmdletBinding()]
param(
  [string]$OutputDir = "..\transfer-data",
  [switch]$SkipComposeUp
)

$ErrorActionPreference = "Stop"

function Invoke-Compose {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$Args
  )

  & docker compose @Args
  if ($LASTEXITCODE -ne 0) {
    throw "docker compose $($Args -join ' ') failed."
  }
}

function Write-Step {
  param([string]$Message)
  Write-Host "==> $Message"
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Split-Path -Parent $ScriptDir
$OutputPath = Join-Path $BackendDir $OutputDir

New-Item -ItemType Directory -Path $OutputPath -Force | Out-Null
$OutputPath = (Resolve-Path $OutputPath).Path

$DumpPath = Join-Path $OutputPath "elearning.dump"
$UploadsZipPath = Join-Path $OutputPath "uploads.zip"
$UploadsDir = Join-Path $BackendDir "uploads"

if (-not (Test-Path $UploadsDir)) {
  throw "Missing uploads directory: $UploadsDir"
}

Push-Location $BackendDir
try {
  if (-not $SkipComposeUp) {
    Write-Step "Starting services (database, directus)"
    Invoke-Compose @("up", "-d", "database", "directus")
  }

  Write-Step "Creating database dump in container"
  Invoke-Compose @(
    "exec",
    "-T",
    "database",
    "pg_dump",
    "-U",
    "directus",
    "-d",
    "elearning",
    "-Fc",
    "-f",
    "/tmp/elearning.dump"
  )

  Write-Step "Copying dump to host: $DumpPath"
  Invoke-Compose @("cp", "database:/tmp/elearning.dump", $DumpPath)

  Write-Step "Packing uploads to zip: $UploadsZipPath"
  if (Test-Path $UploadsZipPath) {
    Remove-Item -Path $UploadsZipPath -Force
  }
  Compress-Archive -Path $UploadsDir -DestinationPath $UploadsZipPath -Force

  Write-Host ""
  Write-Host "Export completed."
  Write-Host "Dump file: $DumpPath"
  Write-Host "Uploads zip: $UploadsZipPath"
  Write-Host "Send both files to your teammate."
}
finally {
  Pop-Location
}
