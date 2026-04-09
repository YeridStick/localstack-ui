import { S3Client } from "@aws-sdk/client-s3";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { SQSClient } from "@aws-sdk/client-sqs";
import { SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import { LambdaClient } from "@aws-sdk/client-lambda";
import { IAMClient } from "@aws-sdk/client-iam";
import { CloudWatchClient } from "@aws-sdk/client-cloudwatch";
import { CloudWatchLogsClient } from "@aws-sdk/client-cloudwatch-logs";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { EventBridgeClient } from "@aws-sdk/client-eventbridge";
import { SchedulerClient } from "@aws-sdk/client-scheduler";
import { CloudFormationClient } from "@aws-sdk/client-cloudformation";
import { APIGatewayClient } from "@aws-sdk/client-api-gateway";
import { EC2Client } from "@aws-sdk/client-ec2";
import { RDSClient } from "@aws-sdk/client-rds";
import { ElasticLoadBalancingV2Client } from "@aws-sdk/client-elastic-load-balancing-v2";
import { ElastiCacheClient } from "@aws-sdk/client-elasticache";
import { ECSClient } from "@aws-sdk/client-ecs";
import { Route53Client } from "@aws-sdk/client-route-53";
import { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";
import { EFSClient } from "@aws-sdk/client-efs";

const config = {
  endpoint:
    process.env.NEXT_PUBLIC_LOCALSTACK_ENDPOINT || "http://localhost:4566",
  region: process.env.NEXT_PUBLIC_AWS_REGION || "ap-south-1",
  credentials: {
    accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID || "test",
    secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY || "test",
  },
  forcePathStyle: true, // Required for S3
};

export const s3Client = new S3Client(config);
export const dynamoClient = new DynamoDBClient(config);
export const dynamoDocClient = DynamoDBDocumentClient.from(dynamoClient);
export const sqsClient = new SQSClient(config);
export const secretsManagerClient = new SecretsManagerClient(config);
export const lambdaClient = new LambdaClient(config);
export const iamClient = new IAMClient(config);
export const cloudWatchClient = new CloudWatchClient(config);
export const cloudWatchLogsClient = new CloudWatchLogsClient(config);
export const eventBridgeClient = new EventBridgeClient(config);
export const schedulerClient = new SchedulerClient(config);
export const cloudFormationClient = new CloudFormationClient(config);
export const apiGatewayClient = new APIGatewayClient(config);
export const ec2Client = new EC2Client(config);
export const rdsClient = new RDSClient(config);
export const elbv2Client = new ElasticLoadBalancingV2Client(config);
export const elastiCacheClient = new ElastiCacheClient(config);
export const ecsClient = new ECSClient(config);
export const route53Client = new Route53Client(config);
export const cognitoClient = new CognitoIdentityProviderClient(config);
export const efsClient = new EFSClient(config);