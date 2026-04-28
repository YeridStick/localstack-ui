import { DiagramNode } from '../components/diagrams/DiagramNode'
import { FlowArrow } from '../components/diagrams/FlowArrow'
import { Legend } from '../components/diagrams/Legend'
import { DiagramContainer } from '../components/diagrams/DiagramContainer'
import './ArchitecturePage.css'

const legendItems = [
  { color: 'color-mix(in srgb, var(--aws) 35%, transparent)', label: 'AWS' },
  { color: 'color-mix(in srgb, var(--lb) 35%, transparent)', label: 'Load Balancer' },
  { color: 'color-mix(in srgb, var(--compute) 35%, transparent)', label: 'Compute' },
  { color: 'color-mix(in srgb, var(--database) 35%, transparent)', label: 'Database' },
  { color: 'color-mix(in srgb, var(--network) 35%, transparent)', label: 'Network' }
]

export function ThreeTierArchitecture() {
  return (
    <div className="architecture-page animate-fade-in">
      <header className="page-header">
        <h1>Arquitectura de 3 Capas (EC2)</h1>
        <p className="page-subtitle">
          Arquitectura clásica web con Application Load Balancer, EC2 Auto Scaling Groups y RDS.
          Ideal para aplicaciones monolíticas con requisitos de estado de sesión.
        </p>
        <div className="page-badges">
          <span className="badge r">[REUTILIZABLE] Patrón Web Tier + App Tier + DB Tier</span>
          <span className="badge c">[CRITICO] Security Groups por capa + SSL</span>
          <span className="badge d">[DEPENDE] Tipo de instancia, AMI, configuración RDS</span>
        </div>
      </header>

      <section className="page-section">
        <h2>1) Diagrama de 3 Capas</h2>
        <DiagramContainer>
          <Legend items={legendItems} />
          <DiagramNode 
            type="aws" 
            title="Usuarios / Clientes" 
            subtitle="HTTPS requests desde browsers o aplicaciones" 
          />
          <FlowArrow />
          <DiagramNode 
            type="lb" 
            title="Application Load Balancer (ALB)" 
            subtitle="L7 routing, SSL termination, health checks, sticky sessions" 
          />
          <FlowArrow />
          <DiagramNode 
            type="network" 
            title="Web Tier (Public Subnet)" 
            subtitle="EC2 con Apache/Nginx o static hosting"
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '10px' }}>
              <div style={{ padding: '8px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', fontSize: '0.8rem' }}>EC2 Web 1</div>
              <div style={{ padding: '8px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', fontSize: '0.8rem' }}>EC2 Web 2</div>
            </div>
          </DiagramNode>
          <FlowArrow />
          <DiagramNode 
            type="compute" 
            title="App Tier (Private Subnet)" 
            subtitle="EC2 con lógica de negocio, API endpoints"
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '10px' }}>
              <div style={{ padding: '8px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', fontSize: '0.8rem' }}>EC2 App 1</div>
              <div style={{ padding: '8px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', fontSize: '0.8rem' }}>EC2 App 2</div>
            </div>
          </DiagramNode>
          <FlowArrow />
          <DiagramNode 
            type="database" 
            title="Data Tier (Private Subnet)" 
            subtitle="RDS Multi-AZ + ElastiCache Redis opcional" 
          />
        </DiagramContainer>
        <div className="note">
          <strong>Patrón clásico:</strong> Separación clara de responsabilidades permite escalar cada capa independientemente.
        </div>
      </section>

      <section className="page-section">
        <h2>2) Componentes por Capa</h2>
        <div className="cards-grid">
          <div className="info-card">
            <div className="card-header">
              <strong>Web Tier (Presentation)</strong>
              <span className="tag tag-d">[DEPENDE]</span>
            </div>
            <p>Servidores web estáticos, reverse proxy, SSL termination. Puede reemplazarse con S3 + CloudFront.</p>
          </div>
          <div className="info-card">
            <div className="card-header">
              <strong>App Tier (Logic)</strong>
              <span className="tag tag-c">[CRITICO]</span>
            </div>
            <p>Lógica de negocio, procesamiento de requests, integraciones con servicios externos.</p>
          </div>
          <div className="info-card">
            <div className="card-header">
              <strong>Data Tier (Storage)</strong>
              <span className="tag tag-c">[CRITICO]</span>
            </div>
            <p>Base de datos relacional RDS o NoSQL. Multi-AZ para alta disponibilidad.</p>
          </div>
        </div>
      </section>

      <section className="page-section">
        <h2>3) VPC y Networking</h2>
        <pre className="code-block">
{`# VPC con subnets públicas y privadas
aws ec2 create-vpc --cidr-block 10.0.0.0/16

# Subnets públicas para Web Tier
aws ec2 create-subnet --vpc-id $VPC_ID --cidr-block 10.0.1.0/24 --availability-zone us-east-1a
aws ec2 create-subnet --vpc-id $VPC_ID --cidr-block 10.0.2.0/24 --availability-zone us-east-1b

# Subnets privadas para App Tier
aws ec2 create-subnet --vpc-id $VPC_ID --cidr-block 10.0.3.0/24 --availability-zone us-east-1a
aws ec2 create-subnet --vpc-id $VPC_ID --cidr-block 10.0.4.0/24 --availability-zone us-east-1b

# Subnets privadas para DB Tier
aws ec2 create-subnet --vpc-id $VPC_ID --cidr-block 10.0.5.0/24 --availability-zone us-east-1a
aws ec2 create-subnet --vpc-id $VPC_ID --cidr-block 10.0.6.0/24 --availability-zone us-east-1b

# Internet Gateway para Web Tier
aws ec2 create-internet-gateway
aws ec2 attach-internet-gateway --internet-gateway-id $IGW_ID --vpc-id $VPC_ID

# NAT Gateway para App Tier (acceso a internet saliente)
aws ec2 allocate-address
aws ec2 create-nat-gateway --subnet-id $PUBLIC_SUBNET_A --allocation-id $EIP_ALLOC_ID`}
        </pre>
      </section>

      <section className="page-section">
        <h2>4) Security Groups por Capa</h2>
        <pre className="code-block">
{`# ALB Security Group - permite trafico HTTPS desde Internet
aws ec2 create-security-group \\
  --group-name alb-sg \\
  --description "ALB Security Group" \\
  --vpc-id $VPC_ID

aws ec2 authorize-security-group-ingress \\
  --group-id $ALB_SG \\
  --protocol tcp \\
  --port 443 \\
  --cidr 0.0.0.0/0

# Web Tier Security Group - permite solo desde ALB
aws ec2 create-security-group \\
  --group-name web-tier-sg \\
  --description "Web Tier Security Group" \\
  --vpc-id $VPC_ID

aws ec2 authorize-security-group-ingress \\
  --group-id $WEB_SG \\
  --protocol tcp \\
  --port 80 \\
  --source-group $ALB_SG

# App Tier Security Group - permite solo desde Web Tier
aws ec2 create-security-group \\
  --group-name app-tier-sg \\
  --description "App Tier Security Group" \\
  --vpc-id $VPC_ID

aws ec2 authorize-security-group-ingress \\
  --group-id $APP_SG \\
  --protocol tcp \\
  --port 8080 \\
  --source-group $WEB_SG

# DB Tier Security Group - permite solo desde App Tier
aws ec2 create-security-group \\
  --group-name db-tier-sg \\
  --description "DB Tier Security Group" \\
  --vpc-id $VPC_ID

aws ec2 authorize-security-group-ingress \\
  --group-id $DB_SG \\
  --protocol tcp \\
  --port 3306 \\
  --source-group $APP_SG`}
        </pre>
      </section>

      <section className="page-section">
        <h2>5) Application Load Balancer</h2>
        <pre className="code-block">
{`# Crear ALB
aws elbv2 create-load-balancer \\
  --name web-alb \\
  --subnets $PUBLIC_SUBNET_A $PUBLIC_SUBNET_B \\
  --security-groups $ALB_SG \\
  --scheme internet-facing

# Target Group para Web Tier
aws elbv2 create-target-group \\
  --name web-tg \\
  --protocol HTTP \\
  --port 80 \\
  --vpc-id $VPC_ID \\
  --target-type instance \\
  --health-check-path /health

# Listener HTTPS
aws elbv2 create-listener \\
  --load-balancer-arn $ALB_ARN \\
  --protocol HTTPS \\
  --port 443 \\
  --certificates CertificateArn=$CERT_ARN \\
  --default-actions Type=forward,TargetGroupArn=$TG_ARN`}
        </pre>
      </section>

      <section className="page-section">
        <h2>6) Auto Scaling Groups</h2>
        <pre className="code-block">
{`# Launch Template para Web Tier
aws ec2 create-launch-template \\
  --launch-template-name web-template \\
  --launch-template-data \\
    "ImageId=ami-12345678,InstanceType=t3.medium,SecurityGroupIds=$WEB_SG,UserData=<base64-script>"

# Auto Scaling Group Web Tier
aws autoscaling create-auto-scaling-group \\
  --auto-scaling-group-name web-asg \\
  --launch-template LaunchTemplateName=web-template \\
  --min-size 2 \\
  --max-size 10 \\
  --desired-capacity 2 \\
  --target-group-arns $TG_ARN \\
  --vpc-zone-identifier $PUBLIC_SUBNET_A,$PUBLIC_SUBNET_B \\
  --health-check-type ELB \\
  --health-check-grace-period 300

# Scaling Policies
aws autoscaling put-scaling-policy \\
  --auto-scaling-group-name web-asg \\
  --policy-name scale-up \\
  --policy-type TargetTrackingScaling \\
  --target-tracking-configuration file://config.json`}
        </pre>

        <h3>Configuración Target Tracking</h3>
        <pre className="code-block">
{`{
  "TargetValue": 50.0,
  "PredefinedMetricSpecification": {
    "PredefinedMetricType": "ASGAverageCPUUtilization"
  },
  "ScaleOutCooldown": 60,
  "ScaleInCooldown": 300
}`}
        </pre>
      </section>

      <section className="page-section">
        <h2>7) RDS Multi-AZ</h2>
        <pre className="code-block">
{`# Subnet Group para RDS
aws rds create-db-subnet-group \\
  --db-subnet-group-name db-subnet-group \\
  --db-subnet-group-description "Subnets for RDS" \\
  --subnet-ids $DB_SUBNET_A $DB_SUBNET_B

# Crear instancia RDS Multi-AZ
aws rds create-db-instance \\
  --db-instance-identifier myapp-db \\
  --db-instance-class db.t3.medium \\
  --engine mysql \\
  --master-username admin \\
  --master-user-password <password> \\
  --allocated-storage 100 \\
  --multi-az \\
  --vpc-security-group-ids $DB_SG \\
  --db-subnet-group-name db-subnet-group \\
  --backup-retention-period 7 \\
  --preferred-backup-window 03:00-04:00 \\
  --enable-performance-insights \\
  --performance-insights-retention-period 7`}
        </pre>
      </section>
    </div>
  )
}
