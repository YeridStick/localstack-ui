import { Service } from "@/types";

export const AVAILABLE_SERVICES: Service[] = [
  {
    id: "s3",
    name: "s3",
    displayName: "S3",
    icon: "Package", // Changed from Database to Package for storage buckets
    status: "unknown",
    description: "Simple Storage Service - Object storage",
    enabled: true,
    href: "/services/s3",
  },
  {
    id: "sqs",
    name: "sqs",
    displayName: "SQS",
    icon: "MessageSquare", // Already unique
    status: "unknown",
    description: "Simple Queue Service - Message queuing",
    enabled: true,
    href: "/services/sqs",
  },
  {
    id: "secretsmanager",
    name: "secretsmanager",
    displayName: "Secrets Manager",
    icon: "Key", // Already unique
    status: "unknown",
    description: "Secrets management service",
    enabled: true,
    href: "/services/secretsmanager",
  },
  {
    id: "cloudwatch",
    name: "cloudwatch",
    displayName: "CloudWatch",
    icon: "Activity", // Already unique
    status: "unknown",
    description: "Monitoring and observability",
    enabled: true,
    href: "/services/cloudwatch",
  },
  {
    id: "eventbridge",
    name: "eventbridge",
    displayName: "EventBridge",
    icon: "Workflow", // Changed from Calendar to Workflow for event routing
    status: "unknown",
    description: "Event bus service",
    enabled: true,
    href: "/services/eventbridge",
  },
  {
    id: "scheduler",
    name: "scheduler",
    displayName: "EventBridge Scheduler",
    icon: "Clock", // Already unique
    status: "unknown",
    description: "Scheduled task service",
    enabled: true,
    href: "/services/scheduler",
  },
  {
    id: "logs",
    name: "logs",
    displayName: "CloudWatch Logs",
    icon: "FileText", // Already unique
    status: "unknown",
    description: "Log management service",
    enabled: true,
    href: "/services/logs",
  },
  {
    id: "cloudformation",
    name: "cloudformation",
    displayName: "CloudFormation",
    icon: "Layers", // Already unique
    status: "unknown",
    description: "Infrastructure as Code",
    enabled: true,
    href: "/services/cloudformation",
  },
  {
    id: "apigateway",
    name: "apigateway",
    displayName: "API Gateway",
    icon: "Globe", // Already unique
    status: "unknown",
    description: "API management service",
    enabled: true,
    href: "/services/apigateway",
  },
  {
    id: "iam",
    name: "iam",
    displayName: "IAM",
    icon: "Shield", // Already unique
    status: "unknown",
    description: "Identity and Access Management",
    enabled: true,
    href: "/services/iam",
  },
  {
    id: "lambda",
    name: "lambda",
    displayName: "Lambda",
    icon: "Zap", // Already unique
    status: "unknown",
    description: "Serverless compute service",
    enabled: true,
    href: "/services/lambda",
  },
  {
    id: "ec2",
    name: "ec2",
    displayName: "EC2",
    icon: "Server",
    status: "unknown",
    description: "Elastic Compute Cloud - Virtual servers",
    enabled: true,
    href: "/services/ec2",
  },
  {
    id: "rds",
    name: "rds",
    displayName: "RDS",
    icon: "Database",
    status: "unknown",
    description: "Relational Database Service",
    enabled: true,
    href: "/services/rds",
  },
];
