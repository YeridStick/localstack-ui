import { useState, useCallback } from "react";
import { toast } from "sonner";

interface ConnectResult {
  output: string;
  error: string | null;
}

export function useEC2Connect() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [logs, setLogs] = useState<string>("");

  // For Docker-based instances - uses containerId directly
  const executeCommand = useCallback(async (
    containerId: string,
    command: string
  ): Promise<ConnectResult | null> => {
    setIsConnecting(true);
    try {
      const response = await fetch("/api/ec2/docker/exec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ containerId, command }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to execute command");
        return null;
      }

      return {
        output: data.output,
        error: data.error,
      };
    } catch (error: any) {
      toast.error(error.message || "Connection failed");
      return null;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  // For Docker-based instances - uses containerId directly
  const fetchLogs = useCallback(async (
    containerId: string,
    tail: number = 100
  ): Promise<string | null> => {
    try {
      const response = await fetch(
        `/api/ec2/docker/logs?containerId=${containerId}&tail=${tail}`
      );

      const data = await response.json();

      if (!response.ok) {
        return null;
      }

      setLogs(data.logs || "");
      return data.logs || "";
    } catch (error: any) {
      return null;
    }
  }, []);

  return {
    executeCommand,
    fetchLogs,
    logs,
    isConnecting,
    setLogs,
  };
}
