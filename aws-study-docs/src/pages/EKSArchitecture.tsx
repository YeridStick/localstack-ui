import { DiagramNode } from '../components/diagrams/DiagramNode'
import { FlowArrow } from '../components/diagrams/FlowArrow'
import { Legend } from '../components/diagrams/Legend'
import { DiagramContainer } from '../components/diagrams/DiagramContainer'
import './ArchitecturePage.css'

const legendItems = [
  { color: 'color-mix(in srgb, var(--aws) 35%, transparent)', label: 'AWS' },
  { color: 'color-mix(in srgb, var(--network) 35%, transparent)', label: 'Red' },
  { color: 'color-mix(in srgb, var(--k8s) 35%, transparent)', label: 'Kubernetes' },
  { color: 'color-mix(in srgb, var(--lb) 35%, transparent)', label: 'Load Balancer' },
  { color: 'color-mix(in srgb, var(--security) 35%, transparent)', label: 'Seguridad' }
]

const cards = [
  {
    title: 'VPC',
    tag: '[REUTILIZABLE]',
    tagClass: 'tag-r',
    description: 'Es el dominio de red aislado de AWS. Define CIDR global y limites de enrutamiento interno.',
    interaction: 'Contiene subnets, route tables, NLB, ENI de VPC Link y nodos EKS.'
  },
  {
    title: 'Subnets',
    tag: '[DEPENDE]',
    tagClass: 'tag-d',
    description: 'Segmentan IPs por AZ. Para alta disponibilidad usa al menos dos AZ.',
    interaction: 'EKS node group y NLB consumen subnets para distribuir trafico.'
  },
  {
    title: 'Route Tables',
    tag: '[CRITICO]',
    tagClass: 'tag-c',
    description: 'Definen rutas locales y salidas (0.0.0.0/0) via IGW/NAT segun modelo.',
    interaction: 'Si ruta es incorrecta, nodos fallan pull de imagen o registro en control plane.'
  }
]

export function EKSArchitecture() {
  return (
    <div className="architecture-page animate-fade-in">
      <header className="page-header">
        <h1>EKS + Kubernetes</h1>
        <p className="page-subtitle">
          Arquitectura de contenedores con Elastic Kubernetes Service, NLB interno y API Gateway.
          Documento técnico orientado a portafolio y entrevista senior.
        </p>
        <div className="page-badges">
          <span className="badge r">[REUTILIZABLE] Base networking y patrones de despliegue</span>
          <span className="badge c">[CRITICO] Seguridad SG + health checks</span>
          <span className="badge d">[DEPENDE] IDs, CIDR, cuenta AWS</span>
        </div>
      </header>

      <section className="page-section">
        <h2>0) Supuestos operativos y convenciones</h2>
        <div className="cards-grid">
          <div className="info-card">
            <strong>Region</strong>
            <p className="muted">us-east-1 (ajustable por ambiente).</p>
          </div>
          <div className="info-card">
            <strong>Patron de entrada</strong>
            <p className="muted">Internet → API Gateway HTTP API → VPC Link → NLB interno → EKS NodePort → Pod.</p>
          </div>
          <div className="info-card">
            <strong>Matriz de ambientes</strong>
            <p className="muted">Separar cuentas por dev, qa, prod cuando se requiera aislamiento fuerte.</p>
          </div>
        </div>
        <pre className="code-block">
{`# Variables recomendadas (ajusta valores)
export AWS_REGION="us-east-1"
export CLUSTER_NAME="app-cluster"
export VPC_ID="vpc-xxxxxxxx"
export SUBNET_A="subnet-aaaa"
export SUBNET_B="subnet-bbbb"
export CLUSTER_SG="sg-cluster"
export BACKEND_SG="sg-backend"
export API_ID="api-id"
export VPC_LINK_ID="vpclink-id"`}
        </pre>
      </section>

      <section className="page-section">
        <h2>1) Flujo completo de request</h2>
        <DiagramContainer>
          <Legend items={legendItems} />
          <DiagramNode 
            type="aws" 
            title="Cliente (Web/Mobile/Postman)" 
            subtitle="HTTPS request publico" 
          />
          <FlowArrow />
          <DiagramNode 
            type="aws" 
            title="API Gateway (HTTP API)" 
            subtitle="Autorizacion, throttling, routing por stage" 
          />
          <FlowArrow />
          <DiagramNode 
            type="network" 
            title="VPC Link" 
            subtitle="Canal privado hacia VPC sin exponer backend a Internet" 
          />
          <FlowArrow />
          <DiagramNode 
            type="lb" 
            title="Network Load Balancer (interno)" 
            subtitle="Forward TCP al Target Group" 
          />
          <FlowArrow />
          <DiagramNode 
            type="security" 
            title="Security Groups + NACL" 
            subtitle="Control de trafico permitido (puertos/rangos origen)" 
          />
          <FlowArrow />
          <DiagramNode 
            type="k8s" 
            title="EKS Worker Node (EC2)" 
            subtitle="Recibe NodePort y reenvia al Pod" 
          />
          <FlowArrow />
          <DiagramNode 
            type="k8s" 
            title="Pod (Deployment app-service)" 
            subtitle="Contenedor backend expone :8080" 
          />
        </DiagramContainer>
        <div className="note">
          <strong>Decision técnica:</strong> API Gateway desacopla capa publica; VPC Link + NLB evita publicar nodos/pods. Este patron reduce superficie de ataque y centraliza politicas de entrada.
        </div>
      </section>

      <section className="page-section">
        <h2>2) Red (VPC, Subnets, Route Tables)</h2>
        <div className="cards-grid">
          {cards.map((card) => (
            <div className="info-card" key={card.title}>
              <div className="card-header">
                <strong>{card.title}</strong>
                <span className={`tag ${card.tagClass}`}>{card.tag}</span>
              </div>
              <p>{card.description}</p>
              <p className="muted small">Interaccion: {card.interaction}</p>
            </div>
          ))}
        </div>

        <h3>Comandos de creacion</h3>
        <pre className="code-block">
{`aws ec2 create-vpc --cidr-block 10.10.0.0/16
aws ec2 create-subnet --vpc-id $VPC_ID --cidr-block 10.10.0.0/20 --availability-zone us-east-1a
aws ec2 create-subnet --vpc-id $VPC_ID --cidr-block 10.10.16.0/20 --availability-zone us-east-1b
aws ec2 create-route-table --vpc-id $VPC_ID
aws ec2 create-route --route-table-id rtb-xxxx --destination-cidr-block 0.0.0.0/0 --gateway-id igw-xxxx`}
        </pre>

        <h3>Comandos de verificacion</h3>
        <pre className="code-block">
{`aws ec2 describe-vpcs --vpc-ids $VPC_ID --query "Vpcs[0].[VpcId,CidrBlock,State]" --output table
aws ec2 describe-subnets --filters Name=vpc-id,Values=$VPC_ID --output table
aws ec2 describe-route-tables --filters Name=vpc-id,Values=$VPC_ID --output table`}
        </pre>
      </section>

      <section className="page-section">
        <h2>3) Seguridad (Security Groups)</h2>
        <div className="cards-grid">
          <div className="info-card">
            <div className="card-header">
              <strong>SG Cluster / Node</strong>
              <span className="tag tag-c">[CRITICO]</span>
            </div>
            <p>Permite trafico necesario entre nodos, control plane y NodePort para NLB interno.</p>
          </div>
          <div className="info-card">
            <div className="card-header">
              <strong>SG VPC Link / NLB</strong>
              <span className="tag tag-c">[CRITICO]</span>
            </div>
            <p>Habilita salto privado API Gateway → NLB y NLB → node targets.</p>
          </div>
          <div className="info-card">
            <div className="card-header">
              <strong>Principio de minimo privilegio</strong>
              <span className="tag tag-r">[REUTILIZABLE]</span>
            </div>
            <p>Restringir por CIDR origen y puertos exactos evita accesos laterales no deseados.</p>
          </div>
        </div>

        <h3>Comandos de creacion</h3>
        <pre className="code-block">
{`aws ec2 create-security-group --group-name eks-cluster-sg --description "EKS Cluster SG" --vpc-id $VPC_ID
aws ec2 authorize-security-group-ingress --group-id $CLUSTER_SG --protocol tcp --port 30000-32767 --cidr 10.10.0.0/16
aws ec2 authorize-security-group-ingress --group-id $BACKEND_SG --protocol tcp --port 80 --source-group $CLUSTER_SG`}
        </pre>
      </section>

      <section className="page-section">
        <h2>4) EKS Cluster + Node Groups</h2>
        <h3>Comandos de creacion</h3>
        <pre className="code-block">
{`aws eks create-cluster \\
  --name $CLUSTER_NAME \\
  --region $AWS_REGION \\
  --role-arn arn:aws:iam::ACCOUNT_ID:role/eksClusterRole \\
  --resources-vpc-config subnetIds=$SUBNET_A,$SUBNET_B,securityGroupIds=$CLUSTER_SG

aws eks create-nodegroup \\
  --cluster-name $CLUSTER_NAME \\
  --nodegroup-name app-ng \\
  --node-role arn:aws:iam::ACCOUNT_ID:role/eksNodeRole \\
  --subnets $SUBNET_A $SUBNET_B \\
  --scaling-config minSize=2,maxSize=6,desiredSize=2 \\
  --instance-types t3.medium`}
        </pre>

        <h3>Kubernetes Deployment</h3>
        <pre className="code-block">
{`kubectl apply -f deployment.yaml
kubectl apply -f service.yaml

# Verificacion
kubectl get deployment app-service
kubectl get pods -l app=app-service -o wide
kubectl get svc app-service -o wide`}
        </pre>
      </section>

      <section className="page-section">
        <h2>5) API Gateway + VPC Link</h2>
        <pre className="code-block">
{`aws apigatewayv2 create-vpc-link --name app-vpc-link --subnet-ids $SUBNET_A $SUBNET_B --security-group-ids $BACKEND_SG
aws apigatewayv2 create-api --name app-http-api --protocol-type HTTP
aws apigatewayv2 create-integration --api-id $API_ID --integration-type HTTP_PROXY \\
  --integration-method ANY --connection-type VPC_LINK --connection-id $VPC_LINK_ID \\
  --integration-uri <nlb-listener-arn> --payload-format-version 1.0
aws apigatewayv2 create-route --api-id $API_ID --route-key "ANY /{proxy+}" --target integrations/<integration-id>
aws apigatewayv2 create-stage --api-id $API_ID --stage-name prod --auto-deploy`}
        </pre>

        <div className="note warning">
          <strong>Importante:</strong> Usar <code>overwrite:path</code> para evitar problemas de routing con stage prefix.
        </div>
      </section>
    </div>
  )
}
