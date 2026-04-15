"use client";

import { useState } from "react";
import { useDynamoDBTable } from "@/hooks/use-dynamodb";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Database, Key, Hash, SortAsc } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { formatBytes } from "@/lib/utils";
import { ItemBrowser } from "./item-browser";

interface TableViewerProps {
  tableName: string;
  onBack: () => void;
}

function getAttrName(
  entry: { attributeName?: string; AttributeName?: string } | undefined,
): string {
  return entry?.attributeName || entry?.AttributeName || "";
}

function getKeyType(
  entry: { keyType?: string; KeyType?: string } | undefined,
): string {
  return entry?.keyType || entry?.KeyType || "";
}

function getIndexName(
  index: { indexName?: string; IndexName?: string } | undefined,
): string {
  return index?.indexName || index?.IndexName || "";
}

export function TableViewer({ tableName, onBack }: TableViewerProps) {
  const [activeTab, setActiveTab] = useState("items");
  const { data: table, isLoading, error } = useDynamoDBTable(tableName);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive">
          Failed to load table details: {error.message}
        </p>
        <Button onClick={onBack} variant="outline" className="mt-4">
          Back to Tables
        </Button>
      </div>
    );
  }

  if (!table) {
    return null;
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      ACTIVE: { variant: "default" as const, label: "Active" },
      CREATING: { variant: "secondary" as const, label: "Creating" },
      UPDATING: { variant: "secondary" as const, label: "Updating" },
      DELETING: { variant: "destructive" as const, label: "Deleting" },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || {
      variant: "outline" as const,
      label: status,
    };

    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button onClick={onBack} variant="ghost" size="icon">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Database className="h-6 w-6" />
            {tableName}
          </h2>
          <p className="text-muted-foreground">
            Created{" "}
            {formatDistanceToNow(new Date(table.creationDateTime), {
              addSuffix: true,
            })}
          </p>
        </div>
        {getStatusBadge(table.tableStatus)}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="items">Items</TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="indexes">Indexes</TabsTrigger>
        </TabsList>

        <TabsContent value="items" className="mt-4">
          <ItemBrowser tableName={tableName} keySchema={table.keySchema} />
        </TabsContent>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">
                  Item Count
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {table.itemCount.toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">
                  Table Size
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatBytes(table.tableSizeBytes)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">
                  Billing Mode
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(table.billingMode || table.BillingModeSummary?.BillingMode) === "PAY_PER_REQUEST"
                    ? "On-Demand"
                    : "Provisioned"}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Primary Key Schema</CardTitle>
              <CardDescription>
                The primary key uniquely identifies each item in the table
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {table.keySchema?.map(
                  (
                    key: {
                      attributeName?: string;
                      AttributeName?: string;
                      keyType?: string;
                      KeyType?: string;
                    },
                    keyIndex: number,
                  ) => {
                    const attributeName = getAttrName(key);
                    const keyType = getKeyType(key);
                    return (
                    <div
                      key={`${attributeName || "primary"}-${keyType || "unknown"}-${keyIndex}`}
                      className="flex items-center gap-2"
                    >
                      {keyType === "HASH" ? (
                        <Hash className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <SortAsc className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="font-medium">{attributeName || "-"}</span>
                      <Badge variant="outline">
                        {keyType === "HASH" ? "Partition Key" : "Sort Key"}
                      </Badge>
                      <Badge variant="secondary">
                        {table.attributeDefinitions?.find(
                          (attr: {
                            attributeName?: string;
                            AttributeName?: string;
                            attributeType?: string;
                            AttributeType?: string;
                          }) => getAttrName(attr) === attributeName,
                        )?.attributeType ||
                          table.attributeDefinitions?.find(
                            (attr: {
                              attributeName?: string;
                              AttributeName?: string;
                              attributeType?: string;
                              AttributeType?: string;
                            }) => getAttrName(attr) === attributeName,
                          )?.AttributeType ||
                          "Unknown"}
                      </Badge>
                    </div>
                  )},
                )}
              </div>
            </CardContent>
          </Card>

          {table.provisionedThroughput &&
            table.billingMode !== "PAY_PER_REQUEST" && (
              <Card>
                <CardHeader>
                  <CardTitle>Provisioned Throughput</CardTitle>
                  <CardDescription>
                    Read and write capacity units
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Read Capacity
                      </p>
                      <p className="text-2xl font-bold">
                        {table.provisionedThroughput.readCapacityUnits ??
                          table.provisionedThroughput.ReadCapacityUnits ??
                          0}{" "}
                        RCU
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Write Capacity
                      </p>
                      <p className="text-2xl font-bold">
                        {table.provisionedThroughput.writeCapacityUnits ??
                          table.provisionedThroughput.WriteCapacityUnits ??
                          0}{" "}
                        WCU
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
        </TabsContent>

        <TabsContent value="indexes" className="mt-4 space-y-4">
          {table.globalSecondaryIndexes &&
          table.globalSecondaryIndexes.length > 0 ? (
            <>
              <h3 className="text-lg font-semibold">
                Global Secondary Indexes
              </h3>
              {table.globalSecondaryIndexes.map((gsi: any, gsiIndex: number) => (
                <Card key={getIndexName(gsi) || `gsi-${gsiIndex}`}>
                  <CardHeader>
                    <CardTitle className="text-base">
                      {getIndexName(gsi) || `GSI ${gsiIndex + 1}`}
                    </CardTitle>
                    <CardDescription>
                      Status: {getStatusBadge(gsi.indexStatus || gsi.IndexStatus || "ACTIVE")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm font-medium">Key Schema</p>
                        {gsi.keySchema?.map(
                          (
                            key: {
                              attributeName?: string;
                              AttributeName?: string;
                              keyType?: string;
                              KeyType?: string;
                            },
                            keyIndex: number,
                          ) => {
                            const attributeName = getAttrName(key);
                            const keyType = getKeyType(key);
                            return (
                            <div
                              key={`${attributeName || "gsi-key"}-${keyType || "unknown"}-${keyIndex}`}
                              className="flex items-center gap-2 mt-1"
                            >
                              {keyType === "HASH" ? (
                                <Hash className="h-3 w-3 text-muted-foreground" />
                              ) : (
                                <SortAsc className="h-3 w-3 text-muted-foreground" />
                              )}
                              <span className="text-sm">
                                {attributeName || "-"}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {keyType === "HASH" ? "Partition" : "Sort"}
                              </Badge>
                            </div>
                          )},
                        )}
                      </div>
                      {gsi.projection && (
                        <div>
                          <p className="text-sm font-medium">Projection</p>
                          <p className="text-sm text-muted-foreground">
                            {gsi.projection.projectionType || gsi.projection.ProjectionType}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          ) : (
            <div className="text-center py-8">
              <Key className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                No secondary indexes configured
              </p>
            </div>
          )}

          {table.localSecondaryIndexes &&
            table.localSecondaryIndexes.length > 0 && (
              <>
                <h3 className="text-lg font-semibold mt-6">
                  Local Secondary Indexes
                </h3>
                {table.localSecondaryIndexes.map((lsi: any, lsiIndex: number) => (
                  <Card key={getIndexName(lsi) || `lsi-${lsiIndex}`}>
                    <CardHeader>
                      <CardTitle className="text-base">
                        {getIndexName(lsi) || `LSI ${lsiIndex + 1}`}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div>
                          <p className="text-sm font-medium">Key Schema</p>
                          {lsi.keySchema?.map(
                            (key: {
                              attributeName?: string;
                              AttributeName?: string;
                              keyType?: string;
                              KeyType?: string;
                            }, keyIndex: number) => {
                              const attributeName = getAttrName(key);
                              const keyType = getKeyType(key);
                              return (
                              <div
                                key={`${attributeName || "lsi-key"}-${keyType || "unknown"}-${keyIndex}`}
                                className="flex items-center gap-2 mt-1"
                              >
                                {keyType === "HASH" ? (
                                  <Hash className="h-3 w-3 text-muted-foreground" />
                                ) : (
                                  <SortAsc className="h-3 w-3 text-muted-foreground" />
                                )}
                                <span className="text-sm">
                                  {attributeName || "-"}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {keyType === "HASH"
                                    ? "Partition"
                                    : "Sort"}
                                </Badge>
                              </div>
                            )},
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </>
            )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
