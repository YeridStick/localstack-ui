import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CloudFormationStack,
  CloudFormationResource,
  CloudFormationEvent,
} from "@/types";
import { getHealthRefreshIntervalMs, isAutoRefreshEnabled } from "@/lib/aws/runtime-config";

const AUTO_REFRESH = isAutoRefreshEnabled();
const BASE_REFRESH_MS = getHealthRefreshIntervalMs();

// Stack hooks
export function useStacks() {
  return useQuery<CloudFormationStack[]>({
    queryKey: ["cloudformation-stacks"],
    queryFn: async () => {
      const response = await fetch("/api/cloudformation/stacks");
      if (!response.ok) throw new Error("Failed to fetch stacks");
      return response.json();
    },
    refetchInterval: AUTO_REFRESH ? BASE_REFRESH_MS : false,
  });
}

export function useStack(stackName: string, enabled?: boolean) {
  return useQuery<CloudFormationStack>({
    queryKey: ["cloudformation-stack", stackName],
    queryFn: async () => {
      const response = await fetch(
        `/api/cloudformation/stacks/${encodeURIComponent(stackName)}`,
      );
      if (!response.ok) throw new Error("Failed to fetch stack");
      return response.json();
    },
    enabled: enabled !== false && !!stackName,
    refetchInterval: AUTO_REFRESH ? BASE_REFRESH_MS : false,
  });
}

export function useStackTemplate(stackName: string, enabled?: boolean) {
  return useQuery<{ templateBody: string; stagesAvailable: string[] }>({
    queryKey: ["cloudformation-stack-template", stackName],
    queryFn: async () => {
      const response = await fetch(
        `/api/cloudformation/stacks/${encodeURIComponent(stackName)}?template=true`,
      );
      if (!response.ok) throw new Error("Failed to fetch template");
      return response.json();
    },
    enabled: enabled !== false && !!stackName,
  });
}

export function useCreateStack() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      stackName: string;
      templateBody?: string;
      templateURL?: string;
      parameters?: Array<{
        parameterKey: string;
        parameterValue: string;
        usePreviousValue?: boolean;
      }>;
      capabilities?: string[];
      tags?: Array<{
        key: string;
        value: string;
      }>;
      disableRollback?: boolean;
      timeoutInMinutes?: number;
      notificationARNs?: string[];
      roleARN?: string;
      enableTerminationProtection?: boolean;
    }) => {
      const response = await fetch("/api/cloudformation/stacks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create stack");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cloudformation-stacks"] });
    },
  });
}

export function useUpdateStack() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      stackName: string;
      templateBody?: string;
      templateURL?: string;
      usePreviousTemplate?: boolean;
      parameters?: Array<{
        parameterKey: string;
        parameterValue: string;
        usePreviousValue?: boolean;
      }>;
      capabilities?: string[];
      tags?: Array<{
        key: string;
        value: string;
      }>;
      disableRollback?: boolean;
      notificationARNs?: string[];
      roleARN?: string;
    }) => {
      const response = await fetch("/api/cloudformation/stacks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update stack");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cloudformation-stacks"] });
      queryClient.invalidateQueries({ queryKey: ["cloudformation-stack"] });
    },
  });
}

export function useDeleteStack() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      stackName,
      retainResources,
    }: {
      stackName: string;
      retainResources?: string[];
    }) => {
      const params = new URLSearchParams({ stackName });
      if (retainResources && retainResources.length > 0) {
        params.append("retainResources", retainResources.join(","));
      }

      const response = await fetch(`/api/cloudformation/stacks?${params}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete stack");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cloudformation-stacks"] });
    },
  });
}

// Resource hooks
export function useStackResources(stackName: string, enabled?: boolean) {
  return useQuery<CloudFormationResource[]>({
    queryKey: ["cloudformation-resources", stackName],
    queryFn: async () => {
      const response = await fetch(
        `/api/cloudformation/resources?stackName=${encodeURIComponent(stackName)}`,
      );
      if (!response.ok) throw new Error("Failed to fetch resources");
      return response.json();
    },
    enabled: enabled !== false && !!stackName,
    refetchInterval: AUTO_REFRESH ? BASE_REFRESH_MS : false,
  });
}

export function useStackResource(
  stackName: string,
  logicalResourceId: string,
  enabled?: boolean,
) {
  return useQuery<CloudFormationResource[]>({
    queryKey: ["cloudformation-resource", stackName, logicalResourceId],
    queryFn: async () => {
      const params = new URLSearchParams({
        stackName,
        logicalResourceId,
      });

      const response = await fetch(`/api/cloudformation/resources?${params}`);
      if (!response.ok) throw new Error("Failed to fetch resource");
      return response.json();
    },
    enabled: enabled !== false && !!stackName && !!logicalResourceId,
  });
}

// Event hooks
export function useStackEvents(stackName: string, enabled?: boolean) {
  return useQuery<CloudFormationEvent[]>({
    queryKey: ["cloudformation-events", stackName],
    queryFn: async () => {
      const response = await fetch(
        `/api/cloudformation/events?stackName=${encodeURIComponent(stackName)}`,
      );
      if (!response.ok) throw new Error("Failed to fetch events");
      return response.json();
    },
    enabled: enabled !== false && !!stackName,
    refetchInterval: AUTO_REFRESH ? Math.max(2000, Math.floor(BASE_REFRESH_MS * 0.6)) : false,
  });
}
