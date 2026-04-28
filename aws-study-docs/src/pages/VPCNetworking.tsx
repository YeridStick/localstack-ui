import { DiagramNode } from '../components/diagrams/DiagramNode'
import { Legend } from '../components/diagrams/Legend'
import { DiagramContainer } from '../components/diagrams/DiagramContainer'
import './ArchitecturePage.css'

const legendItems = [
  { color: 'color-mix(in srgb, var(--network) 35%, transparent)', label: 'Network' },
  { color: 'color-mix(in srgb, var(--aws) 35%, transparent)', label: 'AWS' },
  { color: 'color-mix(in srgb, var(--security) 35%, transparent)', label: 'Security' }
]

export function VPCNetworking() {
  return (
    <div className="architecture-page animate-fade-in">
      <header className="page-header">
        <h1>VPC Networking</h1>
        <p className="page-subtitle">
          Diseño de redes, subnets, route tables, NAT Gateway, VPC peering y conectividad híbrida.
          Fundamentos de networking en AWS.
        </p>
        <div className="page-badges">
          <span className="badge r">[REUTILIZABLE] Patrones de diseño de red</span>
          <span className="badge c">[CRITICO] CIDR planning + Route tables</span>
          <span className="badge d">[DEPENDE] Rango CIDR, requisitos de IPs</span>
        </div>
      </header>

      <section className="page-section">
        <h2>1) VPC Architecture Pattern</h2>
        <DiagramContainer>
          <Legend items={legendItems} />
          <DiagramNode 
            type="network" 
            title="VPC (10.0.0.0/16)" 
            subtitle="Red aislada lógicamente en una región AWS"
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
              <div style={{ padding: '12px', background: 'rgba(39, 174, 96, 0.2)', borderRadius: '8px', border: '1px dashed rgba(39, 174, 96, 0.5)' }}>
                <strong style={{ fontSize: '0.9rem' }}>Public Subnet A (10.0.1.0/24)</strong>
                <div style={{ fontSize: '0.75rem', marginTop: '8px', opacity: 0.9 }}>
                  • ALB / NAT GW / Bastion<br/>
                  • Route to IGW (0.0.0.0/0)
                </div>
              </div>
              <div style={{ padding: '12px', background: 'rgba(39, 174, 96, 0.2)', borderRadius: '8px', border: '1px dashed rgba(39, 174, 96, 0.5)' }}>
                <strong style={{ fontSize: '0.9rem' }}>Public Subnet B (10.0.2.0/24)</strong>
                <div style={{ fontSize: '0.75rem', marginTop: '8px', opacity: 0.9 }}>
                  • ALB / NAT GW / Bastion<br/>
                  • Route to IGW (0.0.0.0/0)
                </div>
              </div>
              <div style={{ padding: '12px', background: 'rgba(47, 128, 237, 0.2)', borderRadius: '8px', border: '1px dashed rgba(47, 128, 237, 0.5)' }}>
                <strong style={{ fontSize: '0.9rem' }}>Private App A (10.0.3.0/24)</strong>
                <div style={{ fontSize: '0.75rem', marginTop: '8px', opacity: 0.9 }}>
                  • EC2 / EKS / ECS<br/>
                  • Route to NAT GW
                </div>
              </div>
              <div style={{ padding: '12px', background: 'rgba(47, 128, 237, 0.2)', borderRadius: '8px', border: '1px dashed rgba(47, 128, 237, 0.5)' }}>
                <strong style={{ fontSize: '0.9rem' }}>Private App B (10.0.4.0/24)</strong>
                <div style={{ fontSize: '0.75rem', marginTop: '8px', opacity: 0.9 }}>
                  • EC2 / EKS / ECS<br/>
                  • Route to NAT GW
                </div>
              </div>
              <div style={{ padding: '12px', background: 'rgba(142, 68, 173, 0.2)', borderRadius: '8px', border: '1px dashed rgba(142, 68, 173, 0.5)' }}>
                <strong style={{ fontSize: '0.9rem' }}>Private Data A (10.0.5.0/24)</strong>
                <div style={{ fontSize: '0.75rem', marginTop: '8px', opacity: 0.9 }}>
                  • RDS / ElastiCache<br/>
                  • Solo local routes
                </div>
              </div>
              <div style={{ padding: '12px', background: 'rgba(142, 68, 173, 0.2)', borderRadius: '8px', border: '1px dashed rgba(142, 68, 173, 0.5)' }}>
                <strong style={{ fontSize: '0.9rem' }}>Private Data B (10.0.6.0/24)</strong>
                <div style={{ fontSize: '0.75rem', marginTop: '8px', opacity: 0.9 }}>
                  • RDS / ElastiCache<br/>
                  • Solo local routes
                </div>
              </div>
            </div>
          </DiagramNode>
        </DiagramContainer>
      </section>

      <section className="page-section">
        <h2>2) VPC y Subnets</h2>
        <pre className="code-block">
{`# Crear VPC
aws ec2 create-vpc \\
  --cidr-block 10.0.0.0/16 \\
  --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=ProductionVPC}]'

# Habilitar DNS hostnames
aws ec2 modify-vpc-attribute --vpc-id $VPC_ID --enable-dns-hostnames

# Crear subnets públicas
aws ec2 create-subnet \\
  --vpc-id $VPC_ID \\
  --cidr-block 10.0.1.0/24 \\
  --availability-zone us-east-1a \\
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=Public-A}]'

aws ec2 create-subnet \\
  --vpc-id $VPC_ID \\
  --cidr-block 10.0.2.0/24 \\
  --availability-zone us-east-1b \\
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=Public-B}]'

# Crear subnets privadas para aplicaciones
aws ec2 create-subnet \\
  --vpc-id $VPC_ID \\
  --cidr-block 10.0.3.0/24 \\
  --availability-zone us-east-1a \\
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=Private-App-A}]'

aws ec2 create-subnet \\
  --vpc-id $VPC_ID \\
  --cidr-block 10.0.4.0/24 \\
  --availability-zone us-east-1b \\
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=Private-App-B}]'

# Crear subnets privadas para bases de datos
aws ec2 create-subnet \\
  --vpc-id $VPC_ID \\
  --cidr-block 10.0.5.0/24 \\
  --availability-zone us-east-1a \\
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=Private-Data-A}]'

aws ec2 create-subnet \\
  --vpc-id $VPC_ID \\
  --cidr-block 10.0.6.0/24 \\
  --availability-zone us-east-1b \\
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=Private-Data-B}]'`}
        </pre>
      </section>

      <section className="page-section">
        <h2>3) Internet Gateway y NAT Gateway</h2>
        <pre className="code-block">
{`# Crear Internet Gateway
aws ec2 create-internet-gateway --tag-specifications 'ResourceType=internet-gateway,Tags=[{Key=Name,Value=MainIGW}]'

# Attach IGW a VPC
aws ec2 attach-internet-gateway --internet-gateway-id $IGW_ID --vpc-id $VPC_ID

# Crear Elastic IP para NAT Gateway
aws ec2 allocate-address --domain vpc

# Crear NAT Gateway en subnet pública
aws ec2 create-nat-gateway \\
  --subnet-id $PUBLIC_SUBNET_A \\
  --allocation-id $EIP_ALLOCATION_ID \\
  --tag-specifications 'ResourceType=natgateway,Tags=[{Key=Name,Value=NAT-A}]'

# Esperar a que NAT Gateway esté available
aws ec2 wait nat-gateway-available --nat-gateway-ids $NAT_GW_ID`}
        </pre>
      </section>

      <section className="page-section">
        <h2>4) Route Tables</h2>
        <pre className="code-block">
{`# Crear Route Table pública
aws ec2 create-route-table --vpc-id $VPC_ID --tag-specifications 'ResourceType=route-table,Tags=[{Key=Name,Value=Public-RT}]'

# Agregar ruta a Internet Gateway
aws ec2 create-route \\
  --route-table-id $PUBLIC_RT_ID \\
  --destination-cidr-block 0.0.0.0/0 \\
  --gateway-id $IGW_ID

# Asociar subnets públicas a RT pública
aws ec2 associate-route-table --route-table-id $PUBLIC_RT_ID --subnet-id $PUBLIC_SUBNET_A
aws ec2 associate-route-table --route-table-id $PUBLIC_RT_ID --subnet-id $PUBLIC_SUBNET_B

# Crear Route Table privada
aws ec2 create-route-table --vpc-id $VPC_ID --tag-specifications 'ResourceType=route-table,Tags=[{Key=Name,Value=Private-RT}]'

# Agregar ruta a NAT Gateway
aws ec2 create-route \\
  --route-table-id $PRIVATE_RT_ID \\
  --destination-cidr-block 0.0.0.0/0 \\
  --nat-gateway-id $NAT_GW_ID

# Asociar subnets privadas a RT privada
aws ec2 associate-route-table --route-table-id $PRIVATE_RT_ID --subnet-id $PRIVATE_APP_A
aws ec2 associate-route-table --route-table-id $PRIVATE_RT_ID --subnet-id $PRIVATE_APP_B`}
        </pre>
      </section>

      <section className="page-section">
        <h2>5) VPC Peering</h2>
        <pre className="code-block">
{`# Crear VPC Peering entre dos VPCs
aws ec2 create-vpc-peering-connection \\
  --vpc-id $VPC_A_ID \\
  --peer-vpc-id $VPC_B_ID \\
  --peer-region us-west-2 \\
  --tag-specifications 'ResourceType=vpc-peering-connection,Tags=[{Key=Name,Value=VPC-A-to-VPC-B}]'

# Aceptar peering (desde la cuenta/VPC peer)
aws ec2 accept-vpc-peering-connection --vpc-peering-connection-id $PEERING_ID

# Agregar rutas en VPC A hacia VPC B
aws ec2 create-route \\
  --route-table-id $VPC_A_RT_ID \\
  --destination-cidr-block $VPC_B_CIDR \\
  --vpc-peering-connection-id $PEERING_ID

# Agregar rutas en VPC B hacia VPC A
aws ec2 create-route \\
  --route-table-id $VPC_B_RT_ID \\
  --destination-cidr-block $VPC_A_CIDR \\
  --vpc-peering-connection-id $PEERING_ID

# Verificar peering connection
aws ec2 describe-vpc-peering-connections --vpc-peering-connection-ids $PEERING_ID`}
        </pre>
      </section>

      <section className="page-section">
        <h2>6) VPC Endpoints (PrivateLink)</h2>
        <pre className="code-block">
{`# Gateway Endpoint para S3 (gratuito, no usa PrivateLink)
aws ec2 create-vpc-endpoint \\
  --vpc-id $VPC_ID \\
  --service-name com.amazonaws.us-east-1.s3 \\
  --vpc-endpoint-type Gateway \\
  --route-table-ids $PRIVATE_RT_ID

# Interface Endpoint para DynamoDB (usando PrivateLink)
aws ec2 create-vpc-endpoint \\
  --vpc-id $VPC_ID \\
  --service-name com.amazonaws.us-east-1.dynamodb \\
  --vpc-endpoint-type Gateway \\
  --route-table-ids $PRIVATE_RT_ID

# Interface Endpoint para servicios AWS (EC2, SSM, etc.)
aws ec2 create-vpc-endpoint \\
  --vpc-id $VPC_ID \\
  --service-name com.amazonaws.us-east-1.ec2messages \\
  --vpc-endpoint-type Interface \\
  --subnet-ids $PRIVATE_SUBNET_A $PRIVATE_SUBNET_B \\
  --security-group-ids $ENDPOINT_SG \\
  --private-dns-enabled

# Listar endpoints disponibles
aws ec2 describe-vpc-endpoint-services`}
        </pre>
      </section>

      <section className="page-section">
        <h2>7) Transit Gateway</h2>
        <pre className="code-block">
{`# Crear Transit Gateway
aws ec2 create-transit-gateway \\
  --description "Main TGW" \\
  --options \\
    AmazonSideAsn=64512, \\
    DefaultRouteTableAssociation=enable, \\
    DefaultRouteTablePropagation=enable, \\
    AutoAcceptSharedAttachments=disable, \\
    VpnEcmpSupport=enable, \\
    DnsSupport=enable \\
  --tag-specifications 'ResourceType=transit-gateway,Tags=[{Key=Name,Value=MainTGW}]'

# Crear Transit Gateway Attachment para VPC
aws ec2 create-transit-gateway-vpc-attachment \\
  --transit-gateway-id $TGW_ID \\
  --vpc-id $VPC_ID \\
  --subnet-ids $PRIVATE_SUBNET_A $PRIVATE_SUBNET_B \\
  --tag-specifications 'ResourceType=transit-gateway-attachment,Tags=[{Key=Name,Value=VPC-Attachment}]'

# Crear ruta en TGW
aws ec2 create-transit-gateway-route \\
  --destination-cidr-block 10.1.0.0/16 \\
  --transit-gateway-route-table-id $TGW_RT_ID \\
  --transit-gateway-attachment-id $TGW_ATTACHMENT_ID

# Compartir TGW usando RAM
aws ram create-resource-share \\
  --name TGW-Share \\
  --resource-arns arn:aws:ec2:us-east-1:ACCOUNT_ID:transit-gateway/$TGW_ID \\
  --principals arn:aws:organizations::ACCOUNT_ID:ou/ou-12345678`}
        </pre>
      </section>
    </div>
  )
}
