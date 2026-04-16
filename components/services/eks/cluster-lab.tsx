"use client";

import { FormEvent, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  useCreateEksCluster,
  useDeleteEksCluster,
  useDeployEksSampleApp,
  useEksClusters,
  useExposeEksWithApiGateway,
  useReconcileEksAutoscaling,
  useScaleEksCluster,
} from "@/hooks/use-eks";
import { RefreshCw, Trash2 } from "lucide-react";

function statusVariant(status: string): "default" | "secondary" | "destructive" {
  if (status === "running") return "default";
  if (status === "stopped") return "secondary";
  return "destructive";
}

export function EksClusterLab() {
  const { data: clusters = [], isLoading, refetch } = useEksClusters();
  const createCluster = useCreateEksCluster();
  const deleteCluster = useDeleteEksCluster();
  const scaleCluster = useScaleEksCluster();
  const reconcileAutoscaling = useReconcileEksAutoscaling();
  const deploySampleApp = useDeployEksSampleApp();
  const exposeApiGateway = useExposeEksWithApiGateway();

  const [name, setName] = useState("study-eks");
  const [minNodes, setMinNodes] = useState(1);
  const [maxNodes, setMaxNodes] = useState(3);
  const [desiredNodes, setDesiredNodes] = useState(1);
  const [targetCpuUtilization, setTargetCpuUtilization] = useState(60);
  const [nodeImage, setNodeImage] = useState("rancher/k3s:v1.30.6-k3s1");

  const totals = useMemo(() => {
    const totalClusters = clusters.length;
    const totalNodes = clusters.reduce((sum, cluster) => sum + cluster.nodes.length, 0);
    const runningNodes = clusters.reduce(
      (sum, cluster) =>
        sum + cluster.nodes.filter((node) => node.status === "running").length,
      0,
    );
    const exposedApis = clusters.filter((cluster) => cluster.apiGateway).length;
    return { totalClusters, totalNodes, runningNodes, exposedApis };
  }, [clusters]);

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    await createCluster.mutateAsync({
      name,
      minNodes,
      maxNodes,
      desiredNodes,
      targetCpuUtilization,
      nodeImage,
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Crear cluster EKS local</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-6" onSubmit={handleCreate}>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="cluster-name">Nombre</Label>
              <Input
                id="cluster-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="study-eks"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="min-nodes">Min</Label>
              <Input
                id="min-nodes"
                type="number"
                min={1}
                max={20}
                value={minNodes}
                onChange={(event) => setMinNodes(Number(event.target.value) || 1)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="max-nodes">Max</Label>
              <Input
                id="max-nodes"
                type="number"
                min={1}
                max={30}
                value={maxNodes}
                onChange={(event) => setMaxNodes(Number(event.target.value) || 1)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="desired-nodes">Desired</Label>
              <Input
                id="desired-nodes"
                type="number"
                min={1}
                max={30}
                value={desiredNodes}
                onChange={(event) =>
                  setDesiredNodes(Number(event.target.value) || 1)
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="target-cpu">Target CPU %</Label>
              <Input
                id="target-cpu"
                type="number"
                min={20}
                max={95}
                value={targetCpuUtilization}
                onChange={(event) =>
                  setTargetCpuUtilization(Number(event.target.value) || 60)
                }
              />
            </div>
            <div className="space-y-1.5 md:col-span-4">
              <Label htmlFor="node-image">Imagen de nodo (k3s agent)</Label>
              <Input
                id="node-image"
                value={nodeImage}
                onChange={(event) => setNodeImage(event.target.value)}
              />
            </div>
            <div className="flex items-end md:col-span-2">
              <Button
                type="submit"
                className="w-full"
                disabled={createCluster.isPending}
              >
                {createCluster.isPending ? "Creando..." : "Crear cluster"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Clusters EKS simulados</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className="mr-2 h-3.5 w-3.5" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 text-sm md:grid-cols-4">
            <div className="rounded-md border p-2">
              <p className="text-muted-foreground">Clusters</p>
              <p className="text-xl font-semibold">{totals.totalClusters}</p>
            </div>
            <div className="rounded-md border p-2">
              <p className="text-muted-foreground">Nodos totales</p>
              <p className="text-xl font-semibold">{totals.totalNodes}</p>
            </div>
            <div className="rounded-md border p-2">
              <p className="text-muted-foreground">Nodos running</p>
              <p className="text-xl font-semibold">{totals.runningNodes}</p>
            </div>
            <div className="rounded-md border p-2">
              <p className="text-muted-foreground">APIs expuestas</p>
              <p className="text-xl font-semibold">{totals.exposedApis}</p>
            </div>
          </div>

          <Separator />

          {clusters.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay clusters creados todavia.
            </p>
          ) : (
            <div className="space-y-3">
              {clusters.map((cluster) => {
                const runningNodes = cluster.nodes.filter(
                  (node) => node.status === "running",
                ).length;
                const suggestedPort = cluster.nodes.find(
                  (node) => node.status === "running",
                )?.hostNodePort;

                return (
                  <div key={cluster.clusterId} className="rounded-md border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{cluster.name}</p>
                        <Badge variant={statusVariant(cluster.controlPlane.status)}>
                          control-plane: {cluster.controlPlane.status}
                        </Badge>
                        <Badge variant="secondary">
                          nodes {runningNodes}/{cluster.nodeGroup.desiredNodes}
                        </Badge>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteCluster.mutate(cluster.clusterId)}
                        disabled={deleteCluster.isPending}
                      >
                        <Trash2 className="mr-2 h-3.5 w-3.5" />
                        Eliminar
                      </Button>
                    </div>

                    <div className="mt-3 grid gap-2 text-xs text-muted-foreground md:grid-cols-3">
                      <p>Cluster ID: {cluster.clusterId}</p>
                      <p>
                        API server host port: {cluster.controlPlane.apiServerHostPort}
                      </p>
                      <p>
                        Autoscaling target: {cluster.nodeGroup.targetCpuUtilization}%
                      </p>
                      <p>Imagen nodos: {cluster.nodeGroup.nodeImage}</p>
                      <p>
                        Min/Max: {cluster.nodeGroup.minNodes}/{cluster.nodeGroup.maxNodes}
                      </p>
                      <p>NodePort app: {suggestedPort || "-"}</p>
                    </div>

                    {cluster.sampleApp && (
                      <p className="mt-2 text-xs">
                        App: <strong>{cluster.sampleApp.namespace}</strong>/
                        <strong>{cluster.sampleApp.appName}</strong> (image{" "}
                        {cluster.sampleApp.image})
                      </p>
                    )}

                    {cluster.apiGateway?.invokeUrl && (
                      <p className="mt-1 break-all text-xs text-blue-600 dark:text-blue-400">
                        API Gateway: {cluster.apiGateway.invokeUrl}
                      </p>
                    )}
                    {cluster.apiGateway?.emulatorInvokeUrl && (
                      <p className="mt-1 break-all text-[11px] text-muted-foreground">
                        Emulator runtime URL: {cluster.apiGateway.emulatorInvokeUrl}
                      </p>
                    )}

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          scaleCluster.mutate({
                            clusterId: cluster.clusterId,
                            desiredNodes: cluster.nodeGroup.desiredNodes - 1,
                          })
                        }
                        disabled={
                          scaleCluster.isPending ||
                          cluster.nodeGroup.desiredNodes <= cluster.nodeGroup.minNodes
                        }
                      >
                        - Node
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          scaleCluster.mutate({
                            clusterId: cluster.clusterId,
                            desiredNodes: cluster.nodeGroup.desiredNodes + 1,
                          })
                        }
                        disabled={
                          scaleCluster.isPending ||
                          cluster.nodeGroup.desiredNodes >= cluster.nodeGroup.maxNodes
                        }
                      >
                        + Node
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          reconcileAutoscaling.mutate(cluster.clusterId)
                        }
                        disabled={reconcileAutoscaling.isPending}
                      >
                        Evaluar autoscaling
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          deploySampleApp.mutate({ clusterId: cluster.clusterId })
                        }
                        disabled={deploySampleApp.isPending}
                      >
                        Deploy app demo
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          exposeApiGateway.mutate({
                            clusterId: cluster.clusterId,
                            pathPart: "study",
                            stageName: "dev",
                          })
                        }
                        disabled={exposeApiGateway.isPending}
                      >
                        Exponer por API Gateway
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
