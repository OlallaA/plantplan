param([uri]$BaseUrl = 'http://127.0.0.1:8080')

& (Join-Path $PSScriptRoot '../scripts/seed-demo.ps1') -BaseUrl $BaseUrl
