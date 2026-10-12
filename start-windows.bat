@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if %errorlevel% equ 0 (
  start "" "http://localhost:8080"
  node --env-file-if-exists=.env server.mjs
) else (
  echo 请先安装 Node.js 22.13 或以上版本，再重新启动。
  pause
)
