# AWS CLI Simulator para EC2 con contenedores reales
# Este script intercepta comandos AWS CLI para EC2 y los redirige a contenedores Docker
# Compatible con MiniStack/LocalStack para otros servicios (ECR, VPC, S3, etc.)

param(
    [Parameter(Mandatory=$true, Position=0)]
    [string]$Command,
    
    [Parameter(ValueFromRemainingArguments=$true)]
    [string[]]$Arguments
)

$STATE_FILE = "$env:USERPROFILE\.ec2-simulated-state.json"
$NETWORK_NAME = "localstack-ui_default"  # Red de MiniStack

# Ensure state file exists
if (-not (Test-Path $STATE_FILE)) {
    @{ instances = @() } | ConvertTo-Json | Out-File $STATE_FILE
}

function Load-State {
    return Get-Content $STATE_FILE | ConvertFrom-Json
}

function Save-State($state) {
    $state | ConvertTo-Json -Depth 10 | Out-File $STATE_FILE
}

function Generate-InstanceId {
    $random = -join ((48..57) + (97..102) | Get-Random -Count 17 | ForEach-Object { [char]$_ })
    return "i-$random"
}

function Parse-EC2Args($args_array) {
    $params = @{}
    for ($i = 0; $i -lt $args_array.Count; $i++) {
        $arg = $args_array[$i]
        switch -Regex ($arg) {
            "^--image-id$" { $params['ImageId'] = $args_array[++$i] }
            "^--instance-type$" { $params['InstanceType'] = $args_array[++$i] }
            "^--count$" { $params['Count'] = [int]$args_array[++$i] }
            "^--security-group-ids$" { $params['SecurityGroupIds'] = $args_array[++$i] }
            "^--subnet-id$" { $params['SubnetId'] = $args_array[++$i] }
            "^--key-name$" { $params['KeyName'] = $args_array[++$i] }
            "^--user-data$" { $params['UserData'] = $args_array[++$i] }
            "^--endpoint-url$" { $params['EndpointUrl'] = $args_array[++$i] }
        }
    }
    if (-not $params['Count']) { $params['Count'] = 1 }
    if (-not $params['InstanceType']) { $params['InstanceType'] = 't2.micro' }
    return $params
}

function Convert-ImageId-To-Docker($imageId) {
    # Convertir AMI ID a imagen Docker
    $amiMap = @{
        'ami-04681a1dbd79675a5' = 'alpine:latest'  # Amazon Linux 2 -> Alpine
        'ami-0c55b159cbfafe1f0' = 'ubuntu:22.04'   # Ubuntu
        'docker://alpine:latest' = 'alpine:latest'
        'docker://ubuntu:22.04' = 'ubuntu:22.04'
        'docker://nginx:latest' = 'nginx:latest'
    }
    
    if ($amiMap.ContainsKey($imageId)) {
        return $amiMap[$imageId]
    }
    
    # Si ya es un nombre de imagen Docker válido, usarlo directamente
    if ($imageId -match "^[a-z0-9]+(/[a-z0-9_-]+)?:[a-z0-9._-]+$" -or 
        $imageId -match "^[a-z0-9_-]+$") {
        return $imageId
    }
    
    # Default fallback
    return 'alpine:latest'
}

function Run-EC2Instance($params) {
    $instances = @()
    
    # Verificar que la red existe
    $networkExists = docker network ls --format "{{.Name}}" | Select-String $NETWORK_NAME
    if (-not $networkExists) {
        Write-Warning "Red $NETWORK_NAME no encontrada. Creando..."
        docker network create $NETWORK_NAME
    }
    
    for ($i = 0; $i -lt $params['Count']; $i++) {
        $instanceId = Generate-InstanceId
        $containerName = "ec2-$instanceId"
        $dockerImage = Convert-ImageId-To-Docker $params['ImageId']
        $launchTime = (Get-Date -Format "yyyy-MM-ddTHH:mm:ss.000Z")
        
        # Generar IPs simuladas
        $privateIp = "10.0.$([Random]::new().Next(1,255)).$([Random]::new().Next(1,255))"
        $publicIp = "54.$([Random]::new().Next(1,255)).$([Random]::new().Next(1,255)).$([Random]::new().Next(1,255))"
        
        Write-Host "Creating instance: $instanceId" -ForegroundColor Green
        Write-Host "  AMI: $($params['ImageId']) -> Docker: $dockerImage"
        Write-Host "  Type: $($params['InstanceType'])"
        Write-Host "  Subnet: $($params['SubnetId'])"
        Write-Host "  Security Groups: $($params['SecurityGroupIds'])"
        
        # Preparar user data si existe
        $userDataCmd = ""
        if ($params['UserData']) {
            $decodedUserData = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($params['UserData']))
            $userDataCmd = "; echo '$decodedUserData' | sh"
        }
        
        # Crear contenedor conectado a la red de MiniStack
        $dockerArgs = @(
            "run", "-d",
            "--name", $containerName,
            "--network", $NETWORK_NAME,
            "--hostname", "ip-$($privateIp.Replace('.', '-')).ec2.internal",
            "--label", "ec2.simulated=true",
            "--label", "ec2.instance-id=$instanceId",
            "--label", "ec2.instance-type=$($params['InstanceType'])",
            "--label", "ec2.image-id=$($params['ImageId'])",
            "--label", "ec2.state=running",
            "--label", "ec2.launch-time=$launchTime",
            "--label", "ec2.private-ip=$privateIp",
            "--label", "ec2.public-ip=$publicIp",
            "--label", "ec2.subnet-id=$($params['SubnetId'])",
            "--label", "ec2.security-group-ids=$($params['SecurityGroupIds'])"
        )
        
        # Agregar DNS para que pueda resolver 'ministack' y 'localstack'
        $dockerArgs += "--add-host"
        $dockerArgs += "ministack:host-gateway"
        $dockerArgs += "--add-host"
        $dockerArgs += "localstack:host-gateway"
        
        # Variables de entorno para AWS CLI dentro del contenedor
        $dockerArgs += "-e"
        $dockerArgs += "AWS_ACCESS_KEY_ID=test"
        $dockerArgs += "-e"
        $dockerArgs += "AWS_SECRET_ACCESS_KEY=test"
        $dockerArgs += "-e"
        $dockerArgs += "AWS_DEFAULT_REGION=us-east-1"
        $dockerArgs += "-e"
        $dockerArgs += "AWS_ENDPOINT_URL=http://ministack:4566"
        
        # Comando para mantener el contenedor corriendo
        $dockerArgs += $dockerImage
        $dockerArgs += "sh"
        $dockerArgs += "-c"
        $dockerArgs += "apk add --no-cache aws-cli curl docker-cli 2>/dev/null || apt-get update && apt-get install -y awscli curl docker.io 2>/dev/null || true; echo 'EC2 Instance $instanceId ready'; tail -f /dev/null"
        
        # Ejecutar docker run
        $containerId = & docker @dockerArgs 2>$null
        
        if ($LASTEXITCODE -eq 0 -and $containerId) {
            $instance = @{
                InstanceId = $instanceId
                ImageId = $params['ImageId']
                InstanceType = $params['InstanceType']
                State = @{ Code = 16; Name = "running" }
                PrivateIpAddress = $privateIp
                PublicIpAddress = $publicIp
                SubnetId = $params['SubnetId']
                SecurityGroups = if ($params['SecurityGroupIds']) { @($params['SecurityGroupIds'] -split ',') } else { @() }
                LaunchTime = $launchTime
                ContainerId = $containerId
                ContainerName = $containerName
                DockerImage = $dockerImage
            }
            $instances += $instance
            
            Write-Host "  Instance created successfully!" -ForegroundColor Green
            Write-Host "  Private IP: $privateIp"
            Write-Host "  Public IP: $publicIp"
            Write-Host "  Container: $containerId"
        } else {
            Write-Error "Failed to create instance"
        }
    }
    
    # Guardar en estado
    $state = Load-State
    $state.instances += $instances
    Save-State $state
    
    # Output similar a AWS CLI
    $output = @{
        ReservationId = "r-$(-join ((48..57) + (97..102) | Get-Random -Count 16 | ForEach-Object { [char]$_ }))"
        OwnerId = "000000000000"
        Groups = @()
        Instances = $instances | ForEach-Object {
            @{
                InstanceId = $_.InstanceId
                ImageId = $_.ImageId
                InstanceType = $_.InstanceType
                State = $_.State
                PrivateIpAddress = $_.PrivateIpAddress
                PublicIpAddress = $_.PublicIpAddress
                SubnetId = $_.SubnetId
                SecurityGroups = $_.SecurityGroups
                LaunchTime = $_.LaunchTime
            }
        }
    }
    
    return $output | ConvertTo-Json -Depth 10
}

function Describe-Instances($instanceIds) {
    $state = Load-State
    
    if ($instanceIds) {
        $instances = $state.instances | Where-Object { $instanceIds -contains $_.InstanceId }
    } else {
        $instances = $state.instances
    }
    
    # Actualizar estado de los contenedores
    foreach ($instance in $instances) {
        $containerInfo = docker inspect $instance.ContainerId 2>$null | ConvertFrom-Json
        if ($containerInfo) {
            $instance.State.Name = if ($containerInfo[0].State.Running) { "running" } else { "stopped" }
        }
    }
    
    Save-State $state
    
    $reservations = @(
        @{
            ReservationId = "r-default"
            OwnerId = "000000000000"
            Groups = @()
            Instances = $instances | ForEach-Object {
                @{
                    InstanceId = $_.InstanceId
                    ImageId = $_.ImageId
                    InstanceType = $_.InstanceType
                    State = @{ Code = 16; Name = $_.State.Name }
                    PrivateIpAddress = $_.PrivateIpAddress
                    PublicIpAddress = $_.PublicIpAddress
                    SubnetId = $_.SubnetId
                    SecurityGroups = $_.SecurityGroups
                    LaunchTime = $_.LaunchTime
                }
            }
        }
    )
    
    return @{ Reservations = $reservations } | ConvertTo-Json -Depth 10
}

function Stop-Instances($instanceIds) {
    $state = Load-State
    $stopped = @()
    
    foreach ($id in $instanceIds) {
        $instance = $state.instances | Where-Object { $_.InstanceId -eq $id } | Select-Object -First 1
        if ($instance) {
            Write-Host "Stopping instance: $id" -ForegroundColor Yellow
            docker stop $instance.ContainerId | Out-Null
            $instance.State.Name = "stopped"
            $instance.State.Code = 80
            $stopped += $instance
        }
    }
    
    Save-State $state
    
    return @{ 
        StoppingInstances = $stopped | ForEach-Object {
            @{
                InstanceId = $_.InstanceId
                CurrentState = @{ Code = 80; Name = "stopped" }
                PreviousState = @{ Code = 16; Name = "running" }
            }
        }
    } | ConvertTo-Json -Depth 10
}

function Terminate-Instances($instanceIds) {
    $state = Load-State
    $terminated = @()
    
    foreach ($id in $instanceIds) {
        $instance = $state.instances | Where-Object { $_.InstanceId -eq $id } | Select-Object -First 1
        if ($instance) {
            Write-Host "Terminating instance: $id" -ForegroundColor Red
            docker rm -f $instance.ContainerId | Out-Null
            $instance.State.Name = "terminated"
            $instance.State.Code = 48
            $terminated += $instance
        }
    }
    
    # Remover instancias terminadas del estado
    $state.instances = $state.instances | Where-Object { $_.State.Name -ne "terminated" }
    Save-State $state
    
    return @{
        TerminatingInstances = $terminated | ForEach-Object {
            @{
                InstanceId = $_.InstanceId
                CurrentState = @{ Code = 48; Name = "terminated" }
                PreviousState = @{ Code = 16; Name = "running" }
            }
        }
    } | ConvertTo-Json -Depth 10
}

function Connect-Instance($instanceId) {
    $state = Load-State
    $instance = $state.instances | Where-Object { $_.InstanceId -eq $instanceId } | Select-Object -First 1
    
    if (-not $instance) {
        Write-Error "Instance not found: $instanceId"
        return
    }
    
    Write-Host "Connecting to instance $instanceId..." -ForegroundColor Cyan
    Write-Host "Container: $($instance.ContainerName)" -ForegroundColor Gray
    Write-Host "Image: $($instance.DockerImage)" -ForegroundColor Gray
    Write-Host "" -ForegroundColor Gray
    Write-Host "Puedes ejecutar comandos AWS CLI dentro del contenedor:" -ForegroundColor Yellow
    Write-Host "  aws ecr describe-repositories --endpoint-url http://ministack:4566"
    Write-Host "  aws s3 ls --endpoint-url http://ministack:4566"
    Write-Host "  docker pull ministack:4510/mi-repo:latest" -ForegroundColor Yellow
    Write-Host "" -ForegroundColor Gray
    
    docker exec -it $instance.ContainerId sh
}

function Show-Help {
    @"
AWS EC2 Simulated - Comandos similares a AWS CLI para crear instancias EC2 reales

USO:
    .\aws-ec2-simulated.ps1 run-instances [opciones]
    .\aws-ec2-simulated.ps1 describe-instances [--instance-ids id1,id2]
    .\aws-ec2-simulated.ps1 stop-instances --instance-ids id1,id2
    .\aws-ec2-simulated.ps1 terminate-instances --instance-ids id1,id2
    .\aws-ec2-simulated.ps1 connect --instance-id id

OPCIONES para run-instances:
    --image-id           AMI o imagen Docker (ej: ami-04681a1dbd79675a5 o alpine:latest)
    --instance-type      Tipo de instancia (default: t2.micro)
    --count              Número de instancias (default: 1)
    --security-group-ids IDs de grupos de seguridad
    --subnet-id          ID de subnet
    --key-name           Nombre del key pair
    --user-data          User data (base64)
    --endpoint-url       URL del endpoint (ignorado, siempre usa MiniStack)

EJEMPLOS:
    # Crear instancia con Amazon Linux 2 (se convierte a alpine:latest)
    .\aws-ec2-simulated.ps1 run-instances --image-id ami-04681a1dbd79675a5 --instance-type t2.micro

    # Crear instancia con imagen Docker específica
    .\aws-ec2-simulated.ps1 run-instances --image-id nginx:latest --count 2

    # Listar instancias
    .\aws-ec2-simulated.ps1 describe-instances

    # Conectar a una instancia
    .\aws-ec2-simulated.ps1 connect --instance-id i-1234567890abcdef0

    # Terminar instancia
    .\aws-ec2-simulated.ps1 terminate-instances --instance-ids i-1234567890abcdef0

INTEGRACIÓN CON ECR:
    Dentro de la instancia puedes acceder a ECR de MiniStack:
    - Endpoint: http://ministack:4566 (AWS API)
    - ECR Registry: http://ministack:4510

"@
}

# Main
switch -Wildcard ($Command.ToLower()) {
    "run-instances" {
        $params = Parse-EC2Args $Arguments
        if (-not $params['ImageId']) {
            Write-Error "--image-id es requerido"
            exit 1
        }
        Run-EC2Instance $params | Write-Output
    }
    "describe-instances" {
        $ids = $null
        for ($i = 0; $i -lt $Arguments.Count; $i++) {
            if ($Arguments[$i] -eq "--instance-ids") {
                $ids = $Arguments[++$i] -split ","
            }
        }
        Describe-Instances $ids | Write-Output
    }
    "stop-instances" {
        $ids = @()
        for ($i = 0; $i -lt $Arguments.Count; $i++) {
            if ($Arguments[$i] -eq "--instance-ids") {
                $ids = $Arguments[++$i] -split ","
            }
        }
        if (-not $ids) {
            Write-Error "--instance-ids es requerido"
            exit 1
        }
        Stop-Instances $ids | Write-Output
    }
    "terminate-instances" {
        $ids = @()
        for ($i = 0; $i -lt $Arguments.Count; $i++) {
            if ($Arguments[$i] -eq "--instance-ids") {
                $ids = $Arguments[++$i] -split ","
            }
        }
        if (-not $ids) {
            Write-Error "--instance-ids es requerido"
            exit 1
        }
        Terminate-Instances $ids | Write-Output
    }
    "connect" {
        $id = $null
        for ($i = 0; $i -lt $Arguments.Count; $i++) {
            if ($Arguments[$i] -eq "--instance-id") {
                $id = $Arguments[++$i]
            }
        }
        if (-not $id) {
            Write-Error "--instance-id es requerido"
            exit 1
        }
        Connect-Instance $id
    }
    "help" { Show-Help }
    default { Write-Host "Comando desconocido: $Command"; Show-Help }
}
