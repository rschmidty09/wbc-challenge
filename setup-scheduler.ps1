# Run this once as Administrator to register the nightly update task
# Right-click setup-scheduler.ps1 -> "Run with PowerShell as Administrator"

$taskName = "WBC Challenge Stats Update"
$scriptPath = "C:\Users\Randy\OneDrive\Desktop\WBCChallenge\run-update.bat"

# Delete existing task if present
Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue

$action = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c `"$scriptPath`""
# 10:00 PM CST daily
$trigger = New-ScheduledTaskTrigger -Daily -At "22:00"
$settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Minutes 10) -StartWhenAvailable

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -RunLevel Highest -Force

Write-Host "Task '$taskName' registered. Runs daily at 10 PM."
Write-Host "To run manually: Start-ScheduledTask -TaskName '$taskName'"
