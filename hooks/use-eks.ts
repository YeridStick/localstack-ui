import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { EksLocalCluster } from "@/types";

const QUERY_KEY = ["eks-local-clusters"];

export function useEksClusters() {
  return useQuery<EksLocalCluster[]>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const response = await fetch("/api/eks/clusters");
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch EKS clusters");
      }
      const data = await response.json();
      return data.clusters || [];
    },
    refetchOnWindowFocus: false,
  });
}

export function useCreateEksCluster() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      name: string;
      kubernetesVersion?: string;
      nodeImage?: string;
      minNodes?: number;
      maxNodes?: number;
      desiredNodes?: number;
      targetCpuUtilization?: number;
    }) => {
      const response = await fetch("/api/eks/clusters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to create EKS cluster");
      }
      return data.cluster as EksLocalCluster;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("Cluster EKS local creado");
    },
    onError: (error: any) => {
      toast.error(error.message || "No se pudo crear el cluster");
    },
  });
}

export function useDeleteEksCluster() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (clusterId: string) => {
      const response = await fetch(`/api/eks/clusters/${clusterId}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to delete EKS cluster");
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("Cluster eliminado");
    },
    onError: (error: any) => {
      toast.error(error.message || "No se pudo eliminar el cluster");
    },
  });
}

export function useScaleEksCluster() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { clusterId: string; desiredNodes: number }) => {
      const response = await fetch(`/api/eks/clusters/${payload.clusterId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "scale",
          desiredNodes: payload.desiredNodes,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to scale EKS cluster");
      }
      return data.cluster as EksLocalCluster;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("Escalado aplicado");
    },
    onError: (error: any) => {
      toast.error(error.message || "No se pudo escalar el cluster");
    },
  });
}

export function useReconcileEksAutoscaling() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (clusterId: string) => {
      const response = await fetch(`/api/eks/clusters/${clusterId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reconcile-autoscaling" }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to reconcile autoscaling");
      }
      return data as {
        cluster: EksLocalCluster;
        averageCpu: number;
        action: string;
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      const cpu = result.averageCpu.toFixed(2);
      const actionLabel =
        result.action === "scale-out"
          ? "scale out"
          : result.action === "scale-in"
            ? "scale in"
            : "sin cambios";
      toast.success(`Autoscaling evaluado (${cpu}% CPU, ${actionLabel})`);
    },
    onError: (error: any) => {
      toast.error(error.message || "No se pudo evaluar autoscaling");
    },
  });
}

export function useDeployEksSampleApp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      clusterId: string;
      namespace?: string;
      appName?: string;
      image?: string;
    }) => {
      const response = await fetch(`/api/eks/clusters/${payload.clusterId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "deploy-sample-app",
          namespace: payload.namespace,
          appName: payload.appName,
          image: payload.image,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to deploy sample app");
      }
      return data.cluster as EksLocalCluster;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("App de ejemplo desplegada en el cluster");
    },
    onError: (error: any) => {
      toast.error(error.message || "No se pudo desplegar la app");
    },
  });
}

export function useExposeEksWithApiGateway() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      clusterId: string;
      stageName?: string;
      pathPart?: string;
      apiName?: string;
    }) => {
      const response = await fetch(`/api/eks/clusters/${payload.clusterId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "expose-api-gateway",
          stageName: payload.stageName,
          pathPart: payload.pathPart,
          apiName: payload.apiName,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to expose app through API Gateway");
      }
      return data.cluster as EksLocalCluster;
    },
    onSuccess: (cluster) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      const url = cluster.apiGateway?.invokeUrl;
      if (url) {
        toast.success(`Proxy API listo: ${url}`);
      } else {
        toast.success("API Gateway creado para el cluster");
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "No se pudo crear el proxy API Gateway");
    },
  });
}

