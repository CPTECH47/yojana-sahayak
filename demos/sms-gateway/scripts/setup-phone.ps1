$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$runtimePath = Join-Path $projectRoot '.runtime'
New-Item -ItemType Directory -Force -Path $runtimePath | Out-Null
Write-Host 'Keep credentials here on your laptop. This setup sends no SMS.'
Write-Host 'On Android: install the official SMS Gateway app, grant SEND_SMS, enable Local Server, and join the same trusted Wi-Fi as this laptop.'
Write-Host 'Official releases: https://github.com/capcom6/android-sms-gateway/releases'
$gatewayUrl = Read-Host 'Phone LAN URL (example http://192.168.1.20:8080)'
$username = Read-Host 'Local Server username shown in the app'
$securePassword = Read-Host 'Local Server password' -AsSecureString
$recipient = Read-Host 'One consenting test recipient in international format (+91 followed by 10 digits)'
$messagesPath = Read-Host 'Message route shown in phone /docs: /message or /messages (Enter for /message)'
if ([string]::IsNullOrWhiteSpace($messagesPath)) { $messagesPath = '/message' }
if ($recipient -notmatch '^\+[1-9]\d{7,14}$') { throw 'Use international phone format, including +.' }
if ($messagesPath -notin @('/message','/messages')) { throw 'Choose /message or /messages from the phone docs.' }
$credential = New-Object System.Management.Automation.PSCredential($username, $securePassword)
$config = @{
  mode='android'; gatewayUrl=$gatewayUrl; username=$username; password=$credential.GetNetworkCredential().Password
  allowedNumbers=@($recipient); messagesPath=$messagesPath; dailySegmentLimit=6
}
$destination = Join-Path $runtimePath 'config.json'
if (Test-Path -LiteralPath $destination) { Copy-Item -LiteralPath $destination -Destination (Join-Path $runtimePath 'config.previous.json') -Force }
$config | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $destination -Encoding UTF8
$config=$null; $credential=$null; $securePassword=$null; $recipient=$null
Write-Host 'Saved privately under .runtime. Protect this directory with your Windows account permissions; it contains gateway credentials.'
Write-Host 'Restart npm start, open http://127.0.0.1:3012/, review the exact text, then confirm ONE real SMS.'
Write-Host 'The six-segment demo budget does not measure other apps or guarantee carrier billing.'
