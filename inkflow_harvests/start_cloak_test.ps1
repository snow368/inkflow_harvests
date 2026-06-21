$ProjectDir = "F:\inkflow app\InkFlow_Project\inkflow_harvests"

cd $ProjectDir

$env:BOT_ID = "bot_wa_01"
$env:BOT_PROFILE_DIR = "./data/bot_profiles/bot_wa_01_cloak"
$env:BOT_PROXY_SERVER = "socks5://127.0.0.1:11081"
$env:BOT_EXEC_MODE = "browse_like"
$env:BOT_SPEED_FACTOR = "2.8"
$env:BOT_VARIANCE = "0.45"
$env:BOT_BROWSE_ORDER = "random"
$env:BOT_POLL_LIMIT = "1"
$env:BOT_COMMENT_ENABLED = "true"
$env:BOT_HEADLESS = "false"

Write-Host "[CloakBrowser Test] Starting..." -ForegroundColor Cyan
Write-Host "  Browser: CloakBrowser (stealth Chromium, 49 C++ patches, humanize=on)" -ForegroundColor Cyan
Write-Host "  Profile: $env:BOT_PROFILE_DIR" -ForegroundColor Cyan
Write-Host "  Proxy: $env:BOT_PROXY_SERVER" -ForegroundColor Cyan
Write-Host ""
Write-Host "=== Open browser and log into Instagram manually ===" -ForegroundColor Yellow
Write-Host "=== After login, the bot will auto-process tasks ===" -ForegroundColor Yellow
Write-Host ""

npm run bot:cloak:test
