export interface CloudFormationSnippetDoc {
  title: string;
  url: string;
}

export interface CloudFormationTemplateSnippet {
  id: string;
  title: string;
  level: "Basico" | "Intermedio";
  resourceType: string;
  description: string;
  officialDocs: CloudFormationSnippetDoc;
  relatedDocs: CloudFormationSnippetDoc[];
  keyPoints: string[];
  template: string;
}

export const CLOUDFORMATION_TEMPLATE_SNIPPETS: CloudFormationTemplateSnippet[] =
  [
    {
      id: "base-template",
      title: "Plantilla base recomendada",
      level: "Basico",
      resourceType: "General",
      description:
        "Estructura minima para iniciar una plantilla mantenible con parametros y salidas.",
      officialDocs: {
        title: "Template anatomy - AWS CloudFormation",
        url: "https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/template-anatomy.html",
      },
      relatedDocs: [
        {
          title: "Template formats (YAML/JSON)",
          url: "https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/template-formats.html",
        },
      ],
      keyPoints: [
        "Define Description clara para documentar objetivo.",
        "Empieza con Parameters para evitar hardcode en recursos.",
        "Usa Outputs para exponer IDs y nombres reutilizables.",
      ],
      template: `AWSTemplateFormatVersion: "2010-09-09"
Description: "Base para stack reutilizable"

Parameters:
  EnvironmentName:
    Type: String
    Description: "Ambiente de despliegue"
    AllowedValues:
      - dev
      - qa
      - prod

Resources: {}

Outputs:
  EnvironmentOutput:
    Description: "Ambiente seleccionado"
    Value: !Ref EnvironmentName`,
    },
    {
      id: "secure-s3",
      title: "S3 seguro por defecto",
      level: "Basico",
      resourceType: "AWS::S3::Bucket",
      description:
        "Bucket con cifrado, bloqueo de acceso publico y versionado habilitado.",
      officialDocs: {
        title: "AWS::S3::Bucket - CloudFormation Reference",
        url: "https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-s3-bucket.html",
      },
      relatedDocs: [
        {
          title: "S3 block public access",
          url: "https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-block-public-access.html",
        },
      ],
      keyPoints: [
        "Habilita BucketEncryption para proteger datos en reposo.",
        "PublicAccessBlockConfiguration evita exposicion accidental.",
        "VersioningConfiguration ayuda a recuperar cambios/borrados.",
      ],
      template: `AWSTemplateFormatVersion: "2010-09-09"
Description: "Bucket S3 con baseline de seguridad"

Resources:
  StudyBucket:
    Type: AWS::S3::Bucket
    Properties:
      VersioningConfiguration:
        Status: Enabled
      BucketEncryption:
        ServerSideEncryptionConfiguration:
          - ServerSideEncryptionByDefault:
              SSEAlgorithm: AES256
      PublicAccessBlockConfiguration:
        BlockPublicAcls: true
        BlockPublicPolicy: true
        IgnorePublicAcls: true
        RestrictPublicBuckets: true`,
    },
    {
      id: "lambda-role",
      title: "Lambda + IAM Role minimo",
      level: "Intermedio",
      resourceType: "AWS::Lambda::Function",
      description:
        "Funcion Lambda con rol de ejecucion basado en principio de minimo privilegio.",
      officialDocs: {
        title: "AWS::Lambda::Function - CloudFormation Reference",
        url: "https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-lambda-function.html",
      },
      relatedDocs: [
        {
          title: "AWS::IAM::Role - CloudFormation Reference",
          url: "https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-iam-role.html",
        },
        {
          title: "AWSLambdaBasicExecutionRole policy",
          url: "https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AWSLambdaBasicExecutionRole.html",
        },
      ],
      keyPoints: [
        "Separa el rol IAM de la funcion para gestionar permisos.",
        "Empieza con politica administrada basica de logs.",
        "Evoluciona permisos agregando solo acciones necesarias.",
      ],
      template: `AWSTemplateFormatVersion: "2010-09-09"
Description: "Lambda con rol IAM basico"

Resources:
  LambdaExecutionRole:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument:
        Version: "2012-10-17"
        Statement:
          - Effect: Allow
            Principal:
              Service:
                - lambda.amazonaws.com
            Action:
              - sts:AssumeRole
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

  StudyLambda:
    Type: AWS::Lambda::Function
    Properties:
      FunctionName: study-lambda
      Runtime: nodejs20.x
      Handler: index.handler
      Role: !GetAtt LambdaExecutionRole.Arn
      Timeout: 10
      Code:
        ZipFile: |
          exports.handler = async () => {
            return {
              statusCode: 200,
              body: "hello from cloudformation"
            };
          };`,
    },
    {
      id: "dynamodb-ondemand",
      title: "DynamoDB on-demand",
      level: "Basico",
      resourceType: "AWS::DynamoDB::Table",
      description:
        "Tabla DynamoDB con demanda bajo trafico variable, clave hash y TTL.",
      officialDocs: {
        title: "AWS::DynamoDB::Table - CloudFormation Reference",
        url: "https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-dynamodb-table.html",
      },
      relatedDocs: [
        {
          title: "TTL in DynamoDB",
          url: "https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/TTL.html",
        },
      ],
      keyPoints: [
        "BillingMode PAY_PER_REQUEST evita sobreaprovisionar capacidad.",
        "Define atributo ttl para limpiar datos temporales.",
        "Activa SSESpecification para cifrado en tabla.",
      ],
      template: `AWSTemplateFormatVersion: "2010-09-09"
Description: "Tabla DynamoDB on-demand"

Resources:
  StudyTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: study-items
      BillingMode: PAY_PER_REQUEST
      AttributeDefinitions:
        - AttributeName: pk
          AttributeType: S
      KeySchema:
        - AttributeName: pk
          KeyType: HASH
      TimeToLiveSpecification:
        AttributeName: ttl
        Enabled: true
      SSESpecification:
        SSEEnabled: true`,
    },
    {
      id: "vpc-foundation",
      title: "VPC base + subnet publica",
      level: "Intermedio",
      resourceType: "AWS::EC2::VPC",
      description:
        "Fundacion de red con VPC, subnet publica e Internet Gateway.",
      officialDocs: {
        title: "AWS::EC2::VPC - CloudFormation Reference",
        url: "https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-vpc.html",
      },
      relatedDocs: [
        {
          title: "VPC User Guide",
          url: "https://docs.aws.amazon.com/vpc/latest/userguide/what-is-amazon-vpc.html",
        },
        {
          title: "AWS::EC2::Subnet reference",
          url: "https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-subnet.html",
        },
      ],
      keyPoints: [
        "Separar networking en stack dedicado mejora reutilizacion.",
        "Asocia RouteTable con subnet para salida controlada.",
        "MapPublicIpOnLaunch facilita laboratorio en subnet publica.",
      ],
      template: `AWSTemplateFormatVersion: "2010-09-09"
Description: "VPC base con subnet publica"

Resources:
  MainVpc:
    Type: AWS::EC2::VPC
    Properties:
      CidrBlock: 10.20.0.0/16
      EnableDnsHostnames: true
      EnableDnsSupport: true

  PublicSubnetA:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref MainVpc
      CidrBlock: 10.20.1.0/24
      AvailabilityZone: us-east-1a
      MapPublicIpOnLaunch: true

  InternetGateway:
    Type: AWS::EC2::InternetGateway

  AttachGateway:
    Type: AWS::EC2::VPCGatewayAttachment
    Properties:
      VpcId: !Ref MainVpc
      InternetGatewayId: !Ref InternetGateway`,
    },
  ];

