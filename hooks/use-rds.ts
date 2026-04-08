import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RDSDBInstance } from "@/types";
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
      return data.instances as RDSDBInstance[];
    },
  });
}

// Delete RDS instance
export function useDeleteRDSInstance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      dbInstanceIdentifier,
      skipFinalSnapshot = true,
    }: {
      dbInstanceIdentifier: string;
      skipFinalSnapshot?: boolean;
    }) => {
      const response = await fetch(
        `/api/rds/${dbInstanceIdentifier}?skipFinalSnapshot=${skipFinalSnapshot}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete RDS instance");
      }

      return response.json();
    },
    onSuccess: (_, { dbInstanceIdentifier }) => {
      queryClient.invalidateQueries({ queryKey: ["rds-instances"] });
      toast.success(`RDS instance "${dbInstanceIdentifier}" deleted`);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete RDS instance");
    },
  });
}