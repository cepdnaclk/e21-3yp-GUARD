param(
  [string]$BaseUrl = 'http://localhost:3000',
  [string]$BrokerHost = 'localhost',
  [int]$BrokerPort = 1883,
  [int]$DeviceId = 0,
  [double]$NormalTemp = 29.5,
  [double]$HighTemp = 40.25
)

$ErrorActionPreference = 'Stop'

function Write-Step([string]$message) {
  Write-Host "`n==> $message" -ForegroundColor Cyan
}

function Publish-MqttReading([int]$devId, [double]$value) {
  $timestamp = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss')
  $topic = "sensor/$devId/temperature"

  & node "$PSScriptRoot/publish.js" $BrokerHost $BrokerPort $topic $value $timestamp
  if ($LASTEXITCODE -ne 0) {
    throw "MQTT publish failed for topic $topic"
  }

  Write-Host "Published via Node MQTT client: $topic" -ForegroundColor DarkGray
}

function Get-CollectionCount($value) {
  if ($null -eq $value) { return 0 }
  if ($value -is [System.Array]) { return $value.Count }
  return 1
}

function Invoke-JsonRequest {
  param(
    [string]$Method,
    [string]$Uri,
    [hashtable]$Headers,
    [object]$Body
  )

  $params = @{
    Method = $Method
    Uri = $Uri
  }

  if ($Headers) {
    $params.Headers = $Headers
  }

  if ($Body -ne $null) {
    $params.ContentType = 'application/json'
    $params.Body = ($Body | ConvertTo-Json -Depth 6)
  }

  return Invoke-RestMethod @params
}

Write-Step 'Checking backend and MQTT availability'
$health = Invoke-WebRequest -Uri "$BaseUrl/health" -UseBasicParsing
if ($health.StatusCode -ne 200) {
  throw "Backend health check failed: $($health.StatusCode)"
}

$mqttProbe = Test-NetConnection -ComputerName $BrokerHost -Port $BrokerPort -WarningAction SilentlyContinue
if (-not $mqttProbe.TcpTestSucceeded) {
  throw "MQTT broker not reachable at ${BrokerHost}:${BrokerPort}"
}

$socketProbe = Invoke-WebRequest -Uri "$BaseUrl/socket.io/?EIO=4&transport=polling" -UseBasicParsing
if ($socketProbe.StatusCode -ne 200) {
  throw 'Socket.IO endpoint is not reachable.'
}

Write-Host "Backend OK, MQTT OK, Socket.IO OK" -ForegroundColor Green

Write-Step 'Creating isolated test user'
$stamp = [int][double]::Parse((Get-Date -UFormat %s))
$username = "flow_user_$stamp"
$password = 'FlowTest@123'
$registerResponse = Invoke-JsonRequest -Method Post -Uri "$BaseUrl/auth/register" -Body @{
  username = $username
  password = $password
  fullName = 'Flow Test User'
  email = "$username@example.com"
}

$token = $registerResponse.token
if (-not $token) {
  throw 'Failed to obtain JWT token from /auth/register.'
}
$headers = @{ Authorization = "Bearer $token" }

Write-Step 'Ensuring sensor type exists: temperature'
$types = Invoke-JsonRequest -Method Get -Uri "$BaseUrl/sensor-types" -Headers $headers
$hasTemperature = $false
foreach ($t in $types) {
  if ($t.sensorName -and $t.sensorName.ToString().ToLower() -eq 'temperature') {
    $hasTemperature = $true
    break
  }
}

if (-not $hasTemperature) {
  Invoke-JsonRequest -Method Post -Uri "$BaseUrl/sensor-types" -Headers $headers -Body @{
    sensorName = 'temperature'
    frequency = '10s'
  } | Out-Null
  Write-Host 'Created sensor type temperature' -ForegroundColor DarkGray
}

Write-Step 'Creating test device'
if ($DeviceId -le 0) {
  $DeviceId = Get-Random -Minimum 9200 -Maximum 9900
}

try {
  Invoke-JsonRequest -Method Post -Uri "$BaseUrl/devices" -Headers $headers -Body @{
    deviceId = $DeviceId
    deviceName = 'Flow Test Device'
    location = 'Lab'
  } | Out-Null
} catch {
  throw "Failed to create device id $DeviceId. Try another -DeviceId value. $($_.Exception.Message)"
}

Write-Host "Device created: $DeviceId" -ForegroundColor Green

Write-Step 'Publishing normal reading and verifying storage'
Publish-MqttReading -devId $DeviceId -value $NormalTemp

$latest = $null
$latestCount = 0
for ($i = 0; $i -lt 8; $i++) {
  Start-Sleep -Seconds 1
  $latest = Invoke-JsonRequest -Method Get -Uri "$BaseUrl/sensor/latest?device_id=$DeviceId" -Headers $headers
  $latestCount = Get-CollectionCount $latest
  if ($latestCount -gt 0) {
    break
  }
}

if ($latestCount -lt 1) {
  throw 'No latest sensor readings returned after retries.'
}

Write-Step 'Publishing high reading and verifying alert generation'
Publish-MqttReading -devId $DeviceId -value $HighTemp
Start-Sleep -Seconds 2
$alerts = Invoke-JsonRequest -Method Get -Uri "$BaseUrl/alerts?device_id=$DeviceId&resolved=false" -Headers $headers

$alertCount = Get-CollectionCount $alerts

if ($alertCount -lt 1) {
  throw 'No alerts returned after high temperature publish.'
}

Write-Step 'E2E test completed successfully'
$summary = [ordered]@{
  user = $username
  deviceId = $DeviceId
  latestReading = $latest
  alertCount = $alertCount
  firstAlert = if ($alerts -is [System.Array]) { $alerts[0] } else { $alerts }
}

$summary | ConvertTo-Json -Depth 8
