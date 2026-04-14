"use client";

import { useInfrastructure } from "@/hooks/use-vpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Network, 
  Server, 
  Database, 
  Globe, 
  ArrowRight,
  Activity,
  Boxes
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function InfrastructureDiagram() {
  const { data, isLoading } = useInfrastructure();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Activity className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No infrastructure data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard
          title="VPCs"
          value={data.summary.totalVPCs}
          icon={Network}
          color="bg-blue-500"
        />
        <SummaryCard
          title="EC2 Instances"
          value={data.summary.totalEC2}
          icon={Server}
          color="bg-orange-500"
        />
        <SummaryCard
          title="RDS Databases"
          value={data.summary.totalRDS}
          icon={Database}
          color="bg-purple-500"
        />
        <SummaryCard
          title="Load Balancers"
          value={data.summary.totalELB}
          icon={Globe}
          color="bg-green-500"
        />
      </div>

      {/* VPC Diagrams */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Boxes className="h-5 w-5" />
          VPC Architecture
        </h3>
        
        {data.vpcs.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              No VPCs found. Create a VPC to see the architecture diagram.
            </CardContent>
          </Card>
        ) : (
          data.vpcs.map((vpc) => (
            <VPCCard
              key={vpc.id}
              vpc={vpc}
              ec2Instances={data.ec2Instances.filter(i => i.vpcId === vpc.id)}
              rdsInstances={data.rdsInstances.filter(i => i.vpcId === vpc.id)}
              loadBalancers={data.loadBalancers.filter(lb => lb.vpcId === vpc.id)}
              connections={data.connections.filter(c => c.from === vpc.id)}
            />
          ))
        )}
      </div>

      {/* Unattached Resources */}
      {data.ec2Instances.some(i => !i.vpcId) && (
        <UnattachedResourcesCard
          title="Unattached EC2 Instances"
          type="ec2"
          resources={data.ec2Instances.filter(i => !i.vpcId)}
        />
      )}
      
      {data.rdsInstances.some(i => !i.vpcId) && (
        <UnattachedResourcesCard
          title="Unattached RDS Instances"
          type="rds"
          resources={data.rdsInstances.filter(i => !i.vpcId)}
        />
      )}
    </div>
  );
}

interface SummaryCardProps {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

function SummaryCard({ title, value, icon: Icon, color }: SummaryCardProps) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-4">
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

interface VPCCardProps {
  vpc: any;
  ec2Instances: any[];
  rdsInstances: any[];
  loadBalancers: any[];
  connections: any[];
}

function VPCCard({ vpc, ec2Instances, rdsInstances, loadBalancers, connections }: VPCCardProps) {
  return (
    <Card className="border-2 border-blue-200 dark:border-blue-900">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <Network className="h-5 w-5 text-blue-500" />
            <span className="font-mono">{vpc.id}</span>
            <Badge variant="outline" className="font-mono text-xs">
              {vpc.cidrBlock}
            </Badge>
          </div>
          <span className="text-sm text-muted-foreground">{vpc.name}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* EC2 Column */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2 text-orange-600">
              <Server className="h-4 w-4" />
              EC2 Instances ({ec2Instances.length})
            </h4>
            {ec2Instances.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No EC2 instances</p>
            ) : (
              <div className="space-y-2">
                {ec2Instances.map((instance) => (
                  <ResourceNode
                    key={instance.id}
                    type="ec2"
                    resource={instance}
                    connections={connections.filter(c => c.to === instance.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* RDS Column */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2 text-purple-600">
              <Database className="h-4 w-4" />
              RDS Databases ({rdsInstances.length})
            </h4>
            {rdsInstances.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No RDS databases</p>
            ) : (
              <div className="space-y-2">
                {rdsInstances.map((instance) => (
                  <ResourceNode
                    key={instance.id}
                    type="rds"
                    resource={instance}
                    connections={connections.filter(c => c.to === instance.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Load Balancer Column */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2 text-green-600">
              <Globe className="h-4 w-4" />
              Load Balancers ({loadBalancers.length})
            </h4>
            {loadBalancers.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No load balancers</p>
            ) : (
              <div className="space-y-2">
                {loadBalancers.map((lb) => (
                  <ResourceNode
                    key={lb.id}
                    type="elb"
                    resource={lb}
                    connections={[]}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface ResourceNodeProps {
  type: "ec2" | "rds" | "elb";
  resource: any;
  connections: any[];
}

function ResourceNode({ type, resource, connections }: ResourceNodeProps) {
  const isEC2 = type === "ec2";
  const isRDS = type === "rds";
  const Icon = isEC2 ? Server : isRDS ? Database : Globe;
  
  const state = resource.state || resource.status;
  const isRunning = state === "running" || state === "available";

  return (
    <div className="flex items-start gap-2 p-2 rounded-lg border bg-muted/50">
      <Icon className={`h-4 w-4 mt-0.5 ${isRunning ? "text-green-500" : "text-yellow-500"}`} />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium truncate font-mono">{resource.id}</p>
        <p className="text-xs text-muted-foreground truncate">{resource.name}</p>
        <div className="flex items-center gap-1 mt-1">
          <div className={`h-1.5 w-1.5 rounded-full ${isRunning ? "bg-green-500" : "bg-yellow-500"}`} />
          <span className="text-xs capitalize">{state}</span>
        </div>
        {resource.privateIp && (
          <p className="text-xs text-muted-foreground mt-1">
            IP: {resource.privateIp}
          </p>
        )}
        {connections.length > 0 && (
          <div className="mt-1 flex items-center gap-1 text-xs text-blue-500">
            <ArrowRight className="h-3 w-3" />
            <span className="truncate">{connections.length} connection(s)</span>
          </div>
        )}
      </div>
    </div>
  );
}

interface UnattachedResourcesCardProps {
  title: string;
  type: "ec2" | "rds";
  resources: any[];
}

function UnattachedResourcesCard({ title, type, resources }: UnattachedResourcesCardProps) {
  const Icon = type === "ec2" ? Server : Database;
  
  return (
    <Card className="border-yellow-200 dark:border-yellow-900">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Icon className="h-4 w-4 text-yellow-500" />
          {title} ({resources.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {resources.map((resource) => (
            <ResourceNode
              key={resource.id}
              type={type}
              resource={resource}
              connections={[]}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
