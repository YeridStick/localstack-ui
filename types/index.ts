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
  backend?: "ministack" | "localstack" | "unknown";
  healthPath?: string;
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

// VPC Types
export interface VPC {
  vpcId: string;
  id?: string;
  name?: string;
  cidrBlock: string;
  state: "pending" | "available";
  instanceTenancy?: "default" | "dedicated" | "host";
  isDefault?: boolean;
  dockerNetworkName?: string;
  tags?: Record<string, string>;
}

export interface Subnet {
  subnetId: string;
  vpcId: string;
  cidrBlock: string;
  availabilityZone?: string;
  availabilityZoneId?: string;
  availableIpAddressCount?: number;
  state?: "pending" | "available";
  mapPublicIpOnLaunch?: boolean;
  mapCustomerOwnedIpOnLaunch?: boolean;
  defaultForAz?: boolean;
  tags?: Record<string, string>;
}

export interface SecurityGroup {
  groupId: string;
  groupName: string;
  description?: string;
  vpcId?: string;
  ownerId?: string;
  tags?: Record<string, string>;
  ipPermissions?: SecurityGroupRule[];
  ipPermissionsEgress?: SecurityGroupRule[];
}

export interface SecurityGroupRule {
  ipProtocol: string;
  fromPort?: number;
  toPort?: number;
  userIdGroupPairs?: Array<{
    groupId?: string;
    groupName?: string;
    userId?: string;
    vpcId?: string;
    vpcPeeringConnectionId?: string;
  }>;
  ipRanges?: Array<{ cidrIp?: string; description?: string }>;
  ipv6Ranges?: Array<{ cidrIpv6?: string; description?: string }>;
  prefixListIds?: Array<{ prefixListId?: string; description?: string }>;
  description?: string;
}

export interface InternetGateway {
  internetGatewayId: string;
  attachments?: Array<{
    vpcId?: string;
    state?: "attaching" | "attached" | "detaching" | "detached";
  }>;
  tags?: Record<string, string>;
}

export interface RouteTable {
  routeTableId: string;
  vpcId: string;
  routes?: Route[];
  associations?: RouteTableAssociation[];
  tags?: Record<string, string>;
  propagatingVgws?: string[];
}

export interface Route {
  destinationCidrBlock?: string;
  destinationIpv6CidrBlock?: string;
  destinationPrefixListId?: string;
  gatewayId?: string;
  instanceId?: string;
  natGatewayId?: string;
  transitGatewayId?: string;
  networkInterfaceId?: string;
  origin?: "CreateRouteTable" | "CreateRoute" | "EnableVgwRoutePropagation";
  state?: "active" | "blackhole";
}

export interface RouteTableAssociation {
  routeTableAssociationId?: string;
  routeTableId?: string;
  subnetId?: string;
  main?: boolean;
  associationState?: {
    state?: "associating" | "associated" | "disassociating" | "disassociated" | "failed";
    statusMessage?: string;
  };
}

export interface NATGateway {
  natGatewayId: string;
  subnetId: string;
  vpcId: string;
  state?: "pending" | "failed" | "available" | "deleting" | "deleted";
  natGatewayAddresses?: Array<{
    allocationId?: string;
    networkInterfaceId?: string;
    privateIp?: string;
    publicIp?: string;
  }>;
  createTime?: Date;
  deleteTime?: Date;
  tags?: Record<string, string>;
}

// Load Balancer Types (ELBv2)
export interface LoadBalancer {
  loadBalancerArn?: string;
  loadBalancerName: string;
  dnsName?: string;
  canonicalHostedZoneId?: string;
  createdTime?: Date;
  loadBalancerType?: "application" | "network" | "gateway";
  scheme?: "internet-facing" | "internal";
  vpcId?: string;
  state?: {
    code?: "active" | "provisioning" | "active_impaired" | "failed";
    reason?: string;
  };
  availabilityZones?: Array<{
    zoneName?: string;
    subnetId?: string;
    loadBalancerAddresses?: Array<{
      ipAddress?: string;
      allocationId?: string;
      ipv6Address?: string;
    }>;
  }>;
  securityGroups?: string[];
  ipAddressType?: "ipv4" | "dualstack" | "dualstack-without-public-ipv4";
  tags?: Record<string, string>;
}

export interface TargetGroup {
  targetGroupArn?: string;
  targetGroupName: string;
  protocol?: "HTTP" | "HTTPS" | "TCP" | "TLS" | "UDP" | "TCP_UDP" | "GENEVE";
  port?: number;
  vpcId?: string;
  healthCheckProtocol?: string;
  healthCheckPort?: string;
  healthCheckEnabled?: boolean;
  healthCheckIntervalSeconds?: number;
  healthCheckTimeoutSeconds?: number;
  healthyThresholdCount?: number;
  unhealthyThresholdCount?: number;
  targetType?: "instance" | "ip" | "lambda" | "alb";
  tags?: Record<string, string>;
}

export interface Listener {
  listenerArn?: string;
  loadBalancerArn?: string;
  port: number;
  protocol?: "HTTP" | "HTTPS" | "TCP" | "TLS" | "UDP" | "TCP_UDP";
  certificates?: Array<{ certificateArn?: string; isDefault?: boolean }>;
  sslPolicy?: string;
  defaultActions?: ListenerAction[];
}

export interface ListenerAction {
  type: "forward" | "authenticate-oidc" | "authenticate-cognito" | "redirect" | "fixed-response";
  targetGroupArn?: string;
  redirectConfig?: any;
  fixedResponseConfig?: any;
  authenticateOidcConfig?: any;
  authenticateCognitoConfig?: any;
  forwardConfig?: any;
}

// ElastiCache Types
export interface ElastiCacheCluster {
  cacheClusterId: string;
  cacheNodeType?: string;
  engine?: "redis" | "memcached";
  engineVersion?: string;
  cacheClusterStatus?: string;
  numCacheNodes?: number;
  preferredAvailabilityZone?: string;
  cacheClusterCreateTime?: Date;
  preferredMaintenanceWindow?: string;
  pendingModifiedValues?: any;
  notificationConfiguration?: any;
  cacheSecurityGroups?: string[];
  cacheParameterGroup?: any;
  cacheSubnetGroupName?: string;
  cacheNodes?: Array<{
    cacheNodeId?: string;
    cacheNodeStatus?: string;
    cacheNodeCreateTime?: Date;
    endpoint?: { address?: string; port?: number };
    parameterGroupStatus?: string;
  }>;
  autoMinorVersionUpgrade?: boolean;
  securityGroups?: Array<{ securityGroupId?: string; status?: string }>;
  replicationGroupId?: string;
  snapshotRetentionLimit?: number;
  snapshotWindow?: string;
  authTokenEnabled?: boolean;
  transitEncryptionEnabled?: boolean;
  atRestEncryptionEnabled?: boolean;
  arn?: string;
}

// ECS Types
export interface ECSCluster {
  clusterArn?: string;
  clusterName: string;
  status?: string;
  registeredContainerInstancesCount?: number;
  runningTasksCount?: number;
  pendingTasksCount?: number;
  activeServicesCount?: number;
  statistics?: Array<{ name?: string; value?: string }>;
  tags?: Record<string, string>;
  settings?: any[];
  capacityProviders?: string[];
  defaultCapacityProviderStrategy?: any[];
  attachments?: any[];
  attachmentsStatus?: string;
}

export interface ECSService {
  serviceArn?: string;
  serviceName: string;
  clusterArn?: string;
  status?: string;
  desiredCount?: number;
  runningCount?: number;
  pendingCount?: number;
  launchType?: "EC2" | "FARGATE" | "EXTERNAL";
  capacityProviderStrategy?: any[];
  platformVersion?: string;
  taskDefinition?: string;
  deploymentConfiguration?: any;
  deployments?: any[];
  roleArn?: string;
  events?: any[];
  createdAt?: Date;
  placementConstraints?: any[];
  placementStrategy?: any[];
  networkConfiguration?: any;
  healthCheckGracePeriodSeconds?: number;
  schedulingStrategy?: "REPLICA" | "DAEMON";
  deploymentController?: any;
  tags?: Record<string, string>;
  propagateTags?: string;
  enableECSManagedTags?: boolean;
  pendingDeletePendingCount?: number;
}

export interface ECSTask {
  taskArn?: string;
  clusterArn?: string;
  taskDefinitionArn?: string;
  containerInstanceArn?: string;
  overrides?: any;
  lastStatus?: string;
  desiredStatus?: string;
  cpu?: string;
  memory?: string;
  containers?: any[];
  startedAt?: Date;
  stoppedAt?: Date;
  startedBy?: string;
  stoppedReason?: string;
  createdAt?: Date;
  launchType?: "EC2" | "FARGATE" | "EXTERNAL";
  platformVersion?: string;
  attachments?: any[];
  healthStatus?: string;
  tags?: Record<string, string>;
  ephemeralStorage?: any;
}

// Route53 Types
export interface Route53HostedZone {
  id: string;
  name: string;
  callerReference?: string;
  config?: {
    comment?: string;
    privateZone?: boolean;
  };
  resourceRecordSetCount?: number;
  linkedService?: {
    servicePrincipal?: string;
    description?: string;
  };
}

export interface Route53RecordSet {
  name: string;
  type: "A" | "AAAA" | "CNAME" | "MX" | "NS" | "PTR" | "SOA" | "SPF" | "SRV" | "TXT" | "CAA" | "DS";
  setIdentifier?: string;
  weight?: number;
  region?: string;
  geoLocation?: any;
  failover?: string;
  multiValueAnswer?: boolean;
  ttl?: number;
  resourceRecords?: Array<{ value?: string }>;
  aliasTarget?: {
    hostedZoneId?: string;
    dnsName?: string;
    evaluateTargetHealth?: boolean;
  };
  healthCheckId?: string;
  trafficPolicyInstanceId?: string;
}

// Cognito Types
export interface CognitoUserPool {
  id: string;
  name: string;
  status?: string;
  lambdaConfig?: any;
  lastModifiedDate?: Date;
  creationDate?: Date;
  schemaAttributes?: any[];
  autoVerifiedAttributes?: string[];
  mfaConfiguration?: "OFF" | "ON" | "OPTIONAL";
  estimatedNumberOfUsers?: number;
  smsConfiguration?: any;
  emailConfiguration?: any;
  policies?: any;
  adminCreateUserConfig?: any;
  userPoolAddOns?: any;
  accountRecoverySetting?: any;
}

export interface CognitoUserPoolClient {
  clientId: string;
  clientName?: string;
  userPoolId?: string;
  clientSecret?: string;
  lastModifiedDate?: Date;
  creationDate?: Date;
  refreshTokenValidity?: number;
  accessTokenValidity?: number;
  idTokenValidity?: number;
  tokenValidityUnits?: any;
  readAttributes?: string[];
  writeAttributes?: string[];
  explicitAuthFlows?: string[];
  supportedIdentityProviders?: string[];
  callbackURLs?: string[];
  logoutURLs?: string[];
  defaultRedirectURI?: string;
  allowedOAuthFlows?: string[];
  allowedOAuthScopes?: string[];
  allowedOAuthFlowsUserPoolClient?: boolean;
  analyticsConfiguration?: any;
  preventUserExistenceErrors?: string;
  enableTokenRevocation?: boolean;
  enablePropagateAdditionalUserContextData?: boolean;
  authSessionValidity?: number;
}

// EFS Types
export interface EFSFileSystem {
  fileSystemId: string;
  creationToken?: string;
  ownerId?: string;
  creationTime?: Date;
  lifeCycleState?: "creating" | "available" | "updating" | "deleting" | "deleted";
  name?: string;
  numberOfMountTargets?: number;
  sizeInBytes?: {
    value?: number;
    timestamp?: Date;
    valueInIA?: number;
    valueInStandard?: number;
  };
  performanceMode?: "generalPurpose" | "maxIO";
  encrypted?: boolean;
  kmsKeyId?: string;
  throughputMode?: "bursting" | "provisioned" | "elastic";
  provisionedThroughputInMibps?: number;
  availabilityZoneId?: string;
  availabilityZoneName?: string;
  tags?: Record<string, string>;
}

export interface EFSMountTarget {
  mountTargetId: string;
  fileSystemId: string;
  subnetId: string;
  ipAddress?: string;
  ownerId?: string;
  lifeCycleState?: "creating" | "available" | "updating" | "deleting" | "deleted" | "error";
  networkInterfaceId?: string;
  availabilityZoneId?: string;
  availabilityZoneName?: string;
  vpcId?: string;
}
