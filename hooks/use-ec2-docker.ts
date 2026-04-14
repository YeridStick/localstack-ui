import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

export interface DockerInstance {
  instanceId: string;
  containerId: string;
  instanceType: string;
  state: string;
  image: string;
  imageId?: string;
  name: string;
  status: string;
  publicIpAddress?: string;
  privateIp?: string;
  publicIp?: string;
  vpcId?: string;
  subnetId?: string;
  availabilityZone?: string;
  launchTime?: string;
}

// List EC2 instances from miniStack (manual refresh only)
export function useDockerInstances() {
  return useQuery({
    queryKey: ["ec2-instances"],
    queryFn: async () => {
      const response = await fetch("/api/ec2/instances");
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch instances");
      }
      const data = await response.json();
      return (data.instances || []) as DockerInstance[];
    },
    // No auto-refresh - only manual refresh via queryClient.invalidateQueries
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

// Create Docker container as EC2 instance
export function useCreateDockerInstance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      image: string;
      instanceType?: string;
      name?: string;
      vpcId?: string;
      ports?: string[];
      env?: string[];
      volumeSize?: number;
    }) => {
      const response = await fetch("/api/ec2/instances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create instance");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ec2-instances"] });
      toast.success("EC2 instance created successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create instance");
    },
  });
}

// Start/Stop instance
export function useControlDockerInstance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      instanceId,
      action,
    }: {
      instanceId: string;
      action: "start" | "stop";
    }) => {
      const response = await fetch("/api/ec2/instances", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instanceId, action }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to ${action} instance`);
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["ec2-instances"] });
      toast.success(`Instance ${variables.action}ed successfully`);
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });
}

// Terminate instance
export function useTerminateDockerInstance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (instanceId: string) => {
      const response = await fetch(
        `/api/ec2/instances?id=${encodeURIComponent(instanceId)}`,
        { method: "DELETE" }
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to terminate instance");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ec2-instances"] });
      toast.success("Instance terminated successfully");
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });
}

// Execute command in container
export function useDockerExec() {
  const [isLoading, setIsLoading] = useState(false);

  const execute = async (containerId: string, command: string) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/ec2/instances/exec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ containerId, command }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to execute command");
      }
      return await response.json();
    } finally {
      setIsLoading(false);
    }
  };

  return { execute, isLoading };
}

// Get container logs
export function useDockerLogs() {
  return useMutation({
    mutationFn: async ({
      containerId,
      tail = 100,
    }: {
      containerId: string;
      tail?: number;
    }) => {
      const response = await fetch(
        `/api/ec2/instances/logs?containerId=${containerId}&tail=${tail}`
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to get logs");
      }
      return await response.json();
    },
  });
}
