"use client";

import { ConnectionStatus } from "@/components/services/overview/connection-status";
import { ServiceCard } from "@/components/services/overview/service-card";
import { useLocalStackHealth } from "@/hooks/use-localstack";
import { Skeleton } from "@/components/ui/skeleton";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function OverviewPage() {
  const { data: health, isLoading } = useLocalStackHealth();
  const queryClient = useQueryClient();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Overview</h1>
          <p className="text-muted-foreground">
            Monitor and manage your AWS emulator services
          </p>
        </div>
        <Button
          onClick={() =>
            queryClient.invalidateQueries({ queryKey: ["localstack-health"] })
          }
          variant="outline"
          size="sm"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <ConnectionStatus />

      <div>
        <h3 className="text-xl font-semibold mb-4">Available Services</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {isLoading
            ? Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="h-[200px]" />
              ))
            : health?.services.map((service) => (
                <ServiceCard key={service.id} service={service} />
              ))}
        </div>
      </div>
    </div>
  );
}
