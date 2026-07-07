@echo off
cd /d "F:\inkflow app\InkFlow_Project\inkflow_harvests"
echo === Starting vite build ===
call npx vite build 2>&1
echo === Exit code: %ERRORLEVEL% ===
