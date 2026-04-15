"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Cpu, 
  MemoryStick, 
  HardDrive, 
  Activity,
  Server,
  Database
} from "lucide-react";

// Resource metrics interface
interface ContainerMetrics {
  containerId: string;
  name: string;
  cpuPercent: number;
  memoryUsage: string;
  memoryLimit: string;
  memoryPercent: number;
  netIO: string;
  blockIO: string;
  pids: number;
}

interface SystemStats {
  totalContainers: number;
  runningContainers: number;
  totalNetworks: number;
  totalVolumes: number;
}

export function ResourceMetrics() {
  const [metrics, setMetrics] = useState<ContainerMetrics[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [systemStats, setSystemStats] = useState<SystemStats>({
    totalContainers: 0,
    runningContainers: 0,
    totalNetworks: 0,
    totalVolumes: 0,
  });

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchMetrics = async () => {
    try {
      const response = await fetch("/api/docker/stats");
      if (!response.ok) {
        throw new Error("Failed to fetch Docker stats");
      }
      
      const data = await response.json();
      setMetrics(data.metrics || []);
      setSystemStats(data.systemStats || {
        totalContainers: 0,
        runningContainers: 0,
        totalNetworks: 0,
        totalVolumes: 0,
      });
      setIsLoading(false);
    } catch (error) {
      console.error("Failed to fetch metrics:", error);
      setIsLoading(false);
    }
  };

  // Calculate totals
  const totalCPU = metrics.reduce((sum, m) => sum + m.cpuPercent, 0);
  const avgCPU = metrics.length > 0 ? totalCPU / metrics.length : 0;
  const totalMemoryPercent = metrics.reduce((sum, m) => sum + m.memoryPercent, 0);
  const avgMemory = metrics.length > 0 ? totalMemoryPercent / metrics.length : 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Containers"
          value={systemStats.totalContainers}
          subtitle={`${systemStats.runningContainers} running`}
          icon={Server}
          color="bg-blue-500"
        />
        <MetricCard
          title="CPU Usage"
          value={`${avgCPU.toFixed(1)}%`}
          subtitle="Average across all"
          icon={Cpu}
          color="bg-orange-500"
          progress={avgCPU}
        />
        <MetricCard
          title="Memory"
          value={`${avgMemory.toFixed(1)}%`}
          subtitle="Average usage"
          icon={MemoryStick}
          color="bg-purple-500"
          progress={avgMemory}
        />
        <MetricCard
          title="Networks"
          value={systemStats.totalNetworks}
          subtitle={`${systemStats.totalVolumes} volumes`}
          icon={HardDrive}
          color="bg-green-500"
        />
      </div>

      {/* Container Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Container Resource Usage
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : metrics.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No containers running
            </p>
          ) : (
            <div className="space-y-4">
              {metrics.map((metric) => (
                <ContainerMetricRow key={metric.containerId} metric={metric} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  progress?: number;
}

function MetricCard({ title, value, subtitle, icon: Icon, color, progress }: MetricCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          </div>
          <div className={`p-2 rounded-lg ${color}`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
        {progress !== undefined && (
          <Progress value={progress} className="mt-3 h-1" />
        )}
      </CardContent>
    </Card>
  );
}

interface ContainerMetricRowProps {
  metric: ContainerMetrics;
}

function ContainerMetricRow({ metric }: ContainerMetricRowProps) {
  const isEC2 = metric.name.startsWith("ec2-");
  const isRDS = metric.name.startsWith("rds-");
  
  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isEC2 ? (
            <Server className="h-5 w-5 text-orange-500" />
          ) : isRDS ? (
            <Database className="h-5 w-5 text-purple-500" />
          ) : (
            <Activity className="h-5 w-5 text-blue-500" />
          )}
          <div>
            <p className="font-medium font-mono text-sm">{metric.name}</p>
            <p className="text-xs text-muted-foreground font-mono">
              {metric.containerId}
            </p>
          </div>
          <Badge variant="outline" className="text-xs">
            {isEC2 ? "EC2" : isRDS ? "RDS" : "Container"}
          </Badge>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium">{metric.pids} PIDs</p>
          <p className="text-xs text-muted-foreground">Processes</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{metric.cpuPercent.toFixed(1)}%</span>
          </div>
          <Progress value={metric.cpuPercent} className="mt-1 h-1" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <MemoryStick className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{metric.memoryPercent.toFixed(1)}%</span>
          </div>
          <Progress value={metric.memoryPercent} className="mt-1 h-1" />
          <p className="text-xs text-muted-foreground mt-1">
            {metric.memoryUsage} / {metric.memoryLimit}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Network I/O</p>
          <p className="text-sm font-medium">{metric.netIO}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Block I/O</p>
          <p className="text-sm font-medium">{metric.blockIO}</p>
        </div>
      </div>
    </div>
  );
}

