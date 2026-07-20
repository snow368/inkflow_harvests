# InkFlow KB deploy script (PowerShell native)
# Run on your LOCAL machine where wrangler is authenticated (wrangler login done).
# The sandbox cannot reach Cloudflare (GFW), so this must run on your PC.
$ErrorActionPreference = "Stop"
$root = "F:/inkflow app/InkFlow_Project"

Write-Host "==> [1/3] Seed 541 KB entries into remote D1 (harvests-db)"
Set-Location "$root/inkflow_harvests"
npx wrangler d1 execute harvests-db --remote --file="data/knowledge-intake/seed-kb.sql"

Write-Host "==> [2/3] Deploy backend Worker (kb API + dev-only gate)"
Set-Location "$root/harvests-cloud-api"
npx wrangler deploy

Write-Host "==> [3/3] Build + deploy frontend Pages (KB tab, dev only)"
Set-Location "$root/inkflow_harvests"
npm run build
npx wrangler pages deploy dist --project-name=harvests

Write-Host "DONE. Log in as snow368@gmail.com to see the KB tab (hidden from public)."
