[CmdletBinding()]
param(
  [string]$InputDir = "..\transfer-data",
  [switch]$SkipComposeUp,
  [switch]$SkipTokenRefresh
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

function Copy-DirectoryContents {
  param(
    [Parameter(Mandatory = $true)]
    [string]$SourceDir,
    [Parameter(Mandatory = $true)]
    [string]$DestinationDir
  )

  if (-not (Test-Path $DestinationDir)) {
    New-Item -ItemType Directory -Path $DestinationDir -Force | Out-Null
  }

  $items = Get-ChildItem -Path $SourceDir -Force
  foreach ($item in $items) {
    Copy-Item -Path $item.FullName -Destination $DestinationDir -Recurse -Force
  }
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Split-Path -Parent $ScriptDir
$FrontendDir = Join-Path (Split-Path -Parent $BackendDir) "frontend"
$InputPath = Join-Path $BackendDir $InputDir
$DumpPath = Join-Path $InputPath "elearning.dump"
$UploadsZipPath = Join-Path $InputPath "uploads.zip"
$UploadsDir = Join-Path $BackendDir "uploads"

if (-not (Test-Path $DumpPath)) {
  throw "Missing dump file: $DumpPath"
}
if (-not (Test-Path $UploadsZipPath)) {
  throw "Missing uploads zip: $UploadsZipPath"
}

Push-Location $BackendDir
try {
  if (-not $SkipComposeUp) {
    Write-Step "Starting services (database, directus)"
    Invoke-Compose @("up", "-d", "database", "directus")
  }

  Write-Step "Copying dump into database container"
  Invoke-Compose @("cp", $DumpPath, "database:/tmp/elearning.dump")

  Write-Step "Terminating active connections to elearning DB"
  Invoke-Compose @(
    "exec",
    "-T",
    "database",
    "psql",
    "-U",
    "directus",
    "-d",
    "postgres",
    "-c",
    "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'elearning' AND pid <> pg_backend_pid();"
  )

  Write-Step "Recreating database"
  Invoke-Compose @("exec", "-T", "database", "dropdb", "-U", "directus", "--if-exists", "elearning")
  Invoke-Compose @("exec", "-T", "database", "createdb", "-U", "directus", "elearning")

  Write-Step "Restoring database from dump"
  Invoke-Compose @(
    "exec",
    "-T",
    "database",
    "pg_restore",
    "-U",
    "directus",
    "-d",
    "elearning",
    "--clean",
    "--if-exists",
    "/tmp/elearning.dump"
  )

  Write-Step "Restoring uploads folder"
  if (-not (Test-Path $UploadsDir)) {
    New-Item -ItemType Directory -Path $UploadsDir -Force | Out-Null
  }
  Get-ChildItem -Path $UploadsDir -Force -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force

  $ExtractDir = Join-Path $env:TEMP ("elearning-import-" + [Guid]::NewGuid().ToString())
  New-Item -ItemType Directory -Path $ExtractDir -Force | Out-Null

  try {
    Expand-Archive -Path $UploadsZipPath -DestinationPath $ExtractDir -Force
    $NestedUploads = Join-Path $ExtractDir "uploads"
    if (Test-Path $NestedUploads) {
      Copy-DirectoryContents -SourceDir $NestedUploads -DestinationDir $UploadsDir
    }
    else {
      Copy-DirectoryContents -SourceDir $ExtractDir -DestinationDir $UploadsDir
    }
  }
  finally {
    if (Test-Path $ExtractDir) {
      Remove-Item -Path $ExtractDir -Recurse -Force
    }
  }

  Write-Step "Restarting Directus"
  Invoke-Compose @("restart", "directus")

  if (-not $SkipTokenRefresh) {
    Write-Step "Refreshing DIRECTUS_STATIC_TOKEN in frontend/.env.local"
    & node "scripts/bootstrap.mjs" "--write-static-token-file"
    if ($LASTEXITCODE -ne 0) {
      throw "node scripts/bootstrap.mjs --write-static-token-file failed."
    }
  }

  Write-Host ""
  Write-Host "Import completed."
  Write-Host "Frontend env path: $(Join-Path $FrontendDir '.env.local')"
  if ($SkipTokenRefresh) {
    Write-Host "Token refresh skipped. Update frontend/.env.local manually if needed."
  }
  else {
    Write-Host "DIRECTUS_STATIC_TOKEN was refreshed."
  }
}
finally {
  Pop-Location
}
