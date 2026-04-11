import { useMutation, useQueryClient } from "@tanstack/react-query";

// Move EC2 instance to VPC
export function useMoveEC2ToVPC() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      instanceId,
      vpcId,
    }: {
      instanceId: string;
      vpcId: string;
    }) => {
      const response = await fetch("/api/ec2/instances", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instanceId,
          action: "moveToVpc",
          vpcId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to move instance to VPC");
      }

      return response.json();
    },
    onSuccess: () => {
      // Refresh instances list
      queryClient.invalidateQueries({ queryKey: ["docker-instances"] });
    },
  });
}

// Move RDS instance to VPC
export function useMoveRDSToVPC() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      rdsId,
      vpcId,
    }: {
      rdsId: string;
      vpcId: string;
    }) => {
      const response = await fetch("/api/rds", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rdsId,
          action: "moveToVpc",
          vpcId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to move RDS to VPC");
      }

      return response.json();
    },
    onSuccess: () => {
      // Refresh RDS list
      queryClient.invalidateQueries({ queryKey: ["rds-instances"] });
    },
  });
}
