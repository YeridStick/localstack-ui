import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { EcrImage, EcrRepository } from "@/types";

const REPOSITORIES_QUERY_KEY = ["ecr-repositories"];
const RUNTIME_QUERY_KEY = ["ecr-runtime"];

export interface EcrRuntimeStatus {
  mode: "real" | "metadata" | "unknown";
  backend: "localstack" | "ministack" | "unknown";
  endpoint: string;
  healthPath?: string;
  dockerReady: boolean;
  composeReady: boolean;
  dockerError?: string;
  composeError?: string;
  ecrRealEnv: {
    exists: boolean;
    hasToken: boolean;
    endpointStrategy: "off" | "domain";
  };
}

export function useEcrRepositories() {
  return useQuery<EcrRepository[]>({
    queryKey: REPOSITORIES_QUERY_KEY,
    queryFn: async () => {
      const response = await fetch("/api/ecr/repositories");
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Failed to list ECR repositories");
      }
      return data.repositories || [];
    },
    refetchOnWindowFocus: false,
  });
}

export function useEcrRuntime() {
  return useQuery<EcrRuntimeStatus>({
    queryKey: RUNTIME_QUERY_KEY,
    queryFn: async () => {
      const response = await fetch("/api/ecr/runtime");
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Failed to get ECR runtime status");
      }
      return data;
    },
    refetchOnWindowFocus: false,
  });
}

export function useSwitchEcrRuntimeToReal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      authToken?: string;
      endpointStrategy?: "off" | "domain";
    }) => {
      const response = await fetch("/api/ecr/runtime", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "switch-to-real",
          authToken: payload.authToken,
          endpointStrategy: payload.endpointStrategy || "off",
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Failed to switch ECR runtime to real");
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RUNTIME_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["localstack-health"] });
      queryClient.invalidateQueries({ queryKey: REPOSITORIES_QUERY_KEY });
      toast.success("Modo ECR real activado");
    },
    onError: (error: any) => {
      toast.error(error?.message || "No se pudo activar modo ECR real");
    },
  });
}

export function useSwitchEcrRuntimeToBase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/ecr/runtime", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "switch-to-base",
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Failed to switch ECR runtime to base");
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RUNTIME_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["localstack-health"] });
      queryClient.invalidateQueries({ queryKey: REPOSITORIES_QUERY_KEY });
      toast.success("Modo base (MiniStack) activado");
    },
    onError: (error: any) => {
      toast.error(error?.message || "No se pudo activar modo base");
    },
  });
}

export function useCreateEcrRepository() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      repositoryName: string;
      imageTagMutability?: "MUTABLE" | "IMMUTABLE";
      scanOnPush?: boolean;
      encryptionType?: "AES256" | "KMS" | "KMS_DSSE";
      kmsKey?: string;
      tags?: Record<string, string>;
    }) => {
      const response = await fetch("/api/ecr/repositories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Failed to create ECR repository");
      }
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: REPOSITORIES_QUERY_KEY });
      toast.success(`Repositorio '${variables.repositoryName}' creado`);
    },
    onError: (error: any) => {
      toast.error(error?.message || "No se pudo crear el repositorio");
    },
  });
}

export function useDeleteEcrRepository() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { repositoryName: string; force?: boolean }) => {
      const params = new URLSearchParams({
        repositoryName: payload.repositoryName,
      });
      if (payload.force) {
        params.set("force", "true");
      }

      const response = await fetch(`/api/ecr/repositories?${params.toString()}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Failed to delete ECR repository");
      }
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: REPOSITORIES_QUERY_KEY });
      queryClient.invalidateQueries({
        queryKey: ["ecr-images", variables.repositoryName],
      });
      toast.success(`Repositorio '${variables.repositoryName}' eliminado`);
    },
    onError: (error: any) => {
      toast.error(error?.message || "No se pudo eliminar el repositorio");
    },
  });
}

export function useEcrImages(repositoryName?: string, enabled?: boolean) {
  return useQuery<EcrImage[]>({
    queryKey: ["ecr-images", repositoryName],
    queryFn: async () => {
      const params = new URLSearchParams({
        repositoryName: repositoryName || "",
      });
      const response = await fetch(`/api/ecr/images?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Failed to list ECR images");
      }
      return data.images || [];
    },
    enabled: enabled !== false && Boolean(repositoryName),
    refetchOnWindowFocus: false,
  });
}

export function useDeleteEcrImages() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      repositoryName: string;
      imageIds: Array<{ imageDigest?: string; imageTag?: string }>;
    }) => {
      const response = await fetch("/api/ecr/images", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Failed to delete ECR images");
      }
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["ecr-images", variables.repositoryName],
      });
      toast.success("Imagen eliminada del repositorio");
    },
    onError: (error: any) => {
      toast.error(error?.message || "No se pudo eliminar la imagen");
    },
  });
}
