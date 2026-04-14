import { useMutation, useQuery } from "@tanstack/react-query";

export type TerraformAction = "validate" | "plan" | "apply" | "destroy";
export type TerraformMode = "terraform" | "cloudformation-bridge";

export interface TerraformStatusResponse {
  terraformAvailable: boolean;
  terraformVersion: string | null;
  localstackEndpoint: string;
  region: string;
  error?: string;
}

export interface TerraformRunPayload {
  action: TerraformAction;
  mode: TerraformMode;
  workspaceName: string;
  terraformConfig: string;
  cloudFormationStackName?: string;
  cloudFormationTemplate?: string;
  cloudFormationCapabilities?: string[];
  cloudFormationParameters?: Record<string, string>;
}

export interface TerraformRunResponse {
  success: boolean;
  action: TerraformAction;
  mode: TerraformMode;
  workspaceName: string;
  localstackEndpoint: string;
  region: string;
  hasChanges?: boolean;
  output: string;
  error?: string;
}

export function useTerraformStatus() {
  return useQuery<TerraformStatusResponse>({
    queryKey: ["iac", "terraform", "status"],
    queryFn: async () => {
      const response = await fetch("/api/iac/terraform");
      if (!response.ok) {
        throw new Error("Failed to fetch Terraform status");
      }
      return response.json();
    },
    staleTime: 15_000,
  });
}

export function useRunTerraform() {
  return useMutation<TerraformRunResponse, Error, TerraformRunPayload>({
    mutationFn: async (payload) => {
      const response = await fetch("/api/iac/terraform", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Terraform execution failed");
      }

      return data;
    },
  });
}
