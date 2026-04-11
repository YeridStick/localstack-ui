import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RDSInstance, CreateRDSInput } from "@/types/rds";
import { toast } from "sonner";

// List all RDS instances
export function useRDSInstances() {
  return useQuery({
    queryKey: ["rds-instances"],
    queryFn: async () => {
      const response = await fetch("/api/rds");
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch RDS instances");
      }
      const data = await response.json();
      return data.instances as RDSInstance[];
    },
  });
}

// Create RDS instance
export function useCreateRDSInstance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateRDSInput) => {
      const response = await fetch("/api/rds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create RDS instance");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rds-instances"] });
      toast.success("RDS instance created successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create RDS instance");
    },
  });
}

// Delete RDS instance
export function useDeleteRDSInstance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/rds?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete RDS instance");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rds-instances"] });
      toast.success("RDS instance deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete RDS instance");
    },
  });
}