import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { VPC, Subnet, SecurityGroup } from "@/types";
import { toast } from "sonner";

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
