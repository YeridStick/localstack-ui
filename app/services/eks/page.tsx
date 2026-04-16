"use client";

import { ServicePageLayout } from "@/components/layout/service-page-layout";
import { EksClusterLab } from "@/components/services/eks/cluster-lab";
import { useEksClusters } from "@/hooks/use-eks";
import { Network, Server, TrendingUp, Workflow } from "lucide-react";

export default function EksPage() {
  const { data: clusters = [] } = useEksClusters();

  const totalNodes = clusters.reduce((sum, cluster) => sum + cluster.nodes.length, 0);
  const runningNodes = clusters.reduce(
    (sum, cluster) =>
      sum + cluster.nodes.filter((node) => node.status === "running").length,
    0,
  );
  const apisExposed = clusters.filter((cluster) => cluster.apiGateway).length;

  return (
    <ServicePageLayout
      title="EKS Lab"
      description="Kubernetes local sobre EC2 simuladas + autoscaling + API Gateway"
      icon={Workflow}
      stats={[
        {
          title: "Clusters",
          value: clusters.length,
          description: "Clusters EKS locales",
          icon: Workflow,
        },
        {
          title: "Nodos EC2",
          value: totalNodes,
          description: `${runningNodes} running`,
          icon: Server,
        },
        {
          title: "Autoscaling",
          value: clusters.length,
          description: "Politicas configuradas por cluster",
          icon: TrendingUp,
        },
        {
          title: "API Gateway",
          value: apisExposed,
          description: "Proxies creados hacia apps k8s",
          icon: Network,
        },
      ]}
      alert={{
        icon: Network,
        description:
          "Este laboratorio simula EKS usando k3s en contenedores Docker asociados a instancias EC2 emuladas. Es un entorno de estudio cercano a AWS real, no un reemplazo 1:1.",
      }}
    >
      <EksClusterLab />
    </ServicePageLayout>
  );
}

