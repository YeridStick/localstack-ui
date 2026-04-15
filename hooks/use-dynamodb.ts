import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DynamoDBTable } from "@/types";
import { toast } from "sonner";

export type DynamoScalarType = "S" | "N" | "B";
export type DynamoProjectionType = "ALL" | "KEYS_ONLY" | "INCLUDE";

export interface CreateTableAttributeDefinition {
  attributeName: string;
  attributeType: DynamoScalarType;
}

export interface CreateTableKeySchemaElement {
  attributeName: string;
  keyType: "HASH" | "RANGE";
}

export interface CreateTableProjection {
  projectionType: DynamoProjectionType;
  nonKeyAttributes?: string[];
}

export interface CreateTableGlobalSecondaryIndex {
  indexName: string;
  keySchema: CreateTableKeySchemaElement[];
  projection: CreateTableProjection;
  provisionedThroughput?: {
    readCapacityUnits: number;
    writeCapacityUnits: number;
  };
}

export interface CreateTableLocalSecondaryIndex {
  indexName: string;
  keySchema: CreateTableKeySchemaElement[];
  projection: CreateTableProjection;
}

export interface CreateDynamoDBTableRequest {
  tableName: string;
  attributeDefinitions: CreateTableAttributeDefinition[];
  keySchema: CreateTableKeySchemaElement[];
  billingMode?: "PAY_PER_REQUEST" | "PROVISIONED";
  provisionedThroughput?: {
    readCapacityUnits: number;
    writeCapacityUnits: number;
  };
  globalSecondaryIndexes?: CreateTableGlobalSecondaryIndex[];
  localSecondaryIndexes?: CreateTableLocalSecondaryIndex[];
  streamSpecification?: {
    streamEnabled: boolean;
    streamViewType?: "NEW_IMAGE" | "OLD_IMAGE" | "NEW_AND_OLD_IMAGES" | "KEYS_ONLY";
  };
  tableClass?: "STANDARD" | "STANDARD_INFREQUENT_ACCESS";
  deletionProtectionEnabled?: boolean;
  tags?: Array<{ key: string; value: string }>;
}

// List all tables
export function useDynamoDBTables() {
  return useQuery({
    queryKey: ["dynamodb-tables"],
    queryFn: async () => {
      const response = await fetch("/api/dynamodb/tables");
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch tables");
      }
      const data = await response.json();
      return data.tables as DynamoDBTable[];
    },
  });
}

// Get single table details
export function useDynamoDBTable(tableName: string) {
  return useQuery({
    queryKey: ["dynamodb-table", tableName],
    queryFn: async () => {
      if (!tableName) return null;

      const response = await fetch(
        `/api/dynamodb/tables/${encodeURIComponent(tableName)}`,
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch table details");
      }
      return response.json();
    },
    enabled: !!tableName,
  });
}

// Create table
export function useCreateTable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tableConfig: CreateDynamoDBTableRequest) => {
      const response = await fetch("/api/dynamodb/tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tableConfig),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create table");
      }

      return response.json();
    },
    onSuccess: (_, { tableName }) => {
      queryClient.invalidateQueries({ queryKey: ["dynamodb-tables"] });
      toast.success(`Table "${tableName}" created successfully`);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create table");
    },
  });
}

// Delete table
export function useDeleteTable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tableName: string) => {
      const response = await fetch(
        `/api/dynamodb/tables?tableName=${encodeURIComponent(tableName)}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete table");
      }

      return response.json();
    },
    onSuccess: (_, tableName) => {
      queryClient.invalidateQueries({ queryKey: ["dynamodb-tables"] });
      queryClient.removeQueries({ queryKey: ["dynamodb-table", tableName] });
      queryClient.removeQueries({ queryKey: ["dynamodb-items", tableName] });
      toast.success(`Table "${tableName}" deleted successfully`);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete table");
    },
  });
}

// Update table
export function useUpdateTable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tableName,
      updates,
    }: {
      tableName: string;
      updates: {
        provisionedThroughput?: {
          readCapacityUnits: number;
          writeCapacityUnits: number;
        };
        globalSecondaryIndexUpdates?: any[];
        streamSpecification?: any;
      };
    }) => {
      const response = await fetch(
        `/api/dynamodb/tables/${encodeURIComponent(tableName)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update table");
      }

      return response.json();
    },
    onSuccess: (_, { tableName }) => {
      queryClient.invalidateQueries({ queryKey: ["dynamodb-tables"] });
      queryClient.invalidateQueries({
        queryKey: ["dynamodb-table", tableName],
      });
      toast.success("Table updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update table");
    },
  });
}

// Scan or query items
export function useDynamoDBItems(
  tableName: string,
  options?: {
    operation?: "scan" | "query";
    keyConditionExpression?: string;
    expressionAttributeNames?: Record<string, string>;
    expressionAttributeValues?: Record<string, any>;
    limit?: number;
  },
) {
  return useQuery({
    queryKey: ["dynamodb-items", tableName, options],
    queryFn: async () => {
      if (!tableName) return { items: [], count: 0 };

      const params = new URLSearchParams({
        tableName,
        operation: options?.operation || "scan",
        limit: String(options?.limit || 50),
      });

      if (options?.keyConditionExpression) {
        params.append("keyConditionExpression", options.keyConditionExpression);
      }
      if (options?.expressionAttributeNames) {
        params.append(
          "expressionAttributeNames",
          JSON.stringify(options.expressionAttributeNames),
        );
      }
      if (options?.expressionAttributeValues) {
        params.append(
          "expressionAttributeValues",
          JSON.stringify(options.expressionAttributeValues),
        );
      }

      const response = await fetch(`/api/dynamodb/items?${params}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch items");
      }

      return response.json();
    },
    enabled: !!tableName,
  });
}

// Create or update item
export function usePutItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tableName,
      item,
    }: {
      tableName: string;
      item: Record<string, any>;
    }) => {
      const response = await fetch("/api/dynamodb/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableName, item }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save item");
      }

      return response.json();
    },
    onSuccess: (_, { tableName }) => {
      queryClient.invalidateQueries({
        queryKey: ["dynamodb-items", tableName],
      });
      toast.success("Item saved successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to save item");
    },
  });
}

// Delete item
export function useDeleteItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tableName,
      key,
    }: {
      tableName: string;
      key: Record<string, any>;
    }) => {
      const params = new URLSearchParams({
        tableName,
        key: JSON.stringify(key),
      });

      const response = await fetch(`/api/dynamodb/items/delete?${params}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete item");
      }

      return response.json();
    },
    onSuccess: (_, { tableName }) => {
      queryClient.invalidateQueries({
        queryKey: ["dynamodb-items", tableName],
      });
      toast.success("Item deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete item");
    },
  });
}

// Get single item
export function useDynamoDBItem(
  tableName: string,
  key: Record<string, any> | null,
) {
  return useQuery({
    queryKey: ["dynamodb-item", tableName, key],
    queryFn: async () => {
      if (!tableName || !key) return null;

      const params = new URLSearchParams({
        tableName,
        key: JSON.stringify(key),
      });

      const response = await fetch(`/api/dynamodb/items/get?${params}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch item");
      }

      const data = await response.json();
      return data.item;
    },
    enabled: !!tableName && !!key,
  });
}
