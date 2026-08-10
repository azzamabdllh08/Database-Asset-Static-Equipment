@echo off
setlocal
cd /d "%~dp0"

echo ===============================================
echo DATABASE ASSET STATIC EQUIPMENT - ASSET REGISTER SYNC
echo ===============================================
echo.

if "%OneDrive%"=="" (
  echo ERROR: Variable OneDrive tidak ditemukan.
  echo Pastikan OneDrive Personal sudah login dan folder sudah tersinkron.
  pause
  exit /b 1
)

set "EXCEL=%OneDrive%\Zona 11\Asset Register & Verifikasi\Dashboard\Kertas Kerja Asset Register REV 2026-03-12 Combined.xlsx"

echo Source Asset Register:
echo %EXCEL%
echo.

if not exist "%EXCEL%" (
  echo ERROR: Kertas Kerja Asset Register tidak ditemukan pada path di atas.
  echo Pastikan nama file dan folder OneDrive sesuai.
  pause
  exit /b 1
)

python -m pip install -r tools\requirements.txt
if errorlevel 1 goto :error

python tools\sync_static.py "%EXCEL%" --repo "%~dp0" --push
if errorlevel 1 goto :error

echo.
echo ===============================================
echo SYNC ASSET REGISTER SELESAI
echo ===============================================
echo Dashboard akan memakai data.js terbaru setelah GitHub Pages selesai deploy.
pause
exit /b 0

:error
echo.
echo ===============================================
echo SYNC GAGAL - lihat pesan error di atas.
echo ===============================================
pause
exit /b 1
