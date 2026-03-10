# Run once as Administrator to register the daily 1am update task
# Right-click -> "Run with PowerShell as Administrator"

$taskName = "WBC Challenge Stats Update"
$scriptPath = "C:\Users\Randy\OneDrive\Desktop\WBCChallenge\run-update.bat"

Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue

$action = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c `"$scriptPath`""
$trigger = New-ScheduledTaskTrigger -Daily -At "01:00"
$settings = New-ScheduledTaskSettingsSet `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 10) `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -RunLevel Highest -Force

Write-Host "Task '$taskName' registered. Runs daily at 1:00 AM."
