export interface CloudFormationSnippetDoc {
  title: string;
  url: string;
}

export interface CloudFormationTemplateSnippet {
  id: string;
  title: string;
  level: "Basico" | "Intermedio" | "Avanzado";
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
    {
      id: "eks-managed-apigateway",
      title: "EKS administrado + API Gateway",
      level: "Avanzado",
      resourceType: "AWS::EKS::Cluster",
      description:
        "Plantilla base para estudiar un cluster EKS con NodeGroup administrado y frontdoor API Gateway.",
      officialDocs: {
        title: "AWS::EKS::Cluster - CloudFormation Reference",
        url: "https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-eks-cluster.html",
      },
      relatedDocs: [
        {
          title: "AWS::EKS::Nodegroup reference",
          url: "https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-eks-nodegroup.html",
        },
        {
          title: "AWS::ApiGateway::Method reference",
          url: "https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-apigateway-method.html",
        },
        {
          title: "EKS networking requirements",
          url: "https://docs.aws.amazon.com/eks/latest/userguide/network_reqs.html",
        },
      ],
      keyPoints: [
        "Separa IAM roles (cluster y nodos) para mantener minimo privilegio.",
        "NodeGroup administrado simplifica upgrades y ciclo de vida de workers.",
        "API Gateway puede actuar como borde publico para servicios internos del cluster.",
        "En emuladores locales, combina este template con el modulo EKS Lab para simular el runtime Kubernetes.",
      ],
      template: `AWSTemplateFormatVersion: "2010-09-09"
Description: "Base EKS + API Gateway"

Parameters:
  ClusterName:
    Type: String
    Default: study-eks
  KubernetesVersion:
    Type: String
    Default: "1.30"

Resources:
  EksClusterRole:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument:
        Version: "2012-10-17"
        Statement:
          - Effect: Allow
            Principal:
              Service:
                - eks.amazonaws.com
            Action:
              - sts:AssumeRole
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/AmazonEKSClusterPolicy

  EksNodeRole:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument:
        Version: "2012-10-17"
        Statement:
          - Effect: Allow
            Principal:
              Service:
                - ec2.amazonaws.com
            Action:
              - sts:AssumeRole
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy
        - arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly
        - arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy

  EksCluster:
    Type: AWS::EKS::Cluster
    Properties:
      Name: !Ref ClusterName
      Version: !Ref KubernetesVersion
      RoleArn: !GetAtt EksClusterRole.Arn
      ResourcesVpcConfig:
        SubnetIds:
          - subnet-aaaaaaaa
          - subnet-bbbbbbbb

  EksNodeGroup:
    Type: AWS::EKS::Nodegroup
    Properties:
      ClusterName: !Ref EksCluster
      NodegroupName: study-workers
      NodeRole: !GetAtt EksNodeRole.Arn
      Subnets:
        - subnet-aaaaaaaa
        - subnet-bbbbbbbb
      ScalingConfig:
        MinSize: 1
        DesiredSize: 2
        MaxSize: 4
      InstanceTypes:
        - t3.medium

  StudyApi:
    Type: AWS::ApiGateway::RestApi
    Properties:
      Name: eks-study-api

  StudyApiResource:
    Type: AWS::ApiGateway::Resource
    Properties:
      RestApiId: !Ref StudyApi
      ParentId: !GetAtt StudyApi.RootResourceId
      PathPart: study

  StudyApiMethod:
    Type: AWS::ApiGateway::Method
    Properties:
      RestApiId: !Ref StudyApi
      ResourceId: !Ref StudyApiResource
      HttpMethod: ANY
      AuthorizationType: NONE
      Integration:
        Type: HTTP_PROXY
        IntegrationHttpMethod: ANY
        Uri: "http://internal-lb-or-ingress"

Outputs:
  ClusterOut:
    Value: !Ref EksCluster
  ApiGatewayOut:
    Value: !Ref StudyApi`,
    },
    {
      id: "ec2-worker-autoscaling",
      title: "Auto Scaling Group para workers EC2",
      level: "Avanzado",
      resourceType: "AWS::AutoScaling::AutoScalingGroup",
      description:
        "Grupo de autoescalado para nodos worker, util para laboratorios de EKS self-managed.",
      officialDocs: {
        title:
          "AWS::AutoScaling::AutoScalingGroup - CloudFormation Reference",
        url: "https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-autoscaling-autoscalinggroup.html",
      },
      relatedDocs: [
        {
          title: "AWS::EC2::LaunchTemplate reference",
          url: "https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-launchtemplate.html",
        },
        {
          title: "Target tracking scaling policy",
          url: "https://docs.aws.amazon.com/autoscaling/ec2/userguide/as-scaling-target-tracking.html",
        },
      ],
      keyPoints: [
        "LaunchTemplate concentra AMI, tipo de instancia y bootstrap script.",
        "ASG define min/max/desired para balancear costo y disponibilidad.",
        "TargetTrackingScaling simplifica escalado automatico por metricas.",
      ],
      template: `AWSTemplateFormatVersion: "2010-09-09"
Description: "ASG para workers EC2"

Resources:
  WorkerLaunchTemplate:
    Type: AWS::EC2::LaunchTemplate
    Properties:
      LaunchTemplateData:
        ImageId: ami-0abcdef1234567890
        InstanceType: t3.medium
        UserData:
          Fn::Base64: |
            #!/bin/bash
            set -xe
            # bootstrap worker node (kubelet/container runtime)
            echo "worker bootstrap"

  WorkerAutoScalingGroup:
    Type: AWS::AutoScaling::AutoScalingGroup
    Properties:
      VPCZoneIdentifier:
        - subnet-aaaaaaaa
        - subnet-bbbbbbbb
      MinSize: "1"
      MaxSize: "6"
      DesiredCapacity: "2"
      LaunchTemplate:
        LaunchTemplateId: !Ref WorkerLaunchTemplate
        Version: !GetAtt WorkerLaunchTemplate.LatestVersionNumber

  WorkerCpuPolicy:
    Type: AWS::AutoScaling::ScalingPolicy
    Properties:
      AutoScalingGroupName: !Ref WorkerAutoScalingGroup
      PolicyType: TargetTrackingScaling
      TargetTrackingConfiguration:
        PredefinedMetricSpecification:
          PredefinedMetricType: ASGAverageCPUUtilization
        TargetValue: 60.0`,
    },
  ];
