"use client";

import { useState } from "react";
import { InfrastructureDiagram } from "@/components/infrastructure/infrastructure-diagram";
import { ResourceMetrics } from "@/components/infrastructure/resource-metrics";
import { Activity, BarChart3, Boxes } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function InfrastructurePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Activity className="h-6 w-6" />
          Infrastructure
        </h1>
        <p className="text-muted-foreground mt-1">
          Visualize your complete AWS infrastructure architecture and monitor resource usage.
        </p>
      </div>

      <Tabs defaultValue="diagram" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="diagram" className="flex items-center gap-2">
            <Boxes className="h-4 w-4" />
            Architecture Diagram
          </TabsTrigger>
          <TabsTrigger value="metrics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Resource Metrics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="diagram">
          <InfrastructureDiagram />
        </TabsContent>

        <TabsContent value="metrics">
          <ResourceMetrics />
        </TabsContent>
      </Tabs>
    </div>
  );
}
