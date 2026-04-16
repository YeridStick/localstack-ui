import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SQSQueue, SQSMessage } from "@/types";
import { toast } from "sonner";
import { getHealthRefreshIntervalMs, isAutoRefreshEnabled } from "@/lib/aws/runtime-config";

const AUTO_REFRESH = isAutoRefreshEnabled();
const BASE_REFRESH_MS = getHealthRefreshIntervalMs();

// List all queues
export function useSQSQueues() {
  return useQuery({
    queryKey: ["sqs-queues"],
    queryFn: async () => {
      const response = await fetch("/api/sqs/queues");
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch queues");
      }
      const data = await response.json();
      return data.queues as SQSQueue[];
    },
  });
}

// Create queue
export function useCreateQueue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      queueName,
      attributes,
    }: {
      queueName: string;
      attributes?: Record<string, string>;
    }) => {
      const response = await fetch("/api/sqs/queues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queueName, attributes }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create queue");
      }

      return response.json();
    },
    onSuccess: (_, { queueName }) => {
      queryClient.invalidateQueries({ queryKey: ["sqs-queues"] });
      toast.success(`Queue "${queueName}" created successfully`);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create queue");
    },
  });
}

// Delete queue
export function useDeleteQueue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (queueUrl: string) => {
      const response = await fetch(
        `/api/sqs/queues?queueUrl=${encodeURIComponent(queueUrl)}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete queue");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sqs-queues"] });
      toast.success("Queue deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete queue");
    },
  });
}

// Purge queue
export function usePurgeQueue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (queueUrl: string) => {
      const response = await fetch("/api/sqs/queues/purge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queueUrl }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to purge queue");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sqs-messages"] });
      toast.success("Queue purged successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to purge queue");
    },
  });
}

// Get messages from queue
export function useSQSMessages(queueUrl: string) {
  return useQuery({
    queryKey: ["sqs-messages", queueUrl],
    queryFn: async () => {
      if (!queueUrl) return [];

      const params = new URLSearchParams({ queueUrl });
      const response = await fetch(`/api/sqs/messages?${params}`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch messages");
      }

      const data = await response.json();
      return data.messages as SQSMessage[];
    },
    enabled: !!queueUrl,
    refetchInterval: AUTO_REFRESH ? BASE_REFRESH_MS : false,
  });
}

// Send message
export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      queueUrl,
      messageBody,
      messageAttributes,
      delaySeconds,
    }: {
      queueUrl: string;
      messageBody: string;
      messageAttributes?: Record<string, any>;
      delaySeconds?: number;
    }) => {
      const response = await fetch("/api/sqs/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          queueUrl,
          messageBody,
          messageAttributes,
          delaySeconds,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to send message");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sqs-messages"] });
      toast.success("Message sent successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to send message");
    },
  });
}

// Delete message
export function useDeleteMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      queueUrl,
      receiptHandle,
    }: {
      queueUrl: string;
      receiptHandle: string;
    }) => {
      const params = new URLSearchParams({ queueUrl, receiptHandle });
      const response = await fetch(`/api/sqs/messages?${params}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete message");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sqs-messages"] });
      toast.success("Message deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete message");
    },
  });
}

// Get queue attributes
export function useQueueAttributes(queueUrl: string) {
  return useQuery({
    queryKey: ["sqs-queue-attributes", queueUrl],
    queryFn: async () => {
      if (!queueUrl) return null;

      const params = new URLSearchParams({ queueUrl });
      const response = await fetch(`/api/sqs/queues/attributes?${params}`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch queue attributes");
      }

      return response.json();
    },
    enabled: !!queueUrl,
  });
}
