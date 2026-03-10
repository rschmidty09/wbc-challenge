@echo off
echo Registering WBC daily 1am update task...
echo.

schtasks /delete /tn "WBC Challenge Stats Update" /f 2>nul

schtasks /create ^
  /tn "WBC Challenge Stats Update" ^
  /tr "\"C:\Users\Randy\OneDrive\Desktop\WBCChallenge\run-update.bat\"" ^
  /sc DAILY ^
  /st 01:00 ^
  /ru "%USERNAME%" ^
  /f

echo.
if %errorlevel%==0 (
    echo SUCCESS - Task will run every day at 1:00 AM.
) else (
    echo FAILED - Try right-clicking this file and "Run as administrator"
)
echo.
pause
