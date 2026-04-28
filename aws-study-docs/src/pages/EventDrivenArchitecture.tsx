import { DiagramNode } from '../components/diagrams/DiagramNode'
import { FlowArrow } from '../components/diagrams/FlowArrow'
import { Legend } from '../components/diagrams/Legend'
import { DiagramContainer } from '../components/diagrams/DiagramContainer'
import './ArchitecturePage.css'

const legendItems = [
  { color: 'color-mix(in srgb, var(--aws) 35%, transparent)', label: 'AWS' },
  { color: 'color-mix(in srgb, var(--messaging) 35%, transparent)', label: 'Messaging' },
  { color: 'color-mix(in srgb, var(--serverless) 35%, transparent)', label: 'Serverless' },
  { color: 'color-mix(in srgb, var(--storage) 35%, transparent)', label: 'Storage' }
]

export function EventDrivenArchitecture() {
  return (
    <div className="architecture-page animate-fade-in">
      <header className="page-header">
        <h1>Arquitectura Event-Driven</h1>
        <p className="page-subtitle">
          SQS, SNS y Lambda para procesamiento asíncrono y desacoplamiento de servicios.
          Patrones fan-out, pub/sub y colas de trabajo.
        </p>
        <div className="page-badges">
          <span className="badge r">[REUTILIZABLE] Patrones Pub/Sub + Queue-based</span>
          <span className="badge c">[CRITICO] DLQ + Idempotencia + Retry</span>
          <span className="badge d">[DEPENDE] Tamaño de mensaje, Retention period</span>
        </div>
      </header>

      <section className="page-section">
        <h2>1) Patrón Pub/Sub con SNS + SQS</h2>
        <DiagramContainer>
          <Legend items={legendItems} />
          <DiagramNode 
            type="aws" 
            title="Publisher Service" 
            subtitle="Aplicación que genera eventos de negocio" 
          />
          <FlowArrow />
          <DiagramNode 
            type="messaging" 
            title="Amazon SNS Topic" 
            subtitle="Fan-out a múltiples suscriptores" 
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginTop: '10px' }}>
              <div style={{ padding: '6px', background: 'rgba(0,0,0,0.2)', borderRadius: '4px', fontSize: '0.75rem' }}>OrderCreated</div>
              <div style={{ padding: '6px', background: 'rgba(0,0,0,0.2)', borderRadius: '4px', fontSize: '0.75rem' }}>PaymentProcessed</div>
              <div style={{ padding: '6px', background: 'rgba(0,0,0,0.2)', borderRadius: '4px', fontSize: '0.75rem' }}>InventoryUpdated</div>
            </div>
          </DiagramNode>
          <FlowArrow />
          <div style={{ display: 'flex', gap: '16px', width: '100%', justifyContent: 'center' }}>
            <DiagramNode 
              type="messaging" 
              title="SQS Queue A" 
              subtitle="Email Service" 
            />
            <DiagramNode 
              type="messaging" 
              title="SQS Queue B" 
              subtitle="Analytics Service" 
            />
            <DiagramNode 
              type="messaging" 
              title="Lambda" 
              subtitle="Notification Service" 
            />
          </div>
          <FlowArrow />
          <div style={{ display: 'flex', gap: '16px', width: '100%', justifyContent: 'center' }}>
            <DiagramNode 
              type="serverless" 
              title="Email Lambda" 
              subtitle="Envío de confirmaciones" 
            />
            <DiagramNode 
              type="serverless" 
              title="Analytics Lambda" 
              subtitle="Procesamiento de métricas" 
            />
            <DiagramNode 
              type="serverless" 
              title="Push Lambda" 
              subtitle="Notificaciones push" 
            />
          </div>
        </DiagramContainer>
        <div className="note">
          <strong>Beneficio:</strong> Desacoplamiento total entre productores y consumidores. Cada servicio puede escalar independientemente.
        </div>
      </section>

      <section className="page-section">
        <h2>2) Patrón SQS Queue-Based</h2>
        <DiagramContainer>
          <Legend items={legendItems} />
          <DiagramNode 
            type="aws" 
            title="API Gateway / Application" 
            subtitle="Recibe requests que requieren procesamiento asíncrono" 
          />
          <FlowArrow />
          <DiagramNode 
            type="messaging" 
            title="SQS Standard Queue" 
            subtitle="Alta throughput, best-effort ordering, at-least-once delivery" 
          />
          <FlowArrow />
          <DiagramNode 
            type="serverless" 
            title="Worker Lambda (Auto Scaling)" 
            subtitle="Procesamiento concurrente con batch size configurable" 
          />
          <FlowArrow />
          <DiagramNode 
            type="storage" 
            title="S3 / DynamoDB / RDS" 
            subtitle="Persistencia de resultados procesados" 
          />
        </DiagramContainer>
        <div className="note">
          <strong>Características SQS Standard:</strong> Ilimitado throughput, mensajes pueden entregarse desordenados o duplicados.
        </div>
      </section>

      <section className="page-section">
        <h2>3) SNS (Simple Notification Service)</h2>
        <h3>Creación y Suscripción</h3>
        <pre className="code-block">
{`# Crear topic SNS
aws sns create-topic --name order-events

# Suscribir SQS queue al topic
aws sns subscribe \\
  --topic-arn arn:aws:sns:us-east-1:ACCOUNT_ID:order-events \\
  --protocol sqs \\
  --notification-endpoint arn:aws:sqs:us-east-1:ACCOUNT_ID:email-queue

# Suscribir Lambda function
aws sns subscribe \\
  --topic-arn arn:aws:sns:us-east-1:ACCOUNT_ID:order-events \\
  --protocol lambda \\
  --notification-endpoint arn:aws:lambda:us-east-1:ACCOUNT_ID:function:notification-handler

# Suscribir endpoint HTTPS (webhook)
aws sns subscribe \\
  --topic-arn arn:aws:sns:us-east-1:ACCOUNT_ID:order-events \\
  --protocol https \\
  --notification-endpoint https://api.example.com/webhooks/sns

# Publicar mensaje
aws sns publish \\
  --topic-arn arn:aws:sns:us-east-1:ACCOUNT_ID:order-events \\
  --message '{"orderId": "123", "status": "created"}' \\
  --message-attributes '{"eventType": {"DataType": "String", "StringValue": "OrderCreated"}}'`}
        </pre>
      </section>

      <section className="page-section">
        <h2>4) SQS (Simple Queue Service)</h2>
        <h3>Standard vs FIFO</h3>
        <pre className="code-block">
{`# Cola Standard (alta throughput)
aws sqs create-queue \\
  --queue-name processing-queue \\
  --attributes '{
    "VisibilityTimeout": "300",
    "MessageRetentionPeriod": "1209600",
    "ReceiveMessageWaitTimeSeconds": "20",
    "RedrivePolicy": "{\\"deadLetterTargetArn\\":\\"arn:aws:sqs:us-east-1:ACCOUNT_ID:dlq\\",\\"maxReceiveCount\\":3}"
  }'

# Cola FIFO (garantía de orden y deduplicación)
aws sqs create-queue \\
  --queue-name order-queue.fifo \\
  --attributes '{
    "FifoQueue": "true",
    "ContentBasedDeduplication": "true",
    "VisibilityTimeout": "300"
  }'

# Enviar mensaje
aws sqs send-message \\
  --queue-url https://sqs.us-east-1.amazonaws.com/ACCOUNT_ID/processing-queue \\
  --message-body '{"task": "process-image", "imageId": "img-123"}' \\
  --message-group-id images \\
  --message-deduplication-id img-123-unique

# Recibir mensajes
aws sqs receive-message \\
  --queue-url https://sqs.us-east-1.amazonaws.com/ACCOUNT_ID/processing-queue \\
  --max-number-of-messages 10 \\
  --wait-time-seconds 20 \\
  --attribute-names All \\
  --message-attribute-names All

# Eliminar mensaje procesado
aws sqs delete-message \\
  --queue-url https://sqs.us-east-1.amazonaws.com/ACCOUNT_ID/processing-queue \\
  --receipt-handle <receipt-handle>`}
        </pre>
      </section>

      <section className="page-section">
        <h2>5) Lambda Event Source Mapping</h2>
        <pre className="code-block">
{`# Configurar Lambda para consumir SQS
aws lambda create-event-source-mapping \\
  --function-name sqs-processor \\
  --event-source-arn arn:aws:sqs:us-east-1:ACCOUNT_ID:processing-queue \\
  --batch-size 10 \\
  --maximum-batching-window-in-seconds 5 \\
  --function-response-types ReportBatchItemFailures

# SNS trigger para Lambda
aws lambda add-permission \\
  --function-name sns-processor \\
  --statement-id sns-trigger \\
  --action lambda:InvokeFunction \\
  --principal sns.amazonaws.com \\
  --source-arn arn:aws:sns:us-east-1:ACCOUNT_ID:order-events`}
        </pre>

        <h3>Código Lambda para SQS Batch</h3>
        <pre className="code-block">
{`exports.handler = async (event) => {
  const batchItemFailures = [];
  
  for (const record of event.Records) {
    try {
      const message = JSON.parse(record.body);
      console.log('Processing:', message);
      
      // Procesar mensaje
      await processMessage(message);
      
    } catch (error) {
      console.error('Failed:', record.messageId, error);
      // Reportar fallo individual para retry
      batchItemFailures.push({
        itemIdentifier: record.messageId
      });
    }
  }
  
  return {
    batchItemFailures
  };
};`}
        </pre>
      </section>

      <section className="page-section">
        <h2>6) Dead Letter Queues (DLQ)</h2>
        <pre className="code-block">
{`# Crear DLQ
aws sqs create-queue --queue-name processing-dlq

# Configurar DLQ en cola principal (Redrive Policy)
aws sqs set-queue-attributes \\
  --queue-url https://sqs.us-east-1.amazonaws.com/ACCOUNT_ID/processing-queue \\
  --attributes '{
    "RedrivePolicy": "{\\"deadLetterTargetArn\\":\\"arn:aws:sqs:us-east-1:ACCOUNT_ID:processing-dlq\\",\\"maxReceiveCount\\":3}"
  }'

# Lambda DLQ para mensajes que fallan async invocations
aws lambda put-function-event-invoke-config \\
  --function-name async-processor \\
  --destination-config '{
    "OnFailure": {"Destination": "arn:aws:sqs:us-east-1:ACCOUNT_ID:lambda-dlq"}
  }'

# Monitorear DLQ
aws sqs get-queue-attributes \\
  --queue-url https://sqs.us-east-1.amazonaws.com/ACCOUNT_ID/processing-dlq \\
  --attribute-names ApproximateNumberOfMessages`}
        </pre>
      </section>

      <section className="page-section">
        <h2>7) EventBridge (CloudWatch Events)</h2>
        <pre className="code-block">
{`# Crear event bus personalizado
aws events create-event-bus --name custom-bus

# Crear regla con pattern matching
aws events put-rule \\
  --name order-completed-rule \\
  --event-bus-name custom-bus \\
  --event-pattern '{
    "source": ["order.service"],
    "detail-type": ["Order Completed"],
    "detail": {
      "amount": [{"numeric": [">", 100]}]
    }
  }'

# Target a SQS queue
aws events put-targets \\
  --rule order-completed-rule \\
  --event-bus-name custom-bus \\
  --targets Id=1,Arn=arn:aws:sqs:us-east-1:ACCOUNT_ID:high-value-orders

# Publicar evento personalizado
aws events put-events --entries '{
  "EventBusName": "custom-bus",
  "Source": "order.service",
  "DetailType": "Order Completed",
  "Detail": "{\\"orderId\\":\\"123\\",\\"amount\\":150,\\"customer\\":\\"john\\"}"
}'`}
        </pre>
      </section>
    </div>
  )
}
