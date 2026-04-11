export interface VPC {
  id: string;
  cidrBlock: string;
  name: string;
  state: 'available' | 'pending';
  isDefault: boolean;
  subnets: Subnet[];
  tags: Record<string, string>;
  dockerNetworkName: string;
}

export interface Subnet {
  id: string;
  vpcId: string;
  cidrBlock: string;
  availabilityZone: string;
  name: string;
  state: 'available' | 'pending';
  tags: Record<string, string>;
  mapPublicIpOnLaunch: boolean;
}

export interface SecurityGroup {
  id: string;
  vpcId: string;
  name: string;
  description: string;
  inboundRules: SecurityGroupRule[];
  outboundRules: SecurityGroupRule[];
  tags: Record<string, string>;
}

export interface SecurityGroupRule {
  protocol: 'tcp' | 'udp' | 'icmp' | 'all';
  fromPort: number;
  toPort: number;
  source: string; // IP CIDR or security group ID
  description?: string;
}

export interface RDSInstance {
  id: string;
  engine: 'postgresql' | 'mysql' | 'mariadb' | 'sqlserver';
  engineVersion: string;
  instanceClass: string;
  allocatedStorage: number;
  dbName: string;
  masterUsername: string;
  vpcId: string;
  subnetIds: string[];
  securityGroupIds: string[];
  publiclyAccessible: boolean;
  multiAZ: boolean;
  replicas: number;
  endpoint?: string;
  port: number;
  status: 'creating' | 'available' | 'modifying' | 'deleting';
  containerId?: string;
  volumeName?: string;
  tags: Record<string, string>;
}

export interface LoadBalancer {
  id: string;
  name: string;
  type: 'application' | 'network';
  scheme: 'internal' | 'internet-facing';
  vpcId: string;
  subnetIds: string[];
  securityGroupIds: string[];
  listeners: Listener[];
  targetGroups: TargetGroup[];
  dnsName?: string;
  state: 'active' | 'provisioning' | 'active_impaired' | 'failed';
  tags: Record<string, string>;
}

export interface Listener {
  port: number;
  protocol: 'HTTP' | 'HTTPS' | 'TCP' | 'TLS';
  targetGroupId: string;
  sslCertificate?: string;
}

export interface TargetGroup {
  id: string;
  name: string;
  protocol: 'HTTP' | 'HTTPS' | 'TCP' | 'TLS';
  port: number;
  vpcId: string;
  targetType: 'instance' | 'ip' | 'lambda';
  targets: Target[];
  healthCheck: HealthCheck;
}

export interface Target {
  id: string;
  port: number;
  state: 'healthy' | 'unhealthy' | 'unused';
}

export interface HealthCheck {
  protocol: 'HTTP' | 'HTTPS' | 'TCP';
  path: string;
  port: number | 'traffic-port';
  intervalSeconds: number;
  timeoutSeconds: number;
  healthyThresholdCount: number;
  unhealthyThresholdCount: number;
}
