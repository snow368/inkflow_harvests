@echo off
  chcp 65001 >nul
  cd /d C:\harvests
  set PYTHON=C:\Users\Administrator\AppData\Local\Programs\Python\Python311\python.exe

  echo ═══════════════════════════════════════
  echo  Harvests 爬虫看门狗 v1
  echo  每60秒检测一次，挂了自动重启
  echo ═══════════════════════════════════════

  :LOOP
  echo.
  echo [%date% %time%] 🔍 检测爬虫状态...

  tasklist /fi "imagename eq python.exe" 2>nul | find /i "python.exe" >nul
  if %errorlevel% equ 0 (
      echo [%date% %time%] ✅ 爬虫正常运行中
      timeout /t 60 /nobreak >nul
      goto LOOP
  )

  echo [%date% %time%] ❌ 爬虫挂了！准备重启...
  taskkill /f /im chrome.exe >nul 2>&1
  timeout /t 3 /nobreak >nul

  echo [%date% %time%] 🌐 启动 Chrome CDP（端口 9222）...
  start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" ^
      --remote-debugging-port=9222 ^
      --no-first-run ^
      --no-default-browser-check

  timeout /t 5 /nobreak >nul
  echo [%date% %time%] 🚀 启动爬虫...
  echo ═══════════════════════════════════════
  %PYTHON% scripts/python_scraper.py --state=OR --cities-file=scripts/or_cities.txt --headless=false

  echo [%date% %time%] ⚠️ 爬虫退出，30秒后重新检测...
  timeout /t 30 /nobreak >nul
  goto LOOP