import { DiagramNode } from '../components/diagrams/DiagramNode'
import { FlowArrow } from '../components/diagrams/FlowArrow'
import { Legend } from '../components/diagrams/Legend'
import { DiagramContainer } from '../components/diagrams/DiagramContainer'
import './ArchitecturePage.css'

const legendItems = [
  { color: 'color-mix(in srgb, var(--aws) 35%, transparent)', label: 'AWS' },
  { color: 'color-mix(in srgb, var(--serverless) 35%, transparent)', label: 'Serverless' },
  { color: 'color-mix(in srgb, var(--database) 35%, transparent)', label: 'Database' },
  { color: 'color-mix(in srgb, var(--security) 35%, transparent)', label: 'Seguridad' }
]

export function ServerlessArchitecture() {
  return (
    <div className="architecture-page animate-fade-in">
      <header className="page-header">
        <h1>Arquitectura Serverless</h1>
        <p className="page-subtitle">
          Lambda, API Gateway y DynamoDB para aplicaciones sin servidor con auto-scaling.
          Modelo de pago por uso y zero administration.
        </p>
        <div className="page-badges">
          <span className="badge r">[REUTILIZABLE] Patrones Lambda + API Gateway</span>
          <span className="badge c">[CRITICO] IAM Roles + Concurrency Limits</span>
          <span className="badge d">[DEPENDE] Region, Memory, Timeout config</span>
        </div>
      </header>

      <section className="page-section">
        <h2>1) Flujo Serverless</h2>
        <DiagramContainer>
          <Legend items={legendItems} />
          <DiagramNode 
            type="aws" 
            title="Cliente / Front-end" 
            subtitle="Web, Mobile o API Consumer" 
          />
          <FlowArrow />
          <DiagramNode 
            type="aws" 
            title="API Gateway (REST/HTTP)" 
            subtitle="Routing, Throttling, Auth, Caching, Request Validation" 
          />
          <FlowArrow />
          <DiagramNode 
            type="serverless" 
            title="AWS Lambda Function" 
            subtitle="Compute serverless con auto-scaling hasta 1000+ concurrencia" 
          />
          <FlowArrow />
          <DiagramNode 
            type="security" 
            title="IAM Role (Execution Role)" 
            subtitle="Permisos mínimos necesarios para Lambda" 
          />
          <FlowArrow />
          <DiagramNode 
            type="database" 
            title="DynamoDB / S3 / RDS" 
            subtitle="Almacenamiento persistente según caso de uso" 
          />
        </DiagramContainer>
        <div className="note">
          <strong>Beneficio clave:</strong> Sin servidores que gestionar, auto-scaling automático, y pago solo por invocaciones.
        </div>
      </section>

      <section className="page-section">
        <h2>2) Componentes Serverless</h2>
        <div className="cards-grid">
          <div className="info-card">
            <div className="card-header">
              <strong>AWS Lambda</strong>
              <span className="tag tag-r">[REUTILIZABLE]</span>
            </div>
            <p>Funciones event-driven con soporte para múltiples lenguajes (Node.js, Python, Go, Java).</p>
            <p className="muted small">Cold start, warm invocations, concurrency limits.</p>
          </div>
          <div className="info-card">
            <div className="card-header">
              <strong>API Gateway</strong>
              <span className="tag tag-c">[CRITICO]</span>
            </div>
            <p>Punto de entrada HTTP con integración directa a Lambda o servicios AWS.</p>
            <p className="muted small">REST API vs HTTP API: diferentes features y pricing.</p>
          </div>
          <div className="info-card">
            <div className="card-header">
              <strong>DynamoDB</strong>
              <span className="tag tag-d">[DEPENDE]</span>
            </div>
            <p>NoSQL serverless con throughput on-demand o provisioned.</p>
            <p className="muted small">Single-digit millisecond latency, global tables opcional.</p>
          </div>
        </div>
      </section>

      <section className="page-section">
        <h2>3) Creación de Funciones Lambda</h2>
        <h3>AWS CLI</h3>
        <pre className="code-block">
{`# Crear función Lambda
aws lambda create-function \\
  --function-name my-api-handler \\
  --runtime nodejs18.x \\
  --handler index.handler \\
  --zip-file fileb://function.zip \\
  --role arn:aws:iam::ACCOUNT_ID:role/lambda-execution-role \\
  --memory-size 512 \\
  --timeout 30 \\
  --environment Variables={ENV=prod,LOG_LEVEL=info}

# Actualizar código
aws lambda update-function-code \\
  --function-name my-api-handler \\
  --zip-file fileb://function.zip

# Configurar concurrency
aws lambda put-provisioned-concurrency-config \\
  --function-name my-api-handler \\
  --qualifier PROD \\
  --provisioned-concurrent-executions 100`}
        </pre>

        <h3>Código de Ejemplo (Node.js)</h3>
        <pre className="code-block">
{`exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event));
  
  const { httpMethod, path, queryStringParameters, body } = event;
  
  // Validación de entrada
  if (!body) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Missing body' })
    };
  }
  
  // Procesamiento
  const data = JSON.parse(body);
  
  // Respuesta
  return {
    statusCode: 200,
    headers: { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({ 
      message: 'Success',
      data: data 
    })
  };
};`}
        </pre>
      </section>

      <section className="page-section">
        <h2>4) API Gateway + Lambda Integration</h2>
        <pre className="code-block">
{`# Crear REST API
aws apigateway create-rest-api --name my-serverless-api

# Crear recurso /items
aws apigateway create-resource \\
  --rest-api-id API_ID \\
  --parent-id PARENT_ID \\
  --path-part items

# Crear método POST
aws apigateway put-method \\
  --rest-api-id API_ID \\
  --resource-id RESOURCE_ID \\
  --http-method POST \\
  --authorization-type NONE

# Integración Lambda
aws apigateway put-integration \\
  --rest-api-id API_ID \\
  --resource-id RESOURCE_ID \\
  --http-method POST \\
  --type AWS_PROXY \\
  --integration-http-method POST \\
  --uri arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/arn:aws:lambda:us-east-1:ACCOUNT_ID:function:my-api-handler/invocations

# Desplegar
aws apigateway create-deployment \\
  --rest-api-id API_ID \\
  --stage-name prod`}
        </pre>
      </section>

      <section className="page-section">
        <h2>5) DynamoDB para Serverless</h2>
        <pre className="code-block">
{`# Crear tabla DynamoDB
aws dynamodb create-table \\
  --table-name Items \\
  --attribute-definitions AttributeName=id,AttributeType=S \\
  --key-schema AttributeName=id,KeyType=HASH \\
  --billing-mode PAY_PER_REQUEST \\
  --stream-specification StreamEnabled=true,StreamViewType=NEW_AND_OLD_IMAGES

# Lambda DynamoDB Streams trigger
aws lambda create-event-source-mapping \\
  --function-name stream-processor \\
  --event-source-arn arn:aws:dynamodb:us-east-1:ACCOUNT_ID:table/Items/stream/TIMESTAMP \\
  --starting-position LATEST`}
        </pre>

        <h3>SDK v3 Ejemplo (Node.js)</h3>
        <pre className="code-block">
{`import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

// Guardar item
await docClient.send(new PutCommand({
  TableName: 'Items',
  Item: { id: '123', name: 'Product', price: 99.99 }
}));

// Obtener item
const result = await docClient.send(new GetCommand({
  TableName: 'Items',
  Key: { id: '123' }
}));`}
        </pre>
      </section>

      <section className="page-section">
        <h2>6) Mejores Prácticas Serverless</h2>
        <div className="cards-grid">
          <div className="info-card">
            <div className="card-header">
              <strong>Lazy Loading</strong>
              <span className="tag tag-r">[REUTILIZABLE]</span>
            </div>
            <p>Inicializar conexiones fuera del handler para reutilizar entre invocaciones warm.</p>
          </div>
          <div className="info-card">
            <div className="card-header">
              <strong>Dead Letter Queues</strong>
              <span className="tag tag-c">[CRITICO]</span>
            </div>
            <p>Configurar DLQ para procesamiento de fallos asíncronos sin pérdida de datos.</p>
          </div>
          <div className="info-card">
            <div className="card-header">
              <strong>Structured Logging</strong>
              <span className="tag tag-r">[REUTILIZABLE]</span>
            </div>
            <p>JSON logs con correlation IDs para trazabilidad en CloudWatch.</p>
          </div>
        </div>
      </section>
    </div>
  )
}
