@echo off
cd /d "C:\Users\Randy\OneDrive\Desktop\WBCChallenge"
echo [%date% %time%] Running WBC stats update... >> update.log
"C:\Program Files\nodejs\node.exe" update-stats.js >> update.log 2>&1
echo [%date% %time%] Done. >> update.log
