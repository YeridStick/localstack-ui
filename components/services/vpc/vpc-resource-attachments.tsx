"use client";

import { useState } from "react";
import { useVPCResources } from "@/hooks/use-vpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Server, Database, Network, Container, Computer } from "lucide-react";

interface VPCResourceAttachmentsProps {
  vpcId: string;
}

export function VPCResourceAttachments({ vpcId }: VPCResourceAttachmentsProps) {
  const { data, isLoading } = useVPCResources(vpcId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-32 bg-muted rounded-lg animate-pulse" />
      </div>
    );
  }

  if (!data || data.totalResources === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          <Network className="mx-auto h-12 w-12 mb-4 text-muted" />
          <p>No resources attached to this VPC</p>
          <p className="text-sm mt-2">
            Move EC2 or RDS instances to this VPC to see them here
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Network className="h-5 w-5" />
          Attached Resources
          <Badge variant="secondary" className="ml-2">
            {data.totalResources}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="all">
              All ({data.totalResources})
            </TabsTrigger>
            <TabsTrigger value="ec2">
              EC2 ({data.ec2Instances.length})
            </TabsTrigger>
            <TabsTrigger value="rds">
              RDS ({data.rdsInstances.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-3">
            {data.ec2Instances.map((instance) => (
              <ResourceCard
                key={instance.id}
                type="ec2"
                resource={instance}
              />
            ))}
            {data.rdsInstances.map((instance) => (
              <ResourceCard
                key={instance.id}
                type="rds"
                resource={instance}
              />
            ))}
          </TabsContent>

          <TabsContent value="ec2" className="space-y-3">
            {data.ec2Instances.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No EC2 instances attached to this VPC
              </p>
            ) : (
              data.ec2Instances.map((instance) => (
                <ResourceCard
                  key={instance.id}
                  type="ec2"
                  resource={instance}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="rds" className="space-y-3">
            {data.rdsInstances.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No RDS instances attached to this VPC
              </p>
            ) : (
              data.rdsInstances.map((instance) => (
                <ResourceCard
                  key={instance.id}
                  type="rds"
                  resource={instance}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

interface ResourceCardProps {
  type: "ec2" | "rds";
  resource: {
    id: string;
    name: string;
    type?: string;
    engine?: string;
    state?: string;
    status?: string;
    privateIp?: string;
    containerId: string;
  };
}

function ResourceCard({ type, resource }: ResourceCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const isEC2 = type === "ec2";
  const Icon = isEC2 ? Server : Database;
  const state = isEC2 ? resource.state : resource.status;
  const typeLabel = isEC2 ? resource.type : resource.engine;

  return (
    <div
      className="border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer"
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <div className="flex items-start gap-4">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-medium text-sm truncate">{resource.id}</h4>
            <Badge
              variant={
                state === "running" || state === "available"
                  ? "default"
                  : "secondary"
              }
              className="text-xs"
            >
              {state}
            </Badge>
            {typeLabel && (
              <Badge variant="outline" className="text-xs">
                {typeLabel}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {resource.name}
          </p>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t space-y-2 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-muted-foreground">Container ID:</span>
              <code className="ml-2 bg-muted px-1 rounded">
                {resource.containerId}
              </code>
            </div>
            {resource.privateIp && (
              <div>
                <span className="text-muted-foreground">Private IP:</span>
                <code className="ml-2 bg-muted px-1 rounded">
                  {resource.privateIp}
                </code>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Container className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground text-xs">
              Connected to VPC network
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
