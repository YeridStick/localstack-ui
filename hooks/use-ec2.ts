import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { EC2Instance } from "@/types";
import { toast } from "sonner";

// List all EC2 instances
export function useEC2Instances() {
  return useQuery({
    queryKey: ["ec2-instances"],
    queryFn: async () => {
      const response = await fetch("/api/ec2");
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch instances");
      }
      const data = await response.json();
      return data.instances as EC2Instance[];
    },
  });
}

// Start instance
export function useStartInstance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (instanceId: string) => {
      const response = await fetch(`/api/ec2/${instanceId}/start`, {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to start instance");
      }

      return response.json();
    },
    onSuccess: (_, instanceId) => {
      queryClient.invalidateQueries({ queryKey: ["ec2-instances"] });
      toast.success(`Instance "${instanceId}" started`);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to start instance");
    },
  });
}

// Stop instance
export function useStopInstance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (instanceId: string) => {
      const response = await fetch(`/api/ec2/${instanceId}/stop`, {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to stop instance");
      }

      return response.json();
    },
    onSuccess: (_, instanceId) => {
      queryClient.invalidateQueries({ queryKey: ["ec2-instances"] });
      toast.success(`Instance "${instanceId}" stopped`);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to stop instance");
    },
  });
}

// Terminate instance
export function useTerminateInstance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (instanceId: string) => {
      const response = await fetch(`/api/ec2/${instanceId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to terminate instance");
      }

      return response.json();
    },
    onSuccess: (_, instanceId) => {
      queryClient.invalidateQueries({ queryKey: ["ec2-instances"] });
      toast.success(`Instance "${instanceId}" terminated`);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to terminate instance");
    },
  });
}