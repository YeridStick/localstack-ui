export interface RDSInstance {
  id: string;
  engine: 'postgresql' | 'mysql' | 'mariadb' | 'sqlserver';
  engineVersion: string;
  instanceClass: string;
  allocatedStorage: number;
  dbName: string;
  masterUsername: string;
  masterUserPassword: string;
  vpcId: string;
  subnetIds?: string[];
  securityGroupIds?: string[];
  publiclyAccessible: boolean;
  multiAZ: boolean;
  replicas: number;
  endpoint?: string;
  port: number;
  status: 'creating' | 'available' | 'modifying' | 'deleting';
  containerId?: string;
  volumeName?: string;
  tags?: Record<string, string>;
  createdAt: string;
}

export interface CreateRDSInput {
  engine: 'postgresql' | 'mysql' | 'mariadb';
  dbName: string;
  masterUsername: string;
  masterUserPassword: string;
  vpcId: string;
  allocatedStorage?: number;
  instanceClass?: string;
  publiclyAccessible?: boolean;
  tags?: Record<string, string>;
}
