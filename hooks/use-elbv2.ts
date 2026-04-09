import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LoadBalancer, TargetGroup } from "@/types";
import { toast } from "sonner";

// Load Balancers
export function useLoadBalancers() {
  return useQuery({
    queryKey: ["load-balancers"],
    queryFn: async () => {
      const response = await fetch("/api/elbv2");
      if (!response.ok) throw new Error("Failed to fetch load balancers");
      return (await response.json()).loadBalancers as LoadBalancer[];
    },
  });
}

export function useCreateLoadBalancer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      name: string;
      type: "application" | "network";
      scheme?: "internet-facing" | "internal";
      subnetIds?: string[];
      securityGroupIds?: string[];
    }) => {
      const response = await fetch("/api/elbv2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create load balancer");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["load-balancers"] });
      toast.success("Load balancer created successfully");
    },
  });
}

export function useDeleteLoadBalancer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (arn: string) => {
      const response = await fetch(`/api/elbv2?arn=${encodeURIComponent(arn)}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete load balancer");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["load-balancers"] });
      toast.success("Load balancer deleted successfully");
    },
  });
}

// Target Groups
export function useTargetGroups() {
  return useQuery({
    queryKey: ["target-groups"],
    queryFn: async () => {
      const response = await fetch("/api/elbv2/target-groups");
      if (!response.ok) throw new Error("Failed to fetch target groups");
      return (await response.json()).targetGroups as TargetGroup[];
    },
  });
}

export function useCreateTargetGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      name: string;
      protocol: string;
      port: number;
      vpcId: string;
      targetType?: string;
    }) => {
      const response = await fetch("/api/elbv2/target-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create target group");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["target-groups"] });
      toast.success("Target group created successfully");
    },
  });
}
