import './ArchitecturePage.css'

export function SecurityBestPractices() {
  return (
    <div className="architecture-page animate-fade-in">
      <header className="page-header">
        <h1>Seguridad en AWS</h1>
        <p className="page-subtitle">
          Mejores prácticas de seguridad: IAM, KMS, CloudTrail, GuardDuty, Config.
          Defensa en profundidad y cumplimiento.
        </p>
        <div className="page-badges">
          <span className="badge c">[CRITICO] IAM + Encryption + Logging</span>
          <span className="badge r">[REUTILIZABLE] Políticas y patrones</span>
          <span className="badge d">[DEPENDE] Requisitos de compliance</span>
        </div>
      </header>

      <section className="page-section">
        <h2>1) IAM - Identity and Access Management</h2>
        
        <h3>Principios Fundamentales</h3>
        <div className="cards-grid">
          <div className="info-card">
            <div className="card-header">
              <strong>Least Privilege</strong>
              <span className="tag tag-c">[CRITICO]</span>
            </div>
            <p>Conceder únicamente los permisos mínimos necesarios para cada rol/usuario.</p>
          </div>
          <div className="info-card">
            <div className="card-header">
              <strong>Separation of Duties</strong>
              <span className="tag tag-c">[CRITICO]</span>
            </div>
            <p>Dividir responsibilidades críticas entre múltiples personas/roles.</p>
          </div>
          <div className="info-card">
            <div className="card-header">
              <strong>No Root Account Usage</strong>
              <span className="tag tag-c">[CRITICO]</span>
            </div>
            <p>No usar la cuenta root para operaciones diarias. Crear usuarios IAM administrativos.</p>
          </div>
        </div>

        <h3>Creación de Roles y Políticas</h3>
        <pre className="code-block">
{`# Crear rol para EC2
aws iam create-role \\
  --role-name EC2-Application-Role \\
  --assume-role-policy-document file://trust-policy.json

# trust-policy.json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {"Service": "ec2.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }
  ]
}

# Crear política inline mínima
aws iam create-policy \\
  --policy-name S3-ReadOnly-Policy \\
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": [
          "s3:GetObject",
          "s3:GetObjectVersion",
          "s3:ListBucket"
        ],
        "Resource": [
          "arn:aws:s3:::company-data-bucket",
          "arn:aws:s3:::company-data-bucket/*"
        ],
        "Condition": {
          "StringEquals": {
            "s3:x-amz-server-side-encryption": "aws:kms"
          }
        }
      }
    ]
  }'

# Adjuntar política al rol
aws iam attach-role-policy \\
  --role-name EC2-Application-Role \\
  --policy-arn arn:aws:iam::ACCOUNT_ID:policy/S3-ReadOnly-Policy

# Crear Instance Profile para EC2
aws iam create-instance-profile --instance-profile-name EC2-Profile
aws iam add-role-to-instance-profile \\
  --instance-profile-name EC2-Profile \\
  --role-name EC2-Application-Role`}
        </pre>
      </section>

      <section className="page-section">
        <h2>2) KMS - Key Management Service</h2>
        
        <h3>Creación y Uso de Claves</h3>
        <pre className="code-block">
{`# Crear Customer Managed Key (CMK)
aws kms create-key \\
  --description "Data encryption key" \\
  --key-usage ENCRYPT_DECRYPT \\
  --key-spec SYMMETRIC_DEFAULT \\
  --multi-region false \\
  --policy file://key-policy.json

# Crear alias para la clave
aws kms create-alias \\
  --alias-name alias/data-encryption-key \\
  --target-key-id $KEY_ID

# key-policy.json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "Enable IAM User Permissions",
      "Effect": "Allow",
      "Principal": {"AWS": "arn:aws:iam::ACCOUNT_ID:root"},
      "Action": "kms:*",
      "Resource": "*"
    },
    {
      "Sid": "Allow EC2 Role",
      "Effect": "Allow",
      "Principal": {"AWS": "arn:aws:iam::ACCOUNT_ID:role/EC2-Application-Role"},
      "Action": [
        "kms:Encrypt",
        "kms:Decrypt",
        "kms:GenerateDataKey"
      ],
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "kms:ViaService": "s3.us-east-1.amazonaws.com"
        }
      }
    }
  ]
}

# Habilitar rotación automática
aws kms enable-key-rotation --key-id $KEY_ID

# Encriptar datos con KMS
aws kms encrypt \\
  --key-id alias/data-encryption-key \\
  --plaintext fileb://secret.txt \\
  --output text \\
  --query CiphertextBlob | base64 --decode > encrypted-secret

# Desencriptar
aws kms decrypt \\
  --ciphertext-blob fileb://encrypted-secret \\
  --output text \\
  --query Plaintext | base64 --decode`}
        </pre>

        <h3>Encriptación de Recursos AWS</h3>
        <pre className="code-block">
{`# Encriptar bucket S3 por default
aws s3api put-bucket-encryption \\
  --bucket my-encrypted-bucket \\
  --server-side-encryption-configuration '{
    "Rules": [
      {
        "ApplyServerSideEncryptionByDefault": {
          "SSEAlgorithm": "aws:kms",
          "KMSMasterKeyID": "$KEY_ID"
        },
        "BucketKeyEnabled": true
      }
    ]
  }'

# Crear RDS encriptada
aws rds create-db-instance \\
  --db-instance-identifier encrypted-db \\
  --allocated-storage 100 \\
  --db-instance-class db.t3.medium \\
  --engine mysql \\
  --master-username admin \\
  --master-user-password password123 \\
  --storage-encrypted \\
  --kms-key-id $KEY_ID

# Crear volumen EBS encriptado
aws ec2 create-volume \\
  --size 100 \\
  --volume-type gp3 \\
  --encrypted \\
  --kms-key-id $KEY_ID \\
  --availability-zone us-east-1a`}
        </pre>
      </section>

      <section className="page-section">
        <h2>3) CloudTrail - Logging y Auditoría</h2>
        <pre className="code-block">
{`# Crear trail multi-region
aws cloudtrail create-trail \\
  --name management-events-trail \\
  --s3-bucket-name cloudtrail-logs-bucket \\
  --is-multi-region-trail \\
  --enable-log-file-validation \\
  --kms-key-id $KEY_ID \\
  --is-organization-trail

# Habilitar CloudTrail Insights
aws cloudtrail put-insight-selectors \\
  --trail-name management-events-trail \\
  --insight-selectors '[{"InsightType": "ApiCallRateInsight"}, {"InsightType": "ApiErrorRateInsight"}]'

# Habilitar eventos de datos para S3
aws cloudtrail put-event-selectors \\
  --trail-name management-events-trail \\
  --event-selectors '[{
    "ReadWriteType": "All",
    "IncludeManagementEvents": true,
    "DataResources": [
      {"Type": "AWS::S3::Object", "Values": ["arn:aws:s3:::sensitive-bucket/"]},
      {"Type": "AWS::Lambda::Function", "Values": ["arn:aws:lambda"]}  
    ]
  }]'

# Consultar logs con Athena
aws athena start-query-execution \\
  --query-string '
    SELECT eventTime, eventName, userIdentity.arn, sourceIPAddress
    FROM cloudtrail_logs
    WHERE eventName IN (\"DeleteBucket\", \"PutBucketPolicy\")
    AND eventTime > timestamp \"2024-01-01T00:00:00Z\"
    ORDER BY eventTime DESC
  ' \\
  --work-group primary`}
        </pre>
      </section>

      <section className="page-section">
        <h2>4) GuardDuty - Threat Detection</h2>
        <pre className="code-block">
{`# Habilitar GuardDuty
aws guardduty create-detector --enable

# Obtener detector ID
aws guardduty list-detectors

# Crear filtro de supresión para falsos positivos
aws guardduty create-filter \\
  --detector-id $DETECTOR_ID \\
  --name TrustedIPFilter \\
  --action ARCHIVE \\
  --rank 1 \\
  --finding-criteria '{
    "Criterion": {
      "type": {"Eq": ["Recon:IAMUser/ UserPermissions"]},
      "service.action.awsApiCallAction.remoteIpDetails.ipAddressV4": {"NotEq": ["203.0.113.0/24"]}
    }
  }'

# Configurar notificaciones SNS para findings
aws guardduty create-publishing-destination \\
  --detector-id $DETECTOR_ID \\
  --destination-type SNS \\
  --destination-properties DestinationArn=arn:aws:sns:us-east-1:ACCOUNT_ID:guardduty-alerts

# Listar findings activos
aws guardduty list-findings \\
  --detector-id $DETECTOR_ID \\
  --finding-criteria '{
    "Criterion": {
      "severity": {"Gte": 7}
    }
  }'`}
        </pre>
      </section>

      <section className="page-section">
        <h2>5) AWS Config - Compliance y Reglas</h2>
        <pre className="code-block">
{`# Habilitar Config
aws configservice put-configuration-recorder \\
  --configuration-recorder name=default \\
  --recording-group allSupported=true,includeGlobalResourceTypes=true

# Configurar bucket y rol para Config
aws configservice put-delivery-channel \\
  --delivery-channel '{"name": "default", "s3BucketName": "config-bucket", "snsTopicARN": "arn:aws:sns:us-east-1:ACCOUNT_ID:config-topic"}'

# Habilitar recording
aws configservice start-configuration-recorder --configuration-recorder-name default

# Agregar regla de compliance (ej: S3 bucket encryption)
aws configservice put-config-rule \\
  --config-rule '{
    "ConfigRuleName": "s3-bucket-server-side-encryption-enabled",
    "Source": {
      "Owner": "AWS",
      "SourceIdentifier": "S3_BUCKET_SERVER_SIDE_ENCRYPTION_ENABLED"
    }
  }'

# Regla personalizada con Lambda
aws configservice put-config-rule \\
  --config-rule '{
    "ConfigRuleName": "required-tags",
    "Source": {
      "Owner": "CUSTOM_LAMBDA",
      "SourceIdentifier": "arn:aws:lambda:us-east-1:ACCOUNT_ID:function:config-required-tags",
      "SourceDetails": [{"EventSource": "aws.config", "MessageType": "ConfigurationItemChangeNotification"}]
    },
    "InputParameters": "{\\"requiredTagKeys\\": \"Environment,Owner,Project\\"}"
  }'

# Evaluar compliance
aws configservice get-compliance-details-by-config-rule \\
  --config-rule-name s3-bucket-server-side-encryption-enabled \\
  --compliance-types NON_COMPLIANT`}
        </pre>
      </section>

      <section className="page-section">
        <h2>6) Security Groups - Mejores Prácticas</h2>
        <pre className="code-block">
{`# Security Group restringido para ALB
aws ec2 create-security-group \\
  --group-name alb-restricted \\
  --description "ALB with specific IP whitelist" \\
  --vpc-id $VPC_ID

# Permitir solo desde IPs corporativas
aws ec2 authorize-security-group-ingress \\
  --group-id $SG_ID \\
  --protocol tcp \\
  --port 443 \\
  --cidr 203.0.113.0/24

# Referencia a otro Security Group (mejor que CIDR)
aws ec2 authorize-security-group-ingress \\
  --group-id $DB_SG \\
  --protocol tcp \\
  --port 3306 \\
  --source-group $APP_SG

# Validar Security Groups abiertos
aws ec2 describe-security-groups \\
  --filters Name=ip-permission.cidr,Values=0.0.0.0/0 \\
  --query 'SecurityGroups[*].[GroupId, GroupName, IpPermissions[?Ipv6Ranges[?CidrIpv6==\`::/0\`] || IpRanges[?CidrIp==\`0.0.0.0/0\`]]]'

# Remover regla 0.0.0.0/0
aws ec2 revoke-security-group-ingress \\
  --group-id $SG_ID \\
  --protocol tcp \\
  --port 22 \\
  --cidr 0.0.0.0/0`}
        </pre>
      </section>

      <section className="page-section">
        <h2>7) Checklist de Seguridad</h2>
        <div className="cards-grid">
          <div className="info-card">
            <div className="card-header">
              <strong>Autenticación</strong>
            </div>
            <ul style={{ fontSize: '0.9rem', paddingLeft: '20px', color: 'var(--muted)' }}>
              <li>MFA en todas las cuentas root</li>
              <li>MFA en usuarios administrativos</li>
              <li>No claves de acceso de larga duración</li>
              <li>Uso de IAM Roles para servicios</li>
              <li>SSO para acceso humano</li>
            </ul>
          </div>
          <div className="info-card">
            <div className="card-header">
              <strong>Red</strong>
            </div>
            <ul style={{ fontSize: '0.9rem', paddingLeft: '20px', color: 'var(--muted)' }}>
              <li>VPC Flow Logs habilitados</li>
              <li>No Security Groups abiertos</li>
              <li>NACLs como defense-in-depth</li>
              <li>VPC Endpoints para servicios AWS</li>
              <li>WAF en ALB/CloudFront</li>
            </ul>
          </div>
          <div className="info-card">
            <div className="card-header">
              <strong>Datos</strong>
            </div>
            <ul style={{ fontSize: '0.9rem', paddingLeft: '20px', color: 'var(--muted)' }}>
              <li>Encriptación at-rest (KMS)</li>
              <li>Encriptación in-transit (TLS 1.2+)</li>
              <li>S3 Block Public Access</li>
              <li>Backups encriptados</li>
              <li>Data classification tags</li>
            </ul>
          </div>
          <div className="info-card">
            <div className="card-header">
              <strong>Monitoreo</strong>
            </div>
            <ul style={{ fontSize: '0.9rem', paddingLeft: '20px', color: 'var(--muted)' }}>
              <li>CloudTrail en todas las regiones</li>
              <li>GuardDuty habilitado</li>
              <li>AWS Config para compliance</li>
              <li>Security Hub para agregación</li>
              <li>Alertas en logs críticos</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  )
}
