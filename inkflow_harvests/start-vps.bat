@echo off
title InkFlow VPS Startup
echo ========================================
echo  InkFlow Harvests VPS 一键启动
echo ========================================
echo.
echo 本脚本会打开 4 个窗口，请按顺序操作
echo 如果某步报错，按提示修复后重试
echo.
pause

:: ======== 配置路径 ========
set REPO_DIR=C:\harvests\inkflow_harvests
set ENGINE_DIR=C:\harvests\harvests-engine

:: ======== 先确认路径 ========
if not exist "%REPO_DIR%\server.ts" (
    echo ❌ 找不到 %REPO_DIR%\server.ts
    echo 请确认 inkflow_harvests 已克隆到 C:\harvests\inkflow_harvests
    pause
    exit /b 1
)

:: ======== 窗口 1: Server (端口 3000) ========
echo.
echo [1/4] 启动 Server (http://localhost:3000)
start "Harvests Server" cmd /c "cd /d %REPO_DIR% && set DISABLE_HMR=true && npx tsx server.ts"
echo   ✅ 窗口已打开，等待 "Server running at http://localhost:3000"
echo.

:: ======== 窗口 2: Chrome CDP ========
echo [2/4] 启动 Chrome CDP (端口 9222)
start "Chrome CDP" cmd /c "echo 等待 server 就绪... && timeout /t 5 /nobreak >nul && "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="C:\harvests\profiles\bot_ig_01" --no-first-run"
echo   ✅ 窗口已打开，等待 Chrome 启动后出现 "DevTools listening on ws://..."
echo.

:: ======== 窗口 3: Scheduler (每5分钟建任务) ========
echo [3/4] 启动 Scheduler (从 Neon 拉纹身店 → 创建任务)
if exist "%ENGINE_DIR%\scripts\ig-scheduler-lite.ts" (
    start "IG Scheduler" cmd /c "cd /d %ENGINE_DIR% && echo 等待 10s 让 server 就绪... && timeout /t 10 /nobreak >nul && npx tsx scripts/ig-scheduler-lite.ts"
    echo   ✅ 引擎脚本存在
) else (
    echo   ⚠ harvests-engine 未克隆，正在克隆...
    cd /d C:\harvests
    git clone git@github.com:snow368/harvests-engine.git
    start "IG Scheduler" cmd /c "cd /d %ENGINE_DIR% && timeout /t 10 /nobreak >nul && npx tsx scripts/ig-scheduler-lite.ts"
)
echo.

:: ======== 窗口 4: 监控 ========
echo [4/4] 监控窗口 — 查看任务状态
start "Bot Monitor" cmd /c "cd /d %REPO_DIR% && echo Bot 任务队列监视 && echo. && :loop && cls && echo ======================================== && echo  Bot 任务队列状态 (每 30 秒刷新) && echo ======================================== && echo. && curl -s http://localhost:3000/api/automation/neon-tasks?limit=5 2>nul || echo (等待 server 就绪...) && echo. && echo ======================================== && echo  打开 http://localhost:3000 使用前端管理 && echo. && timeout /t 30 /nobreak >nul && goto loop"
echo   ✅ 监控窗口已打开
echo.

echo ========================================
echo  启动完成！接下来：
echo.
echo  1. 打开 http://localhost:3000
echo  2. 登录（用 Google 账号）
echo  3. 点 "Bot Workers" 标签
echo  4. 点 "Start" 启动需要的 Bot Worker
echo.
echo  或直接开新窗口手动启动：
echo    cd %ENGINE_DIR%
echo    set BOT_ID=bot_ig_01
echo    set BOT_CDP_URL=http://127.0.0.1:9222
echo    npx tsx scripts/bot-worker-real.ts
echo.
echo ========================================
pause
