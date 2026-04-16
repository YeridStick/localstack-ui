import { useQuery } from "@tanstack/react-query";
import { LocalStackHealth } from "@/types";
import { getHealthRefreshIntervalMs, isAutoRefreshEnabled } from "@/lib/aws/runtime-config";

async function checkLocalStackHealth(): Promise<LocalStackHealth> {
  const response = await fetch("/api/health");
  if (!response.ok) {
    throw new Error("Failed to check LocalStack health");
  }
  return response.json();
}

export function useLocalStackHealth() {
  const autoRefresh = isAutoRefreshEnabled();
  return useQuery({
    queryKey: ["localstack-health"],
    queryFn: checkLocalStackHealth,
    refetchInterval: autoRefresh ? getHealthRefreshIntervalMs() : false,
    retry: 1,
  });
}
