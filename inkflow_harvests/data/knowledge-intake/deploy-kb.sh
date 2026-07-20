#!/usr/bin/env bash
# InkFlow KB deploy script
# Run on your LOCAL machine where wrangler is authenticated (wrangler login done).
# The sandbox cannot reach Cloudflare (GFW), so this must run on your PC.
set -e

ROOT="F:/inkflow app/InkFlow_Project"

echo "==> [1/3] Seed 541 KB entries into remote D1 (harvests-db)"
cd "$ROOT/inkflow_harvests"
npx wrangler d1 execute harvests-db --remote --file="data/knowledge-intake/seed-kb.sql"

echo "==> [2/3] Deploy backend Worker (kb API + dev-only gate)"
cd "$ROOT/harvests-cloud-api"
npx wrangler deploy

echo "==> [3/3] Build + deploy frontend Pages (KB tab, dev only)"
cd "$ROOT/inkflow_harvests"
npm run build
npx wrangler pages deploy dist --project-name=harvests

echo "DONE. Log in as snow368@gmail.com to see the KB tab (hidden from public)."
