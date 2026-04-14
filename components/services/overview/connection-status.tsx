"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocalStackHealth } from "@/hooks/use-localstack";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";

export function ConnectionStatus() {
  const { data: health, isLoading, error } = useLocalStackHealth();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Connection Status</CardTitle>
          <CardDescription>Checking emulator connection...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Connection Status</CardTitle>
          <CardDescription>Unable to connect to emulator</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-destructive" />
            <span className="text-sm text-muted-foreground">
              Failed to connect to AWS emulator
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const statusIcon = {
    healthy: <CheckCircle className="h-5 w-5 text-green-500" />,
    unhealthy: <XCircle className="h-5 w-5 text-destructive" />,
    unknown: <AlertCircle className="h-5 w-5 text-yellow-500" />,
  };

  const statusVariant = {
    healthy: "default" as const,
    unhealthy: "destructive" as const,
    unknown: "secondary" as const,
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connection Status</CardTitle>
        <CardDescription>AWS emulator endpoint and health</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Status</span>
          <div className="flex items-center gap-2">
            {health && statusIcon[health.status]}
            <Badge variant={health && statusVariant[health.status]}>
              {health?.status || "Unknown"}
            </Badge>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Endpoint</span>
          <span className="text-sm text-muted-foreground">
            {health?.endpoint || "N/A"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Backend</span>
          <span className="text-sm text-muted-foreground capitalize">
            {health?.backend || "unknown"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Last Checked</span>
          <span className="text-sm text-muted-foreground">
            {health?.lastChecked
              ? new Date(health.lastChecked).toLocaleTimeString()
              : "N/A"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
