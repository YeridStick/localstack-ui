import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { VPC, Subnet, SecurityGroup } from "@/types";
import { toast } from "sonner";

// CloudFormation
export interface CloudFormationStack {
  StackName: string;
  StackId: string;
  StackStatus: string;
  CreationTime: string;
  TemplateDescription?: string;
}

export function useCloudFormationStacks() {
  return useQuery({
    queryKey: ["cloudformation", "stacks"],
    queryFn: async () => {
      const response = await fetch("/api/cloudformation");
      if (!response.ok) throw new Error("Failed to fetch CloudFormation stacks");
      return (await response.json()) as { stacks: CloudFormationStack[]; total: number };
    },
  });
}

export function useCreateCloudFormationStack() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      stackName,
      templateBody,
      parameters,
      tags,
    }: {
      stackName: string;
      templateBody: string;
      parameters?: { ParameterKey: string; ParameterValue: string }[];
      tags?: { Key: string; Value: string }[];
    }) => {
      const response = await fetch("/api/cloudformation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stackName, templateBody, parameters, tags }),
      });
      if (!response.ok) throw new Error("Failed to create stack");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cloudformation", "stacks"] });
      toast.success("CloudFormation stack created successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create stack");
    },
  });
}

export function useDeleteCloudFormationStack() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (stackName: string) => {
      const response = await fetch(`/api/cloudformation?stackName=${stackName}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete stack");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cloudformation", "stacks"] });
      toast.success("CloudFormation stack deletion initiated");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete stack");
    },
  });
}

// Infrastructure Diagram Data
export interface InfrastructureNode {
  id: string;
  type: "vpc" | "ec2" | "rds" | "elb" | "s3" | "sqs" | "dynamodb";
  name: string;
  state?: string;
  status?: string;
  instanceType?: string;
  engine?: string;
  scheme?: string;
  privateIp?: string;
  publicIp?: string;
  endpoint?: string;
  cidrBlock?: string;
  vpcId?: string;
  dnsName?: string;
  queueUrl?: string;
  createdAt?: string;
  itemCount?: number;
  tableSizeBytes?: number;
}

export interface InfrastructureConnection {
  from: string;
  to: string;
  fromType: string;
  toType: string;
  containerId?: string;
  privateIp?: string;
}

export interface InfrastructureData {
  vpcs: InfrastructureNode[];
  ec2Instances: InfrastructureNode[];
  rdsInstances: InfrastructureNode[];
  loadBalancers: InfrastructureNode[];
  s3Buckets: InfrastructureNode[];
  sqsQueues: InfrastructureNode[];
  dynamoTables: InfrastructureNode[];
  connections: InfrastructureConnection[];
  summary: {
    totalVPCs: number;
    totalEC2: number;
    totalRDS: number;
    totalELB: number;
    totalS3: number;
    totalSQS: number;
    totalDynamoDB: number;
    totalConnections: number;
  };
}

export function useInfrastructure() {
  return useQuery({
    queryKey: ["infrastructure"],
    queryFn: async () => {
      const response = await fetch("/api/infrastructure");
      if (!response.ok) throw new Error("Failed to fetch infrastructure data");
      return (await response.json()) as InfrastructureData;
    },
  });
}

// VPC Resources (EC2 and RDS attached to VPC)
export interface VPCResource {
  id: string;
  name: string;
  type?: string;
  engine?: string;
  state?: string;
  status?: string;
  privateIp?: string;
  containerId: string;
}

export interface VPCResources {
  vpcId: string;
  networkName: string;
  ec2Instances: VPCResource[];
  rdsInstances: VPCResource[];
  totalResources: number;
}

export function useVPCResources(vpcId: string) {
  return useQuery({
    queryKey: ["vpc-resources", vpcId],
    queryFn: async () => {
      const response = await fetch(`/api/vpc/${vpcId}/resources`);
      if (!response.ok) throw new Error("Failed to fetch VPC resources");
      return (await response.json()) as VPCResources;
    },
    enabled: !!vpcId,
  });
}

// VPCs
export function useVPCs() {
  return useQuery({
    queryKey: ["vpcs"],
    queryFn: async () => {
      const response = await fetch("/api/vpc");
      if (!response.ok) throw new Error("Failed to fetch VPCs");
      return (await response.json()).vpcs as VPC[];
    },
  });
}

export function useCreateVPC() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ cidrBlock, name, tags }: { cidrBlock: string; name: string; tags?: Record<string, string> }) => {
      const response = await fetch("/api/vpc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cidrBlock, name, tags }),
      });
      if (!response.ok) throw new Error("Failed to create VPC");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vpcs"] });
      toast.success("VPC created successfully");
    },
  });
}

export function useDeleteVPC() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/vpc?id=${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete VPC");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vpcs"] });
      toast.success("VPC deleted successfully");
    },
  });
}

// Subnets
export function useSubnets(vpcId?: string) {
  return useQuery({
    queryKey: ["subnets", vpcId],
    queryFn: async () => {
      const params = vpcId ? `?vpcId=${vpcId}` : "";
      const response = await fetch(`/api/vpc/subnets${params}`);
      if (!response.ok) throw new Error("Failed to fetch subnets");
      return (await response.json()).subnets as Subnet[];
    },
    enabled: true,
  });
}

export function useCreateSubnet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { vpcId: string; cidrBlock: string; availabilityZone?: string }) => {
      const response = await fetch("/api/vpc/subnets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create subnet");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subnets"] });
      toast.success("Subnet created successfully");
    },
  });
}

// Security Groups
export function useSecurityGroups(vpcId?: string) {
  return useQuery({
    queryKey: ["security-groups", vpcId],
    queryFn: async () => {
      const params = vpcId ? `?vpcId=${vpcId}` : "";
      const response = await fetch(`/api/vpc/security-groups${params}`);
      if (!response.ok) throw new Error("Failed to fetch security groups");
      return (await response.json()).securityGroups as SecurityGroup[];
    },
  });
}

export function useCreateSecurityGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { groupName: string; description: string; vpcId: string }) => {
      const response = await fetch("/api/vpc/security-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create security group");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["security-groups"] });
      toast.success("Security group created successfully");
    },
  });
}
