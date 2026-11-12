param([uri]$BaseUrl = 'http://127.0.0.1:8080')

$ErrorActionPreference = 'Stop'
if (-not $BaseUrl.IsLoopback -or $BaseUrl.Scheme -ne 'http') {
    throw 'Usa la API local de PlantPlan para cargar las cuentas de prueba.'
}
$apiUrl = $BaseUrl.GetLeftPart([System.UriPartial]::Authority) + '/api'

# Credenciales ficticias para la demostracion local.
$accounts = @(
    @{
        Email = 'demo.horta@example.test'; Password = 'PlantPlan-Demo-Horta!2026'; Name = 'Demo Horta'
        Garden = 'Horta da casa (demo)'; Crop = 'Tomate cherry'; Variety = 'Doce italiano'; Quantity = 30
    },
    @{
        Email = 'demo.escola@example.test'; Password = 'PlantPlan-Demo-Escola!2026'; Name = 'Demo Escola'
        Garden = 'Horta da escola (demo)'; Crop = 'Leituga'; Variety = 'Marabilla de veran'; Quantity = 60
    }
)

function Invoke-PlantPlan($Path, $Token, $Body) {
    $request = @{ Uri = "$apiUrl$Path"; TimeoutSec = 15 }
    if ($Token) { $request.Headers = @{ Authorization = "Bearer $Token" } }
    if ($null -ne $Body) {
        $request.Method = 'Post'
        $request.ContentType = 'application/json; charset=utf-8'
        $request.Body = $Body | ConvertTo-Json -Compress
    }
    Invoke-RestMethod @request
}

function Get-OrCreateResource($Path, $Token, [scriptblock]$Match, $Body) {
    $resources = Invoke-PlantPlan $Path -Token $Token
    $existing = $resources | Where-Object -FilterScript $Match | Select-Object -First 1
    if ($null -ne $existing) { return $existing }
    Invoke-PlantPlan $Path -Token $Token -Body $Body
}

Invoke-PlantPlan '/health' | Out-Null
$transplantDate = (Get-Date).AddDays(-2).ToString('yyyy-MM-dd', [cultureinfo]::InvariantCulture)

foreach ($account in $accounts) {
    $login = @{ email = $account.Email; password = $account.Password }
    try {
        $session = Invoke-PlantPlan '/auth/login' -Body $login
    } catch {
        if ([int]$_.Exception.Response.StatusCode -ne 400) { throw }
        try {
            Invoke-PlantPlan '/auth/register' -Body ($login + @{ name = $account.Name }) | Out-Null
        } catch {
            if ([int]$_.Exception.Response.StatusCode -ne 400) { throw }
            throw "La API rechazo el registro de $($account.Email). Comprueba si la cuenta ya existe con otra clave."
        }
        $session = Invoke-PlantPlan '/auth/login' -Body $login
    }

    $token = $session.token
    $garden = Get-OrCreateResource '/gardens' $token { $_.name -eq $account.Garden } @{
        name = $account.Garden
    }
    $sheet = Get-OrCreateResource '/crop-sheets' $token { $_.name -eq $account.Crop -and $_.variety -eq $account.Variety } @{
        name = $account.Crop; variety = $account.Variety; wateringFrequencyDays = 2
    }
    Get-OrCreateResource '/seeds' $token { $_.cropSheetId -eq $sheet.id -and $_.notes -eq 'PlantPlan demo' } @{
        cropSheetId = $sheet.id; quantity = $account.Quantity; notes = 'PlantPlan demo'
    } | Out-Null
    Get-OrCreateResource '/crops' $token { $_.cropSheetId -eq $sheet.id -and $_.gardenId -eq $garden.id } @{
        cropSheetId = $sheet.id; gardenId = $garden.id; initialQuantity = 3; transplantDate = $transplantDate
    } | Out-Null
}

$accounts | ForEach-Object { [pscustomobject]@{ Email = $_.Email; Password = $_.Password } } | Format-Table -AutoSize
