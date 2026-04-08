export interface Service {
  id: string;
  name: string;
  displayName: string;
  icon: string;
  status: "running" | "stopped" | "error" | "unknown";
  description: string;
  enabled: boolean;
  href?: string;
}

export interface LocalStackHealth {
  status: "healthy" | "unhealthy" | "unknown";
  endpoint: string;
  version?: string;
  lastChecked: Date;
  services: Service[];
}

export interface S3Bucket {
  name: string;
  creationDate: Date;
  region?: string;
}

export interface S3Object {
  key: string;
  size: number;
  lastModified: Date;
  eTag?: string;
  storageClass?: string;
}

export interface DynamoDBTable {
  tableName: string;
  tableStatus: "CREATING" | "ACTIVE" | "DELETING" | "UPDATING";
  creationDateTime: Date;
  itemCount: number;
  tableSizeBytes: number;
  tableArn?: string;
  keySchema?: Array<{
    attributeName: string;
    keyType: "HASH" | "RANGE";
  }>;
}

export interface SQSQueue {
  queueUrl: string;
  queueName: string;
  attributes?: {
    ApproximateNumberOfMessages?: string;
    ApproximateNumberOfMessagesNotVisible?: string;
    ApproximateNumberOfMessagesDelayed?: string;
    CreatedTimestamp?: string;
    LastModifiedTimestamp?: string;
    VisibilityTimeout?: string;
    MaximumMessageSize?: string;
    MessageRetentionPeriod?: string;
    DelaySeconds?: string;
    ReceiveMessageWaitTimeSeconds?: string;
  };
}

export interface SQSMessage {
  messageId: string;
  receiptHandle: string;
  body: string;
  attributes?: Record<string, string>;
  messageAttributes?: Record<string, any>;
}

export interface Secret {
  arn?: string;
  name: string;
  description?: string;
  createdDate?: Date;
  lastChangedDate?: Date;
  lastAccessedDate?: Date;
  tags?: Record<string, string>;
  versionId?: string;
  versionStages?: string[];
}

export interface SecretVersion {
  versionId: string;
  versionStages?: string[];
  createdDate?: Date;
  lastAccessedDate?: Date;
}

export interface SecretValue {
  arn?: string;
  name: string;
  versionId?: string;
  secretString?: string;
  secretBinary?: string;
  versionStages?: string[];
  createdDate?: Date;
}

export interface LambdaFunction {
  functionName: string;
  functionArn?: string;
  runtime?: string;
  role?: string;
  handler?: string;
  codeSize?: number;
  description?: string;
  timeout?: number;
  memorySize?: number;
  lastModified?: string;
  codeSha256?: string;
  version?: string;
  environment?: {
    variables?: Record<string, string>;
  };
  state?: "Pending" | "Active" | "Inactive" | "Failed";
  stateReason?: string;
  stateReasonCode?: string;
  vpcConfig?: {
    subnetIds?: string[];
    securityGroupIds?: string[];
    vpcId?: string;
  };
  layers?: Array<{
    arn?: string;
    codeSize?: number;
  }>;
  tags?: Record<string, string>;
}

export interface LambdaConfiguration {
  functionName: string;
  functionArn: string;
  runtime: string;
  role: string;
  handler: string;
  codeSize: number;
  description?: string;
  timeout: number;
  memorySize: number;
  lastModified: string;
  codeSha256: string;
  version: string;
  environment?: {
    variables?: Record<string, string>;
  };
  state?: string;
  stateReason?: string;
  vpcConfig?: any;
  layers?: any[];
  tags?: Record<string, string>;
}

// IAM Types
export interface IAMUser {
  userName: string;
  userId: string;
  arn: string;
  path: string;
  createDate: Date;
  passwordLastUsed?: Date;
  permissionsBoundary?: {
    permissionsBoundaryType?: string;
    permissionsBoundaryArn?: string;
  };
  tags?: Array<{
    key: string;
    value: string;
  }>;
}

export interface IAMRole {
  roleName: string;
  roleId: string;
  arn: string;
  path: string;
  createDate: Date;
  assumeRolePolicyDocument: string;
  description?: string;
  maxSessionDuration?: number;
  permissionsBoundary?: {
    permissionsBoundaryType?: string;
    permissionsBoundaryArn?: string;
  };
  tags?: Array<{
    key: string;
    value: string;
  }>;
}

export interface IAMPolicy {
  policyName: string;
  policyId: string;
  arn: string;
  path: string;
  defaultVersionId: string;
  attachmentCount?: number;
  permissionsBoundaryUsageCount?: number;
  isAttachable: boolean;
  description?: string;
  createDate: Date;
  updateDate: Date;
  tags?: Array<{
    key: string;
    value: string;
  }>;
}

export interface IAMPolicyVersion {
  document: string;
  versionId: string;
  isDefaultVersion: boolean;
  createDate: Date;
}

export interface IAMAccessKey {
  accessKeyId: string;
  secretAccessKey?: string; // Only shown once when created
  userName: string;
  status: "Active" | "Inactive";
  createDate: Date;
}

export interface IAMGroup {
  groupName: string;
  groupId: string;
  arn: string;
  path: string;
  createDate: Date;
}

export interface IAMAttachedPolicy {
  policyName: string;
  policyArn: string;
}

// CloudWatch Types
export interface CloudWatchLogGroup {
  logGroupName: string;
  creationTime?: number;
  retentionInDays?: number;
  metricFilterCount?: number;
  arn?: string;
  storedBytes?: number;
  kmsKeyId?: string;
  dataProtectionStatus?: string;
  inheritedProperties?: string[];
}

export interface CloudWatchLogStream {
  logStreamName: string;
  creationTime?: number;
  firstEventTimestamp?: number;
  lastEventTimestamp?: number;
  lastIngestionTime?: number;
  uploadSequenceToken?: string;
  arn?: string;
  storedBytes?: number;
}

export interface CloudWatchLogEvent {
  timestamp: number;
  message: string;
  ingestionTime?: number;
}

export interface CloudWatchMetric {
  namespace?: string;
  metricName?: string;
  dimensions?: CloudWatchDimension[];
  timestamp?: Date;
  value?: number;
  statisticValues?: {
    sampleCount: number;
    sum: number;
    minimum: number;
    maximum: number;
  };
  unit?: string;
  storageResolution?: number;
}

export interface CloudWatchDimension {
  name: string;
  value: string;
}

export interface CloudWatchAlarm {
  alarmName?: string;
  alarmArn?: string;
  alarmDescription?: string;
  alarmConfigurationUpdatedTimestamp?: Date;
  actionsEnabled?: boolean;
  okActions?: string[];
  alarmActions?: string[];
  insufficientDataActions?: string[];
  stateValue?: "OK" | "ALARM" | "INSUFFICIENT_DATA";
  stateReason?: string;
  stateReasonData?: string;
  stateUpdatedTimestamp?: Date;
  metricName?: string;
  namespace?: string;
  statistic?: string;
  extendedStatistic?: string;
  dimensions?: CloudWatchDimension[];
  period?: number;
  unit?: string;
  evaluationPeriods?: number;
  datapointsToAlarm?: number;
  threshold?: number;
  comparisonOperator?: string;
  treatMissingData?: string;
  evaluateLowSampleCountPercentile?: string;
  metrics?: any[];
  thresholdMetricId?: string;
  evaluationState?: string;
  stateTransitionedTimestamp?: Date;
}

export interface CloudWatchAlarmHistory {
  alarmName?: string;
  timestamp?: Date;
  historyItemType?: "ConfigurationUpdate" | "StateUpdate" | "Action";
  historySummary?: string;
  historyData?: string;
}

export interface MetricDataQuery {
  id: string;
  metricStat?: {
    metric: {
      namespace?: string;
      metricName?: string;
      dimensions?: CloudWatchDimension[];
    };
    period: number;
    stat: string;
    unit?: string;
  };
  expression?: string;
  label?: string;
  returnData?: boolean;
  period?: number;
}

export interface MetricDataResult {
  id?: string;
  label?: string;
  timestamps?: Date[];
  values?: number[];
  statusCode?: "Complete" | "InternalError" | "PartialData";
  messages?: string[];
}

// EventBridge Types
export interface EventBusInfo {
  name?: string;
  arn?: string;
  description?: string;
  kmsKeyId?: string;
  deadLetterConfig?: {
    arn?: string;
  };
  state?: "ACTIVE" | "CREATING" | "UPDATING" | "DELETING";
  creationTime?: Date;
  lastModifiedTime?: Date;
}

export interface EventRule {
  name?: string;
  arn?: string;
  eventPattern?: string;
  state?:
    | "ENABLED"
    | "DISABLED"
    | "ENABLED_WITH_ALL_CLOUDTRAIL_MANAGEMENT_EVENTS";
  description?: string;
  scheduleExpression?: string;
  roleArn?: string;
  managedBy?: string;
  eventBusName?: string;
  createdBy?: string;
}

export interface EventTarget {
  id: string;
  arn: string;
  roleArn?: string;
  input?: string;
  inputPath?: string;
  inputTransformer?: {
    inputPathsMap?: Record<string, string>;
    inputTemplate?: string;
  };
  kinesisParameters?: any;
  runCommandParameters?: any;
  ecsParameters?: any;
  batchParameters?: any;
  sqsParameters?: any;
  httpParameters?: any;
  redshiftDataParameters?: any;
  sageMakerPipelineParameters?: any;
  deadLetterConfig?: {
    arn?: string;
  };
  retryPolicy?: {
    maximumRetryAttempts?: number;
    maximumEventAge?: number;
  };
}

// EventBridge Scheduler Types
export interface ScheduleInfo {
  arn?: string;
  name?: string;
  groupName?: string;
  state?: "ENABLED" | "DISABLED";
  description?: string;
  scheduleExpression?: string;
  scheduleExpressionTimezone?: string;
  startDate?: Date;
  endDate?: Date;
  target?: ScheduleTarget;
  flexibleTimeWindow?: {
    mode: "OFF" | "FLEXIBLE";
    maximumWindowInMinutes?: number;
  };
  creationDate?: Date;
  lastModificationDate?: Date;
  kmsKeyArn?: string;
  actionAfterCompletion?: "NONE" | "DELETE";
}

export interface ScheduleTarget {
  arn: string;
  roleArn: string;
  input?: string;
  kinesisParameters?: any;
  eventBridgeParameters?: {
    detailType: string;
    source: string;
  };
  sqsParameters?: any;
  httpParameters?: any;
  retryPolicy?: {
    maximumEventAgeInSeconds?: number;
    maximumRetryAttempts?: number;
  };
  deadLetterConfig?: {
    arn?: string;
  };
}

export interface ScheduleGroup {
  arn?: string;
  name?: string;
  state?: "ACTIVE" | "DELETING";
  creationDate?: Date;
  lastModificationDate?: Date;
}

// CloudFormation Types
export interface CloudFormationStack {
  stackId?: string;
  stackName: string;
  changeSetId?: string;
  description?: string;
  parameters?: Array<{
    parameterKey?: string;
    parameterValue?: string;
    usePreviousValue?: boolean;
    resolvedValue?: string;
  }>;
  creationTime?: Date;
  deletionTime?: Date;
  lastUpdatedTime?: Date;
  rollbackConfiguration?: any;
  stackStatus:
    | "CREATE_IN_PROGRESS"
    | "CREATE_FAILED"
    | "CREATE_COMPLETE"
    | "ROLLBACK_IN_PROGRESS"
    | "ROLLBACK_FAILED"
    | "ROLLBACK_COMPLETE"
    | "DELETE_IN_PROGRESS"
    | "DELETE_FAILED"
    | "DELETE_COMPLETE"
    | "UPDATE_IN_PROGRESS"
    | "UPDATE_COMPLETE_CLEANUP_IN_PROGRESS"
    | "UPDATE_COMPLETE"
    | "UPDATE_FAILED"
    | "UPDATE_ROLLBACK_IN_PROGRESS"
    | "UPDATE_ROLLBACK_FAILED"
    | "UPDATE_ROLLBACK_COMPLETE_CLEANUP_IN_PROGRESS"
    | "UPDATE_ROLLBACK_COMPLETE"
    | "REVIEW_IN_PROGRESS"
    | "IMPORT_IN_PROGRESS"
    | "IMPORT_COMPLETE"
    | "IMPORT_ROLLBACK_IN_PROGRESS"
    | "IMPORT_ROLLBACK_FAILED"
    | "IMPORT_ROLLBACK_COMPLETE";
  stackStatusReason?: string;
  disableRollback?: boolean;
  notificationARNs?: string[];
  timeoutInMinutes?: number;
  capabilities?: Array<
    "CAPABILITY_IAM" | "CAPABILITY_NAMED_IAM" | "CAPABILITY_AUTO_EXPAND"
  >;
  outputs?: Array<{
    outputKey?: string;
    outputValue?: string;
    description?: string;
    exportName?: string;
  }>;
  roleARN?: string;
  tags?: Array<{
    key: string;
    value: string;
  }>;
  enableTerminationProtection?: boolean;
  parentId?: string;
  rootId?: string;
  driftInformation?: {
    stackDriftStatus: "DRIFTED" | "IN_SYNC" | "UNKNOWN" | "NOT_CHECKED";
    lastCheckTimestamp?: Date;
  };
  retainExceptOnCreate?: boolean;
}

export interface CloudFormationResource {
  stackName?: string;
  stackId?: string;
  logicalResourceId: string;
  physicalResourceId?: string;
  resourceType: string;
  timestamp: Date;
  resourceStatus:
    | "CREATE_IN_PROGRESS"
    | "CREATE_FAILED"
    | "CREATE_COMPLETE"
    | "DELETE_IN_PROGRESS"
    | "DELETE_FAILED"
    | "DELETE_COMPLETE"
    | "DELETE_SKIPPED"
    | "UPDATE_IN_PROGRESS"
    | "UPDATE_FAILED"
    | "UPDATE_COMPLETE"
    | "IMPORT_FAILED"
    | "IMPORT_COMPLETE"
    | "IMPORT_IN_PROGRESS"
    | "IMPORT_ROLLBACK_IN_PROGRESS"
    | "IMPORT_ROLLBACK_FAILED"
    | "IMPORT_ROLLBACK_COMPLETE"
    | "UPDATE_ROLLBACK_IN_PROGRESS"
    | "UPDATE_ROLLBACK_COMPLETE"
    | "UPDATE_ROLLBACK_FAILED"
    | "ROLLBACK_IN_PROGRESS"
    | "ROLLBACK_COMPLETE"
    | "ROLLBACK_FAILED";
  resourceStatusReason?: string;
  description?: string;
  metadata?: string;
  driftInformation?: {
    stackResourceDriftStatus:
      | "IN_SYNC"
      | "MODIFIED"
      | "DELETED"
      | "NOT_CHECKED";
    lastCheckTimestamp?: Date;
  };
  moduleInfo?: {
    typeHierarchy?: string;
    logicalIdHierarchy?: string;
  };
}

export interface CloudFormationEvent {
  stackId?: string;
  eventId: string;
  stackName: string;
  logicalResourceId?: string;
  physicalResourceId?: string;
  resourceType?: string;
  timestamp: Date;
  resourceStatus?: string;
  resourceStatusReason?: string;
  resourceProperties?: string;
  clientRequestToken?: string;
  hookType?: string;
  hookStatus?: string;
  hookStatusReason?: string;
  hookInvocationPoint?: string;
  hookFailureMode?: string;
}

// API Gateway Types
export interface RestApi {
  id?: string;
  name?: string;
  description?: string;
  createdDate?: Date;
  version?: string;
  warnings?: string[];
  binaryMediaTypes?: string[];
  minimumCompressionSize?: number;
  apiKeySource?: "HEADER" | "AUTHORIZER";
  endpointConfiguration?: {
    types?: Array<"REGIONAL" | "EDGE" | "PRIVATE">;
    vpcEndpointIds?: string[];
  };
  policy?: string;
  tags?: Record<string, string>;
  disableExecuteApiEndpoint?: boolean;
  rootResourceId?: string;
}

export interface ApiResource {
  id?: string;
  parentId?: string;
  pathPart?: string;
  path?: string;
  resourceMethods?: Record<string, ApiMethod>;
}

export interface ApiMethod {
  httpMethod?: string;
  authorizationType?: string;
  authorizerId?: string;
  apiKeyRequired?: boolean;
  requestValidatorId?: string;
  operationName?: string;
  requestParameters?: Record<string, boolean>;
  requestModels?: Record<string, string>;
  methodResponses?: Record<string, ApiMethodResponse>;
  methodIntegration?: ApiIntegration;
  authorizationScopes?: string[];
}

export interface ApiMethodResponse {
  statusCode?: string;
  responseParameters?: Record<string, boolean>;
  responseModels?: Record<string, string>;
}

export interface ApiIntegration {
  type?: "HTTP" | "AWS" | "MOCK" | "HTTP_PROXY" | "AWS_PROXY";
  httpMethod?: string;
  uri?: string;
  connectionType?: "INTERNET" | "VPC_LINK";
  connectionId?: string;
  credentials?: string;
  requestParameters?: Record<string, string>;
  requestTemplates?: Record<string, string>;
  passthroughBehavior?: string;
  contentHandling?: "CONVERT_TO_BINARY" | "CONVERT_TO_TEXT";
  timeoutInMillis?: number;
  cacheNamespace?: string;
  cacheKeyParameters?: string[];
  integrationResponses?: Record<string, ApiIntegrationResponse>;
  tlsConfig?: {
    insecureSkipVerification?: boolean;
  };
}

export interface ApiIntegrationResponse {
  statusCode?: string;
  selectionPattern?: string;
  responseParameters?: Record<string, string>;
  responseTemplates?: Record<string, string>;
  contentHandling?: "CONVERT_TO_BINARY" | "CONVERT_TO_TEXT";
}

export interface ApiDeployment {
  id?: string;
  description?: string;
  createdDate?: Date;
  apiSummary?: Record<string, Record<string, ApiMethodSummary>>;
  canarySettings?: {
    percentTraffic?: number;
    stageVariableOverrides?: Record<string, string>;
    useStageCache?: boolean;
  };
}

export interface ApiMethodSummary {
  authorizationType?: string;
  apiKeyRequired?: boolean;
}

export interface ApiStage {
  deploymentId?: string;
  clientCertificateId?: string;
  stageName?: string;
  description?: string;
  cacheClusterEnabled?: boolean;
  cacheClusterSize?: string;
  cacheClusterStatus?:
    | "CREATE_IN_PROGRESS"
    | "AVAILABLE"
    | "DELETE_IN_PROGRESS"
    | "NOT_AVAILABLE"
    | "FLUSH_IN_PROGRESS";
  methodSettings?: Record<string, ApiMethodSetting>;
  variables?: Record<string, string>;
  documentationVersion?: string;
  accessLogSettings?: {
    format?: string;
    destinationArn?: string;
  };
  canarySettings?: {
    percentTraffic?: number;
    deploymentId?: string;
    stageVariableOverrides?: Record<string, string>;
    useStageCache?: boolean;
  };
  tracingEnabled?: boolean;
  webAclArn?: string;
  tags?: Record<string, string>;
  createdDate?: Date;
  lastUpdatedDate?: Date;
}

export interface ApiMethodSetting {
  metricsEnabled?: boolean;
  loggingLevel?: string;
  dataTraceEnabled?: boolean;
  throttlingBurstLimit?: number;
  throttlingRateLimit?: number;
  cachingEnabled?: boolean;
  cacheTtlInSeconds?: number;
  cacheDataEncrypted?: boolean;
  requireAuthorizationForCacheControl?: boolean;
  unauthorizedCacheControlHeaderStrategy?:
    | "FAIL_WITH_403"
    | "SUCCEED_WITH_RESPONSE_HEADER"
    | "SUCCEED_WITHOUT_RESPONSE_HEADER";
}


// EC2 Types
export interface EC2Instance {
  instanceId: string;
  instanceType: string;
  state: "pending" | "running" | "shutting-down" | "terminated" | "stopping" | "stopped";
  stateName?: string;
  launchTime?: Date;
  publicIpAddress?: string;
  privateIpAddress?: string;
  publicDnsName?: string;
  privateDnsName?: string;
  vpcId?: string;
  subnetId?: string;
  imageId?: string;
  keyName?: string;
  securityGroups?: Array<{
    groupId: string;
    groupName: string;
  }>;
  tags?: Record<string, string>;
  platform?: "windows" | string;
  architecture?: string;
  hypervisor?: string;
  virtualizationType?: string;
  rootDeviceType?: string;
  rootDeviceName?: string;
  ebsOptimized?: boolean;
  enaSupport?: boolean;
}

// RDS Types
export interface RDSDBInstance {
  dbInstanceIdentifier: string;
  dbInstanceClass: string;
  engine: string;
  engineVersion?: string;
  dbInstanceStatus: string;
  masterUsername?: string;
  dbName?: string;
  allocatedStorage?: number;
  instanceCreateTime?: Date;
  availabilityZone?: string;
  vpcSecurityGroups?: Array<{
    vpcSecurityGroupId: string;
    status: string;
  }>;
  dbParameterGroups?: Array<{
    dbParameterGroupName: string;
    parameterApplyStatus: string;
  }>;
  endpoint?: {
    address?: string;
    port?: number;
    hostedZoneId?: string;
  };
  multiAZ?: boolean;
  storageType?: string;
  iops?: number;
  publiclyAccessible?: boolean;
  storageEncrypted?: boolean;
  kmsKeyId?: string;
  dbiResourceId?: string;
  tags?: Record<string, string>;
  copyTagsToSnapshot?: boolean;
  monitoringInterval?: number;
  monitoringRoleArn?: string;
  enabledCloudwatchLogsExports?: string[];
}