import { DiagramNode } from '../components/diagrams/DiagramNode'
import { FlowArrow } from '../components/diagrams/FlowArrow'
import { Legend } from '../components/diagrams/Legend'
import { DiagramContainer } from '../components/diagrams/DiagramContainer'
import './ArchitecturePage.css'

const legendItems = [
  { color: 'color-mix(in srgb, var(--aws) 35%, transparent)', label: 'AWS' },
  { color: 'color-mix(in srgb, var(--messaging) 35%, transparent)', label: 'Streaming' },
  { color: 'color-mix(in srgb, var(--storage) 35%, transparent)', label: 'Storage' },
  { color: 'color-mix(in srgb, var(--serverless) 35%, transparent)', label: 'Processing' },
  { color: 'color-mix(in srgb, var(--database) 35%, transparent)', label: 'Analytics' }
]

export function DataPipelineArchitecture() {
  return (
    <div className="architecture-page animate-fade-in">
      <header className="page-header">
        <h1>Arquitectura Data Pipeline</h1>
        <p className="page-subtitle">
          Kinesis, S3, Glue y Athena para ingestión, procesamiento y análisis de datos a escala.
          Pipeline de datos en tiempo real y batch.
        </p>
        <div className="page-badges">
          <span className="badge r">[REUTILIZABLE] Patrones ETL y Data Lake</span>
          <span className="badge c">[CRITICO] Particionamiento + Compresión</span>
          <span className="badge d">[DEPENDE] Retención, Throughput, Formatos</span>
        </div>
      </header>

      <section className="page-section">
        <h2>1) Real-time Data Pipeline (Kinesis)</h2>
        <DiagramContainer>
          <Legend items={legendItems} />
          <DiagramNode 
            type="aws" 
            title="Data Producers" 
            subtitle="IoT devices, Applications, Logs, Clickstream" 
          />
          <FlowArrow />
          <DiagramNode 
            type="messaging" 
            title="Kinesis Data Streams" 
            subtitle="Ingestión de millones de eventos/segundo con sharding"
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginTop: '10px' }}>
              <div style={{ padding: '6px', background: 'rgba(0,0,0,0.2)', borderRadius: '4px', fontSize: '0.7rem' }}>Shard 1</div>
              <div style={{ padding: '6px', background: 'rgba(0,0,0,0.2)', borderRadius: '4px', fontSize: '0.7rem' }}>Shard 2</div>
              <div style={{ padding: '6px', background: 'rgba(0,0,0,0.2)', borderRadius: '4px', fontSize: '0.7rem' }}>Shard 3</div>
              <div style={{ padding: '6px', background: 'rgba(0,0,0,0.2)', borderRadius: '4px', fontSize: '0.7rem' }}>Shard N</div>
            </div>
          </DiagramNode>
          <FlowArrow />
          <div style={{ display: 'flex', gap: '16px', width: '100%', justifyContent: 'center' }}>
            <DiagramNode 
              type="serverless" 
              title="Kinesis Analytics" 
              subtitle="Flink SQL / Studio" 
            />
            <DiagramNode 
              type="serverless" 
              title="Lambda Transform" 
              subtitle="ETL en tiempo real" 
            />
          </div>
          <FlowArrow />
          <div style={{ display: 'flex', gap: '16px', width: '100%', justifyContent: 'center' }}>
            <DiagramNode 
              type="storage" 
              title="S3 Data Lake" 
              subtitle="Raw + Processed zones" 
            />
            <DiagramNode 
              type="database" 
              title="OpenSearch / Redshift" 
              subtitle="Analytics y Dashboards" 
            />
          </div>
        </DiagramContainer>
        <div className="note">
          <strong>Kinesis:</strong> 1 MB/s o 1000 records/s por shard. Escalar horizontalmente añadiendo shards.
        </div>
      </section>

      <section className="page-section">
        <h2>2) Batch Data Pipeline (Glue)</h2>
        <DiagramContainer>
          <Legend items={legendItems} />
          <DiagramNode 
            type="storage" 
            title="Raw Data Sources" 
            subtitle="S3, RDS, DynamoDB, JDBC" 
          />
          <FlowArrow />
          <DiagramNode 
            type="serverless" 
            title="AWS Glue Crawler" 
            subtitle="Descubrimiento automático de schema" 
          />
          <FlowArrow />
          <DiagramNode 
            type="serverless" 
            title="AWS Glue ETL Job" 
            subtitle="PySpark / Python Shell transformations" 
          />
          <FlowArrow />
          <DiagramNode 
            type="storage" 
            title="S3 Processed Zone" 
            subtitle="Parquet / ORC optimizado" 
          />
          <FlowArrow />
          <DiagramNode 
            type="database" 
            title="Athena / Redshift Spectrum" 
            subtitle="Query serverless sobre Data Lake" 
          />
        </DiagramContainer>
      </section>

      <section className="page-section">
        <h2>3) Kinesis Data Streams</h2>
        <pre className="code-block">
{`# Crear stream con 4 shards
aws kinesis create-stream --stream-name event-stream --shard-count 4

# Describir stream
aws kinesis describe-stream --stream-name event-stream

# Listar shards
aws kinesis list-shards --stream-name event-stream

# Poner registro (Producer)
aws kinesis put-record \\
  --stream-name event-stream \\
  --partition-key user-123 \\
  --data '{"event": "click", "page": "/home", "timestamp": 1234567890}'

# Poner múltiples records
aws kinesis put-records \\
  --stream-name event-stream \\
  --records \\
    Data='{"event":"page_view"}',PartitionKey=user-1 \\
    Data='{"event":"click"}',PartitionKey=user-2

# Obtener iterador (Consumer)
aws kinesis get-shard-iterator \\
  --shard-id shardId-000000000000 \\
  --shard-iterator-type TRIM_HORIZON \\
  --stream-name event-stream

# Leer records
aws kinesis get-records --shard-iterator <iterator-value>`}
        </pre>

        <h3>Kinesis Client Library (KCL) - Python</h3>
        <pre className="code-block">
{`import boto3
import json

kinesis = boto3.client('kinesis')

# Producer
response = kinesis.put_record(
    StreamName='event-stream',
    Data=json.dumps({
        'event_type': 'purchase',
        'user_id': 'user-123',
        'amount': 99.99,
        'timestamp': '2024-01-15T10:30:00Z'
    }),
    PartitionKey='user-123'  # Misma key = mismo shard
)

# Enhanced Fan-Out Consumer
response = kinesis.register_stream_consumer(
    StreamARN='arn:aws:kinesis:us-east-1:ACCOUNT_ID:stream/event-stream',
    ConsumerName='analytics-consumer'
)`}
        </pre>
      </section>

      <section className="page-section">
        <h2>4) Kinesis Data Firehose</h2>
        <pre className="code-block">
{`# Crear delivery stream a S3
aws firehose create-delivery-stream \\
  --delivery-stream-name events-to-s3 \\
  --delivery-stream-type DirectPut \\
  --extended-s3-destination-configuration '{
    "RoleARN": "arn:aws:iam::ACCOUNT_ID:role/FirehoseRole",
    "BucketARN": "arn:aws:s3:::data-lake-bucket",
    "Prefix": "events/year=!{timestamp:yyyy}/month=!{timestamp:MM}/day=!{timestamp:dd}/",
    "ErrorOutputPrefix": "errors/",
    "BufferingHints": {"SizeInMBs": 128, "IntervalInSeconds": 300},
    "CompressionFormat": "GZIP",
    "FormatConversion": {
      "Enabled": true,
      "InputFormatConfiguration": {"Deserializer": {"OpenXJsonSerDe": {}}},
      "OutputFormatConfiguration": {"Serializer": {"ParquetSerDe": {}}},
      "SchemaConfiguration": {
        "DatabaseName": "analytics",
        "TableName": "events",
        "RoleARN": "arn:aws:iam::ACCOUNT_ID:role/FirehoseRole"
      }
    }
  }'

# Enviar datos a Firehose
aws firehose put-record \\
  --delivery-stream-name events-to-s3 \\
  --record Data='{"user_id": "123", "event": "login"}'

# Monitoreo
aws cloudwatch get-metric-statistics \\
  --namespace AWS/Firehose \\
  --metric-name IncomingRecords \\
  --dimensions Name=DeliveryStreamName,Value=events-to-s3 \\
  --start-time 2024-01-01T00:00:00Z \\
  --end-time 2024-01-02T00:00:00Z \\
  --period 3600 \\
  --statistics Sum`}
        </pre>
      </section>

      <section className="page-section">
        <h2>5) AWS Glue ETL</h2>
        <pre className="code-block">
{`# Crear crawler
aws glue create-crawler \\
  --name s3-crawler \\
  --role arn:aws:iam::ACCOUNT_ID:role/GlueRole \\
  --database-name analytics \\
  --targets '{"S3Targets": [{"Path": "s3://data-lake-bucket/raw/"}]}'

# Ejecutar crawler
aws glue start-crawler --name s3-crawler

# Crear job ETL
aws glue create-job \\
  --name etl-transform \\
  --role arn:aws:iam::ACCOUNT_ID:role/GlueRole \\
  --command '{"Name": "glueetl", "ScriptLocation": "s3://scripts-bucket/etl.py", "PythonVersion": "3.9"}' \\
  --default-arguments '{
    "--job-language": "python",
    "--enable-metrics": "true",
    "--enable-continuous-cloudwatch-log": "true",
    "--output-path": "s3://data-lake-bucket/processed/",
    "--TempDir": "s3://temp-bucket/"
  }'

# Ejecutar job
aws glue start-job-run --job-name etl-transform`}
        </pre>

        <h3>Script Glue ETL (PySpark)</h3>
        <pre className="code-block">
{`import sys
from awsglue.transforms import *
from awsglue.utils import getResolvedOptions
from pyspark.context import SparkContext
from awsglue.context import GlueContext
from awsglue.job import Job

args = getResolvedOptions(sys.argv, ['JOB_NAME', 'output-path'])
sc = SparkContext()
glueContext = GlueContext(sc)
spark = glueContext.spark_session
job = Job(glueContext)
job.init(args['JOB_NAME'], args)

# Leer datos del catalog
datasource = glueContext.create_dynamic_frame.from_catalog(
    database="analytics",
    table_name="raw_events",
    transformation_ctx="datasource"
)

# Transformaciones
mapped = ApplyMapping.apply(
    frame=datasource,
    mappings=[
        ("user_id", "string", "user_id", "string"),
        ("event_type", "string", "event_type", "string"),
        ("timestamp", "bigint", "event_time", "timestamp")
    ],
    transformation_ctx="mapped"
)

# Escribir a Parquet partitioned
glueContext.write_dynamic_frame.from_options(
    frame=mapped,
    connection_type="s3",
    connection_options={
        "path": args['output-path'],
        "partitionKeys": ["event_type", "year", "month"]
    },
    format="parquet",
    transformation_ctx="datasink"
)

job.commit()`}
        </pre>
      </section>

      <section className="page-section">
        <h2>6) Amazon Athena (Query Serverless)</h2>
        <pre className="code-block">
{`# Crear base de datos
aws athena start-query-execution \\
  --query-string "CREATE DATABASE analytics" \\
  --work-group primary

# Crear tabla sobre S3 (External Table)
aws athena start-query-execution \\
  --query-string '
    CREATE EXTERNAL TABLE events (
      user_id string,
      event_type string,
      event_time timestamp,
      amount decimal(10,2)
    )
    PARTITIONED BY (year int, month int, day int)
    STORED AS PARQUET
    LOCATION "s3://data-lake-bucket/processed/events/"
    TBLPROPERTIES ("parquet.compress"="SNAPPY")
  ' \\
  --work-group primary \\
  --result-configuration OutputLocation=s3://athena-results-bucket/

# Cargar particiones
aws athena start-query-execution \\
  --query-string "MSCK REPAIR TABLE events" \\
  --work-group primary

# Query datos
aws athena start-query-execution \\
  --query-string '
    SELECT event_type, COUNT(*) as count, SUM(amount) as total
    FROM events
    WHERE year = 2024 AND month = 1
    GROUP BY event_type
    ORDER BY total DESC
  ' \\
  --work-group primary`}
        </pre>
      </section>

      <section className="page-section">
        <h2>7) Data Lake Organization (S3)</h2>
        <pre className="code-block">
{`# Estructura recomendada de buckets

# Raw Zone (datos originales)
s3://company-data-lake/raw/
  ├── events/
  │   └── year=2024/month=01/day=15/
  │       └── data.json.gz
  ├── logs/
  └── api-dumps/

# Processed Zone (datos transformados)
s3://company-data-lake/processed/
  ├── events/
  │   └── event_type=click/year=2024/month=01/
  │       └── part-00001.parquet
  ├── analytics/
  └── aggregations/

# Curated Zone (datos listos para consumo)
s3://company-data-lake/curated/
  ├── dashboards/
  ├── ml-training/
  └── reporting/

# Configuración lifecycle
aws s3api put-bucket-lifecycle-configuration \\
  --bucket company-data-lake \\
  --lifecycle-configuration file://lifecycle.json

# lifecycle.json
{
  "Rules": [
    {
      "ID": "archive-raw",
      "Status": "Enabled",
      "Filter": {"Prefix": "raw/"},
      "Transitions": [
        {"Days": 30, "StorageClass": "STANDARD_IA"},
        {"Days": 90, "StorageClass": "GLACIER"}
      ]
    }
  ]
}`}
        </pre>
      </section>
    </div>
  )
}
