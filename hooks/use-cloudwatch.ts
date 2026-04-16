import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getHealthRefreshIntervalMs, isAutoRefreshEnabled } from "@/lib/aws/runtime-config";
import type {
  CloudWatchLogGroup,
  CloudWatchLogStream,
  CloudWatchLogEvent,
  CloudWatchMetric,
  CloudWatchAlarm,
  CloudWatchAlarmHistory,
  MetricDataQuery,
  MetricDataResult,
} from "@/types";

const AUTO_REFRESH = isAutoRefreshEnabled();
const BASE_REFRESH_MS = getHealthRefreshIntervalMs();

// Log Groups hooks
export function useCloudWatchLogGroups(prefix?: string) {
  return useQuery({
    queryKey: ["cloudwatch-log-groups", prefix],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (prefix) params.append("prefix", prefix);

      const response = await fetch(`/api/cloudwatch/log-groups?${params}`);
      if (!response.ok) throw new Error("Failed to fetch log groups");
      const data = await response.json();
      return data.logGroups as CloudWatchLogGroup[];
    },
  });
}

export function useCloudWatchLogGroup(logGroupName: string, enabled = false) {
  return useQuery({
    queryKey: ["cloudwatch-log-group", logGroupName],
    queryFn: async () => {
      const response = await fetch(
        `/api/cloudwatch/log-groups/${encodeURIComponent(logGroupName)}`,
      );
      if (!response.ok) throw new Error("Failed to fetch log group");
      return response.json() as Promise<CloudWatchLogGroup>;
    },
    enabled: enabled && !!logGroupName,
  });
}

export function useCreateCloudWatchLogGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      logGroupName: string;
      retentionInDays?: number;
      kmsKeyId?: string;
      tags?: Record<string, string>;
    }) => {
      const response = await fetch("/api/cloudwatch/log-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create log group");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cloudwatch-log-groups"] });
      toast.success("Log group created successfully");
    },
    onError: (error) => {
      toast.error(`Failed to create log group: ${error.message}`);
    },
  });
}

export function useUpdateCloudWatchLogGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      logGroupName,
      retentionInDays,
    }: {
      logGroupName: string;
      retentionInDays?: number;
    }) => {
      const response = await fetch(
        `/api/cloudwatch/log-groups/${encodeURIComponent(logGroupName)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ retentionInDays }),
        },
      );
      if (!response.ok) throw new Error("Failed to update log group");
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["cloudwatch-log-groups"] });
      queryClient.invalidateQueries({
        queryKey: ["cloudwatch-log-group", variables.logGroupName],
      });
      toast.success("Log group updated successfully");
    },
    onError: (error) => {
      toast.error(`Failed to update log group: ${error.message}`);
    },
  });
}

export function useDeleteCloudWatchLogGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (logGroupName: string) => {
      const response = await fetch(
        `/api/cloudwatch/log-groups/${encodeURIComponent(logGroupName)}`,
        {
          method: "DELETE",
        },
      );
      if (!response.ok) throw new Error("Failed to delete log group");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cloudwatch-log-groups"] });
      toast.success("Log group deleted successfully");
    },
    onError: (error) => {
      toast.error(`Failed to delete log group: ${error.message}`);
    },
  });
}

// Log Streams hooks
export function useCloudWatchLogStreams(
  logGroupName: string,
  options?: {
    prefix?: string;
    orderBy?: "LogStreamName" | "LastEventTime";
    descending?: boolean;
  },
) {
  return useQuery({
    queryKey: ["cloudwatch-log-streams", logGroupName, options],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options?.prefix) params.append("prefix", options.prefix);
      if (options?.orderBy) params.append("orderBy", options.orderBy);
      if (options?.descending !== undefined)
        params.append("descending", String(options.descending));

      const response = await fetch(
        `/api/cloudwatch/log-groups/${encodeURIComponent(logGroupName)}/streams?${params}`,
      );
      if (!response.ok) throw new Error("Failed to fetch log streams");
      const data = await response.json();
      return data.logStreams as CloudWatchLogStream[];
    },
    enabled: !!logGroupName,
  });
}

export function useCreateCloudWatchLogStream() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      logGroupName,
      logStreamName,
    }: {
      logGroupName: string;
      logStreamName: string;
    }) => {
      const response = await fetch(
        `/api/cloudwatch/log-groups/${encodeURIComponent(logGroupName)}/streams`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ logStreamName }),
        },
      );
      if (!response.ok) throw new Error("Failed to create log stream");
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["cloudwatch-log-streams", variables.logGroupName],
      });
      toast.success("Log stream created successfully");
    },
    onError: (error) => {
      toast.error(`Failed to create log stream: ${error.message}`);
    },
  });
}

export function useDeleteCloudWatchLogStream() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      logGroupName,
      logStreamName,
    }: {
      logGroupName: string;
      logStreamName: string;
    }) => {
      const response = await fetch(
        `/api/cloudwatch/log-groups/${encodeURIComponent(logGroupName)}/streams/${encodeURIComponent(logStreamName)}`,
        { method: "DELETE" },
      );
      if (!response.ok) throw new Error("Failed to delete log stream");
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["cloudwatch-log-streams", variables.logGroupName],
      });
      toast.success("Log stream deleted successfully");
    },
    onError: (error) => {
      toast.error(`Failed to delete log stream: ${error.message}`);
    },
  });
}

// Log Events hooks
export function useCloudWatchLogEvents(
  logGroupName: string,
  logStreamName: string,
  options?: {
    startTime?: number;
    endTime?: number;
    limit?: number;
    startFromHead?: boolean;
  },
  enabled = true,
) {
  return useQuery({
    queryKey: ["cloudwatch-log-events", logGroupName, logStreamName, options],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options?.startTime)
        params.append("startTime", String(options.startTime));
      if (options?.endTime) params.append("endTime", String(options.endTime));
      if (options?.limit) params.append("limit", String(options.limit));
      if (options?.startFromHead !== undefined)
        params.append("startFromHead", String(options.startFromHead));

      const response = await fetch(
        `/api/cloudwatch/log-groups/${encodeURIComponent(logGroupName)}/streams/${encodeURIComponent(logStreamName)}/events?${params}`,
      );
      if (!response.ok) throw new Error("Failed to fetch log events");
      const data = await response.json();
      return data.events as CloudWatchLogEvent[];
    },
    enabled: enabled && !!logGroupName && !!logStreamName,
    refetchInterval:
      AUTO_REFRESH && options?.startFromHead === false ? BASE_REFRESH_MS : false,
  });
}

export function usePutCloudWatchLogEvents() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      logGroupName,
      logStreamName,
      events,
      sequenceToken,
    }: {
      logGroupName: string;
      logStreamName: string;
      events: Array<{ timestamp?: number; message: string }>;
      sequenceToken?: string;
    }) => {
      const response = await fetch(
        `/api/cloudwatch/log-groups/${encodeURIComponent(logGroupName)}/streams/${encodeURIComponent(logStreamName)}/events`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ events, sequenceToken }),
        },
      );
      if (!response.ok) throw new Error("Failed to put log events");
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [
          "cloudwatch-log-events",
          variables.logGroupName,
          variables.logStreamName,
        ],
      });
      toast.success("Log events added successfully");
    },
    onError: (error) => {
      toast.error(`Failed to add log events: ${error.message}`);
    },
  });
}

// Metrics hooks
export function useCloudWatchMetrics(options?: {
  namespace?: string;
  metricName?: string;
  dimensions?: Array<{ name: string; value: string }>;
  recentlyActive?: boolean;
}) {
  return useQuery({
    queryKey: ["cloudwatch-metrics", options],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options?.namespace) params.append("namespace", options.namespace);
      if (options?.metricName) params.append("metricName", options.metricName);
      if (options?.dimensions)
        params.append("dimensions", JSON.stringify(options.dimensions));
      if (options?.recentlyActive !== undefined)
        params.append("recentlyActive", String(options.recentlyActive));

      const response = await fetch(`/api/cloudwatch/metrics?${params}`);
      if (!response.ok) throw new Error("Failed to fetch metrics");
      const data = await response.json();
      return data.metrics as CloudWatchMetric[];
    },
  });
}

export function usePutCloudWatchMetricData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      namespace,
      metricData,
    }: {
      namespace: string;
      metricData: Array<{
        metricName: string;
        value?: number;
        unit?: string;
        timestamp?: string;
        dimensions?: Array<{ name: string; value: string }>;
        statisticValues?: {
          sampleCount: number;
          sum: number;
          minimum: number;
          maximum: number;
        };
        storageResolution?: number;
      }>;
    }) => {
      const response = await fetch("/api/cloudwatch/metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ namespace, metricData }),
      });
      if (!response.ok) throw new Error("Failed to put metric data");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cloudwatch-metrics"] });
      toast.success("Metric data published successfully");
    },
    onError: (error) => {
      toast.error(`Failed to publish metric data: ${error.message}`);
    },
  });
}

export function useCloudWatchMetricStatistics(
  namespace: string,
  metricName: string,
  options: {
    startTime: number;
    endTime: number;
    period: number;
    statistics: string[];
    dimensions?: Array<{ name: string; value: string }>;
    unit?: string;
  },
  enabled = true,
) {
  return useQuery({
    queryKey: ["cloudwatch-metric-statistics", namespace, metricName, options],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("namespace", namespace);
      params.append("metricName", metricName);
      params.append("startTime", String(options.startTime));
      params.append("endTime", String(options.endTime));
      params.append("period", String(options.period));
      options.statistics.forEach((stat) => params.append("statistics", stat));
      if (options.dimensions)
        params.append("dimensions", JSON.stringify(options.dimensions));
      if (options.unit) params.append("unit", options.unit);

      const response = await fetch(
        `/api/cloudwatch/metrics/statistics?${params}`,
      );
      if (!response.ok) throw new Error("Failed to fetch metric statistics");
      return response.json();
    },
    enabled: enabled && !!namespace && !!metricName,
  });
}

export function useCloudWatchMetricData() {
  return useMutation({
    mutationFn: async ({
      metricDataQueries,
      startTime,
      endTime,
      scanBy,
      maxDatapoints,
    }: {
      metricDataQueries: MetricDataQuery[];
      startTime: number;
      endTime: number;
      scanBy?: "TimestampDescending" | "TimestampAscending";
      maxDatapoints?: number;
    }) => {
      const response = await fetch("/api/cloudwatch/metrics/statistics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metricDataQueries,
          startTime,
          endTime,
          scanBy,
          maxDatapoints,
        }),
      });
      if (!response.ok) throw new Error("Failed to fetch metric data");
      const data = await response.json();
      return data.metricDataResults as MetricDataResult[];
    },
  });
}

// Alarms hooks
export function useCloudWatchAlarms(options?: {
  alarmNames?: string[];
  alarmNamePrefix?: string;
  stateValue?: "OK" | "ALARM" | "INSUFFICIENT_DATA";
  actionPrefix?: string;
}) {
  return useQuery({
    queryKey: ["cloudwatch-alarms", options],
    queryFn: async () => {
      const params = new URLSearchParams();
      options?.alarmNames?.forEach((name) => params.append("alarmNames", name));
      if (options?.alarmNamePrefix)
        params.append("alarmNamePrefix", options.alarmNamePrefix);
      if (options?.stateValue) params.append("stateValue", options.stateValue);
      if (options?.actionPrefix)
        params.append("actionPrefix", options.actionPrefix);

      const response = await fetch(`/api/cloudwatch/alarms?${params}`);
      if (!response.ok) throw new Error("Failed to fetch alarms");
      const data = await response.json();
      return data.metricAlarms as CloudWatchAlarm[];
    },
  });
}

export function useCloudWatchAlarm(alarmName: string, enabled = false) {
  return useQuery({
    queryKey: ["cloudwatch-alarm", alarmName],
    queryFn: async () => {
      const response = await fetch(
        `/api/cloudwatch/alarms/${encodeURIComponent(alarmName)}`,
      );
      if (!response.ok) throw new Error("Failed to fetch alarm");
      return response.json() as Promise<CloudWatchAlarm>;
    },
    enabled: enabled && !!alarmName,
  });
}

export function useCreateCloudWatchAlarm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (alarmData: any) => {
      const response = await fetch("/api/cloudwatch/alarms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(alarmData),
      });
      if (!response.ok) throw new Error("Failed to create alarm");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cloudwatch-alarms"] });
      toast.success("Alarm created successfully");
    },
    onError: (error) => {
      toast.error(`Failed to create alarm: ${error.message}`);
    },
  });
}

export function useUpdateCloudWatchAlarmState() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      alarmName,
      action,
      stateValue,
      stateReason,
      stateReasonData,
    }: {
      alarmName: string;
      action: "setState" | "enableActions" | "disableActions";
      stateValue?: "OK" | "ALARM" | "INSUFFICIENT_DATA";
      stateReason?: string;
      stateReasonData?: string;
    }) => {
      const response = await fetch(
        `/api/cloudwatch/alarms/${encodeURIComponent(alarmName)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            stateValue,
            stateReason,
            stateReasonData,
          }),
        },
      );
      if (!response.ok) throw new Error("Failed to update alarm");
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["cloudwatch-alarms"] });
      queryClient.invalidateQueries({
        queryKey: ["cloudwatch-alarm", variables.alarmName],
      });
      toast.success("Alarm updated successfully");
    },
    onError: (error) => {
      toast.error(`Failed to update alarm: ${error.message}`);
    },
  });
}

export function useDeleteCloudWatchAlarm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (alarmName: string) => {
      const response = await fetch(
        `/api/cloudwatch/alarms/${encodeURIComponent(alarmName)}`,
        {
          method: "DELETE",
        },
      );
      if (!response.ok) throw new Error("Failed to delete alarm");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cloudwatch-alarms"] });
      toast.success("Alarm deleted successfully");
    },
    onError: (error) => {
      toast.error(`Failed to delete alarm: ${error.message}`);
    },
  });
}

export function useCloudWatchAlarmHistory(
  alarmName: string,
  options?: {
    historyItemType?: "ConfigurationUpdate" | "StateUpdate" | "Action";
    startDate?: number;
    endDate?: number;
    scanBy?: "TimestampDescending" | "TimestampAscending";
  },
  enabled = true,
) {
  return useQuery({
    queryKey: ["cloudwatch-alarm-history", alarmName, options],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options?.historyItemType)
        params.append("historyItemType", options.historyItemType);
      if (options?.startDate)
        params.append("startDate", String(options.startDate));
      if (options?.endDate) params.append("endDate", String(options.endDate));
      if (options?.scanBy) params.append("scanBy", options.scanBy);

      const response = await fetch(
        `/api/cloudwatch/alarms/${encodeURIComponent(alarmName)}/history?${params}`,
      );
      if (!response.ok) throw new Error("Failed to fetch alarm history");
      const data = await response.json();
      return data.alarmHistoryItems as CloudWatchAlarmHistory[];
    },
    enabled: enabled && !!alarmName,
  });
}
