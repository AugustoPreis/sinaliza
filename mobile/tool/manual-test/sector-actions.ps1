# Faz, pela API, o papel do setor (sem o portal web): mudar status e reencaminhar.
# Usa o admin, que pode agir em qualquer chamado.
#
# Uso (PowerShell, na pasta mobile/):
#   . .\tool\manual-test\sector-actions.ps1              # carrega as funções
#   Connect-Sinaliza -Password 'senha-do-admin'          # ADMIN_PASSWORD do api/.env
#   Get-SinalizaTicket SIN-1000                          # acha o id pelo protocolo
#   Set-TicketStatus  SIN-1000 IN_PROGRESS               # ou RESOLVED
#   Move-Ticket       SIN-1000 TI 'Equipamento de projeção é com a TI'

$script:Api = 'http://localhost:3000/api/v1'
$script:Session = $null

$script:Sectors = @{
    'TI'                   = '10000000-0000-4000-8000-000000000001'
    'Secretaria Acadêmica' = '10000000-0000-4000-8000-000000000002'
    'Financeiro'           = '10000000-0000-4000-8000-000000000003'
    'Biblioteca'           = '10000000-0000-4000-8000-000000000004'
    'Infraestrutura'       = '10000000-0000-4000-8000-000000000005'
}

function Connect-Sinaliza {
    param(
        [string]$Email = 'admin@sinaliza.local',
        [Parameter(Mandatory)][string]$Password
    )
    $body = @{ identifier = $Email; password = $Password } | ConvertTo-Json
    Invoke-RestMethod -Method Post -Uri "$script:Api/auth/login" -Body $body `
        -ContentType 'application/json' -SessionVariable s | Out-Null
    $script:Session = $s
    Write-Host "Logado como $Email" -ForegroundColor Green
}

function Invoke-Sinaliza {
    param([string]$Method, [string]$Path, $Body)
    if (-not $script:Session) { throw 'Rode Connect-Sinaliza primeiro.' }
    # Double-submit CSRF: repete o cookie XSRF-TOKEN no header.
    $xsrf = ($script:Session.Cookies.GetCookies($script:Api) |
        Where-Object Name -eq 'XSRF-TOKEN').Value
    $params = @{
        Method = $Method; Uri = "$script:Api$Path"; WebSession = $script:Session
        Headers = @{ 'x-xsrf-token' = $xsrf; 'Accept-Language' = 'pt-BR' }
    }
    if ($Body) { $params.Body = ($Body | ConvertTo-Json); $params.ContentType = 'application/json' }
    (Invoke-RestMethod @params).data
}

function Get-SinalizaTicket {
    param([Parameter(Mandatory)][string]$Protocol)
    $page = Invoke-Sinaliza GET "/admin/tickets?search=$Protocol&perPage=5"
    $items = if ($page.items) { $page.items } else { $page.data }
    $ticket = $items | Where-Object protocol -eq $Protocol | Select-Object -First 1
    if (-not $ticket) { throw "Chamado $Protocol não encontrado." }
    $ticket
}

function Set-TicketStatus {
    param(
        [Parameter(Mandatory)][string]$Protocol,
        [Parameter(Mandatory)][ValidateSet('IN_PROGRESS', 'RESOLVED')][string]$Status
    )
    $id = (Get-SinalizaTicket $Protocol).id
    Invoke-Sinaliza PATCH "/tickets/$id/status" @{ status = $Status } | Out-Null
    Write-Host "$Protocol -> $Status" -ForegroundColor Green
}

function Move-Ticket {
    param(
        [Parameter(Mandatory)][string]$Protocol,
        [Parameter(Mandatory)][string]$Sector,
        [Parameter(Mandatory)][string]$Reason
    )
    $target = $script:Sectors[$Sector]
    if (-not $target) { throw "Setor desconhecido. Use: $($script:Sectors.Keys -join ', ')" }
    $id = (Get-SinalizaTicket $Protocol).id
    Invoke-Sinaliza POST "/tickets/$id/reassign" @{ target_sector_id = $target; reason = $Reason } | Out-Null
    Write-Host "$Protocol reencaminhado para $Sector" -ForegroundColor Green
}
