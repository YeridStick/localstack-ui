# Script para simular instancias EC2 usando contenedores Docker
# Autor: Cascade
# Uso: .\ec2-simulado.ps1 <comando> [parametros]

param(
    [Parameter(Mandatory=$true)]
    [string]$Action,
    
    [Parameter(Mandatory=$false)]
    [string]$InstanceId,
    
    [Parameter(Mandatory=$false)]
    [string]$Ami = "alpine:latest",
    
    [Parameter(Mandatory=$false)]
    [string]$InstanceType = "t2.micro"
)

$COMPOSE_FILE = "docker-compose.ec2-simulado.yml"

function Generate-InstanceId {
    $random = -join ((48..57) + (97..102) | Get-Random -Count 16 | ForEach-Object { [char]$_ })
    return "i-$random"
}

function Run-EC2Instance {
    param(
        [string]$Ami = "alpine:latest",
        [string]$InstanceType = "t2.micro"
    )
    
    $InstanceId = Generate-InstanceId
    $ContainerName = "ec2-$InstanceId"
    
    Write-Host "Creando instancia EC2 simulada..." -ForegroundColor Green
    Write-Host "  Instance ID: $InstanceId"
    Write-Host "  AMI: $Ami"
    Write-Host "  Tipo: $InstanceType"
    
    # Crear contenedor que simula EC2
    docker run -d `
        --name $ContainerName `
        --privileged `
        -e "EC2_INSTANCE_ID=$InstanceId" `
        -e "EC2_INSTANCE_TYPE=$InstanceType" `
        -e "EC2_AMI=$Ami" `
        --label "ec2.simulated=true" `
        --label "ec2.instance-id=$InstanceId" `
        --label "ec2.instance-type=$InstanceType" `
        --label "ec2.state=running" `
        --label "ec2.launch-time=$(Get-Date -Format 'yyyy-MM-ddTHH:mm:ss')" `
        $Ami `
        sleep infinity
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Instancia creada exitosamente: $InstanceId" -ForegroundColor Green
        return $InstanceId
    } else {
        Write-Host "Error al crear la instancia" -ForegroundColor Red
        return $null
    }
}

function Stop-EC2Instance {
    param([string]$InstanceId)
    
    $ContainerName = "ec2-$InstanceId"
    Write-Host "Deteniendo instancia EC2: $InstanceId" -ForegroundColor Yellow
    
    docker stop $ContainerName
    docker update --label "ec2.state=stopped" $ContainerName
    
    Write-Host "Instancia detenida: $InstanceId" -ForegroundColor Yellow
}

function Start-EC2Instance {
    param([string]$InstanceId)
    
    $ContainerName = "ec2-$InstanceId"
    Write-Host "Iniciando instancia EC2: $InstanceId" -ForegroundColor Green
    
    docker start $ContainerName
    docker update --label "ec2.state=running" $ContainerName
    
    Write-Host "Instancia iniciada: $InstanceId" -ForegroundColor Green
}

function Terminate-EC2Instance {
    param([string]$InstanceId)
    
    $ContainerName = "ec2-$InstanceId"
    Write-Host "Terminando instancia EC2: $InstanceId" -ForegroundColor Red
    
    docker rm -f $ContainerName
    
    Write-Host "Instancia terminada: $InstanceId" -ForegroundColor Red
}

function Get-EC2Instances {
    Write-Host "Listando instancias EC2 simuladas..." -ForegroundColor Cyan
    
    $containers = docker ps -a --filter "label=ec2.simulated=true" --format "{{.ID}}|{{.Names}}|{{.Image}}|{{.Status}}|{{.Labels}}"
    
    if (-not $containers) {
        Write-Host "No hay instancias EC2 simuladas" -ForegroundColor Gray
        return
    }
    
    Write-Host ""
    Write-Host "INSTANCES" -ForegroundColor Cyan
    Write-Host "---------" -ForegroundColor Cyan
    
    foreach ($container in $containers) {
        $parts = $container -split "\|"
        $id = $parts[0]
        $name = $parts[1]
        $image = $parts[2]
        $status = $parts[3]
        $labels = $parts[4]
        
        # Extraer labels
        $instanceId = if ($labels -match "ec2.instance-id=([^,]+)") { $matches[1] } else { "unknown" }
        $instanceType = if ($labels -match "ec2.instance-type=([^,]+)") { $matches[1] } else { "unknown" }
        $state = if ($labels -match "ec2.state=([^,]+)") { $matches[1] } else { "unknown" }
        $launchTime = if ($labels -match "ec2.launch-time=([^,]+)") { $matches[1] } else { "unknown" }
        
        Write-Host "  Instance ID: $instanceId" -ForegroundColor White
        Write-Host "  Container: $name" -ForegroundColor Gray
        Write-Host "  AMI (Image): $image" -ForegroundColor Gray
        Write-Host "  Type: $instanceType" -ForegroundColor Gray
        Write-Host "  State: $state" -ForegroundColor $(if ($state -eq "running") { "Green" } else { "Yellow" })
        Write-Host "  Docker Status: $status" -ForegroundColor Gray
        Write-Host "  Launch Time: $launchTime" -ForegroundColor Gray
        Write-Host "  Container ID: $id" -ForegroundColor Gray
        Write-Host ""
    }
}

function Connect-EC2Instance {
    param([string]$InstanceId)
    
    $ContainerName = "ec2-$InstanceId"
    Write-Host "Conectando a instancia EC2: $InstanceId" -ForegroundColor Cyan
    Write-Host "Ejecutando shell en el contenedor..." -ForegroundColor Gray
    
    docker exec -it $ContainerName sh
}

function Show-Help {
    Write-Host "EC2 Simulado - Uso:" -ForegroundColor Cyan
    Write-Host "  .\ec2-simulado.ps1 run [-Ami <imagen>] [-InstanceType <tipo>]" -ForegroundColor White
    Write-Host "    Crea una nueva instancia EC2 simulada" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  .\ec2-simulado.ps1 stop -InstanceId <id>" -ForegroundColor White
    Write-Host "    Detiene una instancia EC2" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  .\ec2-simulado.ps1 start -InstanceId <id>" -ForegroundColor White
    Write-Host "    Inicia una instancia EC2 detenida" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  .\ec2-simulado.ps1 terminate -InstanceId <id>" -ForegroundColor White
    Write-Host "    Termina (elimina) una instancia EC2" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  .\ec2-simulado.ps1 list" -ForegroundColor White
    Write-Host "    Lista todas las instancias EC2 simuladas" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  .\ec2-simulado.ps1 connect -InstanceId <id>" -ForegroundColor White
    Write-Host "    Conecta a una instancia EC2 via shell" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Ejemplos:" -ForegroundColor Cyan
    Write-Host "  .\ec2-simulado.ps1 run -Ami alpine:latest -InstanceType t2.micro"
    Write-Host "  .\ec2-simulado.ps1 list"
    Write-Host "  .\ec2-simulado.ps1 connect -InstanceId i-1234567890abcdef0"
}

# Main switch
switch ($Action.ToLower()) {
    "run" { 
        if (-not $Ami) { $Ami = "alpine:latest" }
        if (-not $InstanceType) { $InstanceType = "t2.micro" }
        Run-EC2Instance -Ami $Ami -InstanceType $InstanceType 
    }
    "start" { 
        if (-not $InstanceId) { Write-Host "Error: Se requiere -InstanceId" -ForegroundColor Red; exit 1 }
        Start-EC2Instance -InstanceId $InstanceId 
    }
    "stop" { 
        if (-not $InstanceId) { Write-Host "Error: Se requiere -InstanceId" -ForegroundColor Red; exit 1 }
        Stop-EC2Instance -InstanceId $InstanceId 
    }
    "terminate" { 
        if (-not $InstanceId) { Write-Host "Error: Se requiere -InstanceId" -ForegroundColor Red; exit 1 }
        Terminate-EC2Instance -InstanceId $InstanceId 
    }
    "list" { Get-EC2Instances }
    "connect" { 
        if (-not $InstanceId) { Write-Host "Error: Se requiere -InstanceId" -ForegroundColor Red; exit 1 }
        Connect-EC2Instance -InstanceId $InstanceId 
    }
    "help" { Show-Help }
    default { Write-Host "Acción desconocida: $Action"; Show-Help }
}
