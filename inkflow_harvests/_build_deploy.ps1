$projectDir = "F:\inkflow app\InkFlow_Project\inkflow_harvests"
$logFile = Join-Path $projectDir "_deploy_report.txt"
$output = @()

$output += "=== PowerShell Build/Deploy Script ==="
$output += "Started at: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
$output += ""

# Step 1: Build
$output += "=== STEP 1: vite build ==="
$output += ""

try {
    $buildOut = & "node" @("$projectDir\node_modules\vite\bin\vite.js", "build") 2>&1
    $output += $buildOut
    $output += ""
    $output += "=== BUILD SUCCEEDED ==="
    $output += ""
}
catch {
    $output += "BUILD FAILED: $_"
    $output += ""
    $output += "=== BUILD FAILED - skipping deploy ==="
    $output | Out-File -FilePath $logFile -Encoding utf8
    exit 1
}

# Step 2: Deploy with wrangler
$output += "=== STEP 2: wrangler pages deploy ==="
$output += ""

try {
    $deployOut = & "npx.cmd" @("wrangler", "pages", "deploy", "dist", "--project-name=harvests", "--branch=main") 2>&1
    $output += $deployOut
    $output += ""
    $output += "=== DEPLOY SUCCEEDED ==="
}
catch {
    $output += "DEPLOY FAILED: $_"
    $output += ""
    $output += "=== DEPLOY FAILED ==="
}

$output += "Finished at: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
$output | Out-File -FilePath $logFile -Encoding utf8

Write-Output $output
