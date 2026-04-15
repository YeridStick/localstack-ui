"use client";

import { useState } from "react";
import {
  useCreateTable,
  type CreateDynamoDBTableRequest,
} from "@/hooks/use-dynamodb";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, AlertCircle } from "lucide-react";

interface CreateTableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface AttributeDefinition {
  attributeName: string;
  attributeType: "S" | "N" | "B";
}

interface KeySchemaElement {
  attributeName: string;
  keyType: "HASH" | "RANGE";
}

interface GlobalSecondaryIndexConfig {
  indexName: string;
  partitionKey: string;
  partitionKeyType: "S" | "N" | "B";
  sortKey?: string;
  sortKeyType?: "S" | "N" | "B";
  projectionType: "ALL" | "KEYS_ONLY" | "INCLUDE";
  nonKeyAttributes?: string;
  readCapacityUnits?: string;
  writeCapacityUnits?: string;
}

interface LocalSecondaryIndexConfig {
  indexName: string;
  sortKey: string;
  sortKeyType: "S" | "N" | "B";
  projectionType: "ALL" | "KEYS_ONLY" | "INCLUDE";
  nonKeyAttributes?: string;
}

const TABLE_NAME_REGEX = /^[a-zA-Z0-9_.-]{3,255}$/;
const ATTRIBUTE_NAME_REGEX = /^[a-zA-Z0-9_.-]{1,255}$/;

export function CreateTableDialog({
  open,
  onOpenChange,
}: CreateTableDialogProps) {
  const [tableName, setTableName] = useState("");
  const [billingMode, setBillingMode] = useState<
    "PAY_PER_REQUEST" | "PROVISIONED"
  >("PAY_PER_REQUEST");
  const [readCapacity, setReadCapacity] = useState("5");
  const [writeCapacity, setWriteCapacity] = useState("5");
  const [partitionKeyType, setPartitionKeyType] = useState<"S" | "N" | "B">("S");
  const [sortKeyType, setSortKeyType] = useState<"S" | "N" | "B">("S");
  const [tableClass, setTableClass] = useState<
    "STANDARD" | "STANDARD_INFREQUENT_ACCESS"
  >("STANDARD");
  const [deletionProtectionEnabled, setDeletionProtectionEnabled] = useState(false);
  const [streamEnabled, setStreamEnabled] = useState(false);
  const [streamViewType, setStreamViewType] = useState<
    "NEW_IMAGE" | "OLD_IMAGE" | "NEW_AND_OLD_IMAGES" | "KEYS_ONLY"
  >("NEW_AND_OLD_IMAGES");
  const [formError, setFormError] = useState<string | null>(null);
  const [globalSecondaryIndexes, setGlobalSecondaryIndexes] = useState<
    GlobalSecondaryIndexConfig[]
  >([]);
  const [localSecondaryIndexes, setLocalSecondaryIndexes] = useState<
    LocalSecondaryIndexConfig[]
  >([]);
  const [attributes, setAttributes] = useState<AttributeDefinition[]>([
    { attributeName: "", attributeType: "S" },
  ]);
  const [partitionKey, setPartitionKey] = useState("");
  const [sortKey, setSortKey] = useState("");

  const createTable = useCreateTable();

  const handleAddAttribute = () => {
    setAttributes([...attributes, { attributeName: "", attributeType: "S" }]);
  };

  const handleRemoveAttribute = (index: number) => {
    setAttributes(attributes.filter((_, i) => i !== index));
  };

  const handleAttributeChange = (
    index: number,
    field: keyof AttributeDefinition,
    value: string,
  ) => {
    const newAttributes = [...attributes];
    newAttributes[index] = { ...newAttributes[index], [field]: value };
    setAttributes(newAttributes);
  };

  const addGsi = () => {
    setGlobalSecondaryIndexes((prev) => [
      ...prev,
      {
        indexName: "",
        partitionKey: "",
        partitionKeyType: "S",
        projectionType: "ALL",
        readCapacityUnits: "5",
        writeCapacityUnits: "5",
      },
    ]);
  };

  const removeGsi = (index: number) => {
    setGlobalSecondaryIndexes((prev) => prev.filter((_, i) => i !== index));
  };

  const updateGsi = (
    index: number,
    field: keyof GlobalSecondaryIndexConfig,
    value: string,
  ) => {
    setGlobalSecondaryIndexes((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, [field]: value } : item,
      ),
    );
  };

  const addLsi = () => {
    setLocalSecondaryIndexes((prev) => [
      ...prev,
      {
        indexName: "",
        sortKey: "",
        sortKeyType: "S",
        projectionType: "ALL",
      },
    ]);
  };

  const removeLsi = (index: number) => {
    setLocalSecondaryIndexes((prev) => prev.filter((_, i) => i !== index));
  };

  const updateLsi = (
    index: number,
    field: keyof LocalSecondaryIndexConfig,
    value: string,
  ) => {
    setLocalSecondaryIndexes((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, [field]: value } : item,
      ),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    try {

    // Filter out empty attributes and normalize names
    const validAttributes = attributes
      .map((attr) => ({
        attributeName: attr.attributeName.trim(),
        attributeType: attr.attributeType,
      }))
      .filter((attr) => attr.attributeName);

    const normalizedTableName = tableName.trim();
    const normalizedPartitionKey = partitionKey.trim();
    const normalizedSortKey = sortKey.trim();

    if (!TABLE_NAME_REGEX.test(normalizedTableName)) {
      setFormError(
        "Table name must be 3-255 chars and can only use letters, numbers, underscore, dot, or hyphen.",
      );
      return;
    }
    if (!ATTRIBUTE_NAME_REGEX.test(normalizedPartitionKey)) {
      setFormError(
        "Partition key name is required and only supports letters, numbers, underscore, dot, or hyphen.",
      );
      return;
    }
    if (normalizedSortKey && !ATTRIBUTE_NAME_REGEX.test(normalizedSortKey)) {
      setFormError("Sort key has invalid characters.");
      return;
    }

    // Build key schema
    const keySchema: KeySchemaElement[] = [
      { attributeName: normalizedPartitionKey, keyType: "HASH" },
    ];
    if (normalizedSortKey) {
      keySchema.push({ attributeName: normalizedSortKey, keyType: "RANGE" });
    }

    // Merge keys from table and secondary indexes into attribute definitions
    const attributeTypeMap = new Map<string, "S" | "N" | "B">(
      validAttributes.map((attr) => [attr.attributeName, attr.attributeType]),
    );

    const mergeAttribute = (
      name: string,
      type: "S" | "N" | "B",
      source: string,
    ) => {
      if (!ATTRIBUTE_NAME_REGEX.test(name)) {
        throw new Error(`Invalid attribute name in ${source}: ${name}`);
      }
      const existing = attributeTypeMap.get(name);
      if (existing && existing !== type) {
        throw new Error(
          `Attribute type conflict for "${name}" in ${source}: ${existing} vs ${type}`,
        );
      }
      attributeTypeMap.set(name, type);
    };

    mergeAttribute(normalizedPartitionKey, partitionKeyType, "table primary key");
    if (normalizedSortKey) {
      mergeAttribute(normalizedSortKey, sortKeyType, "table primary key");
    }

    const normalizedGsis = globalSecondaryIndexes.map((gsi) => {
      const indexName = gsi.indexName.trim();
      const gsiPartitionKey = (gsi.partitionKey || "").trim();
      const gsiSortKey = (gsi.sortKey || "").trim();

      if (!TABLE_NAME_REGEX.test(indexName)) {
        throw new Error(`Invalid GSI name: ${indexName || "(empty)"}`);
      }
      if (!ATTRIBUTE_NAME_REGEX.test(gsiPartitionKey)) {
        throw new Error(`Invalid GSI partition key in ${indexName}`);
      }
      if (gsiSortKey && !ATTRIBUTE_NAME_REGEX.test(gsiSortKey)) {
        throw new Error(`Invalid GSI sort key in ${indexName}`);
      }

      mergeAttribute(gsiPartitionKey, gsi.partitionKeyType, `GSI ${indexName}`);
      if (gsiSortKey) {
        mergeAttribute(
          gsiSortKey,
          gsi.sortKeyType || "S",
          `GSI ${indexName}`,
        );
      }

      const projectionType = gsi.projectionType || "ALL";
      const nonKeyAttributes =
        projectionType === "INCLUDE"
          ? (gsi.nonKeyAttributes || "")
              .split(",")
              .map((value) => value.trim())
              .filter(Boolean)
          : undefined;

      return {
        indexName,
        keySchema: [
          { attributeName: gsiPartitionKey, keyType: "HASH" as const },
          ...(gsiSortKey
            ? [{ attributeName: gsiSortKey, keyType: "RANGE" as const }]
            : []),
        ],
        projection: {
          projectionType,
          ...(projectionType === "INCLUDE" ? { nonKeyAttributes } : {}),
        },
        provisionedThroughput:
          billingMode === "PROVISIONED"
            ? {
                readCapacityUnits: Number(gsi.readCapacityUnits || "1"),
                writeCapacityUnits: Number(gsi.writeCapacityUnits || "1"),
              }
            : undefined,
      };
    });

    const normalizedLsis = localSecondaryIndexes.map((lsi) => {
      const indexName = lsi.indexName.trim();
      const lsiSortKey = lsi.sortKey.trim();

      if (!TABLE_NAME_REGEX.test(indexName)) {
        throw new Error(`Invalid LSI name: ${indexName || "(empty)"}`);
      }
      if (!ATTRIBUTE_NAME_REGEX.test(lsiSortKey)) {
        throw new Error(`Invalid LSI sort key in ${indexName}`);
      }

      mergeAttribute(lsiSortKey, lsi.sortKeyType, `LSI ${indexName}`);

      const projectionType = lsi.projectionType || "ALL";
      const nonKeyAttributes =
        projectionType === "INCLUDE"
          ? (lsi.nonKeyAttributes || "")
              .split(",")
              .map((value) => value.trim())
              .filter(Boolean)
          : undefined;

      return {
        indexName,
        keySchema: [
          { attributeName: normalizedPartitionKey, keyType: "HASH" as const },
          { attributeName: lsiSortKey, keyType: "RANGE" as const },
        ],
        projection: {
          projectionType,
          ...(projectionType === "INCLUDE" ? { nonKeyAttributes } : {}),
        },
      };
    });

    const finalAttributeDefinitions = Array.from(attributeTypeMap.entries()).map(
      ([attributeName, attributeType]) => ({ attributeName, attributeType }),
    );

    const tableConfig: CreateDynamoDBTableRequest = {
      tableName: normalizedTableName,
      attributeDefinitions: finalAttributeDefinitions,
      keySchema,
      billingMode,
      tableClass,
      deletionProtectionEnabled,
      globalSecondaryIndexes: normalizedGsis,
      localSecondaryIndexes: normalizedLsis,
      streamSpecification: streamEnabled
        ? {
            streamEnabled: true,
            streamViewType,
          }
        : undefined,
    };

    if (billingMode === "PROVISIONED") {
      tableConfig.provisionedThroughput = {
        readCapacityUnits: Number(readCapacity),
        writeCapacityUnits: Number(writeCapacity),
      };
    }

    createTable.mutate(tableConfig, {
      onSuccess: () => {
        onOpenChange(false);
        resetForm();
      },
    });
    } catch (error) {
      console.error("Create table validation error:", error);
      setFormError(
        error instanceof Error
          ? error.message
          : "Invalid table configuration. Please review the form.",
      );
    }
  };

  const resetForm = () => {
    setTableName("");
    setBillingMode("PAY_PER_REQUEST");
    setReadCapacity("5");
    setWriteCapacity("5");
    setPartitionKeyType("S");
    setSortKeyType("S");
    setTableClass("STANDARD");
    setDeletionProtectionEnabled(false);
    setStreamEnabled(false);
    setStreamViewType("NEW_AND_OLD_IMAGES");
    setGlobalSecondaryIndexes([]);
    setLocalSecondaryIndexes([]);
    setAttributes([{ attributeName: "", attributeType: "S" }]);
    setPartitionKey("");
    setSortKey("");
    setFormError(null);
  };

  const isValid =
    TABLE_NAME_REGEX.test(tableName.trim()) &&
    ATTRIBUTE_NAME_REGEX.test(partitionKey.trim()) &&
    (!sortKey.trim() || ATTRIBUTE_NAME_REGEX.test(sortKey.trim())) &&
    (billingMode === "PAY_PER_REQUEST" ||
      (Number(readCapacity) > 0 && Number(writeCapacity) > 0));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create DynamoDB Table</DialogTitle>
            <DialogDescription>
              Configure keys, capacity, indexes, streams, and table options similar to AWS.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {formError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="tableName">Table Name</Label>
              <Input
                id="tableName"
                value={tableName}
                onChange={(e) => setTableName(e.target.value)}
                placeholder="my-table"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Primary Key</Label>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label
                    htmlFor="partitionKey"
                    className="text-sm text-muted-foreground"
                  >
                    Partition Key (Required)
                  </Label>
                  <Input
                    id="partitionKey"
                    value={partitionKey}
                    onChange={(e) => setPartitionKey(e.target.value)}
                    placeholder="id"
                    required
                  />
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">
                    Partition Key Type
                  </Label>
                  <Select
                    value={partitionKeyType}
                    onValueChange={(value) =>
                      setPartitionKeyType(value as "S" | "N" | "B")
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="S">String</SelectItem>
                      <SelectItem value="N">Number</SelectItem>
                      <SelectItem value="B">Binary</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label
                    htmlFor="sortKey"
                    className="text-sm text-muted-foreground"
                  >
                    Sort Key (Optional)
                  </Label>
                  <Input
                    id="sortKey"
                    value={sortKey}
                    onChange={(e) => setSortKey(e.target.value)}
                    placeholder="timestamp"
                  />
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">
                    Sort Key Type
                  </Label>
                  <Select
                    value={sortKeyType}
                    onValueChange={(value) =>
                      setSortKeyType(value as "S" | "N" | "B")
                    }
                    disabled={!sortKey.trim()}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="S">String</SelectItem>
                      <SelectItem value="N">Number</SelectItem>
                      <SelectItem value="B">Binary</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Attribute Definitions</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddAttribute}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Attribute
                </Button>
              </div>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Define attributes that will be used in indexes. Key attributes
                  will be added automatically.
                </AlertDescription>
              </Alert>
              <div className="space-y-2">
                {attributes.map((attr, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={attr.attributeName}
                      onChange={(e) =>
                        handleAttributeChange(
                          index,
                          "attributeName",
                          e.target.value,
                        )
                      }
                      placeholder="Attribute name"
                      className="flex-1"
                    />
                    <Select
                      value={attr.attributeType}
                      onValueChange={(value) =>
                        handleAttributeChange(
                          index,
                          "attributeType",
                          value as "S" | "N" | "B",
                        )
                      }
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="S">String</SelectItem>
                        <SelectItem value="N">Number</SelectItem>
                        <SelectItem value="B">Binary</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveAttribute(index)}
                      disabled={attributes.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Billing Mode</Label>
              <RadioGroup
                value={billingMode}
                onValueChange={(value) =>
                  setBillingMode(value as "PAY_PER_REQUEST" | "PROVISIONED")
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="PAY_PER_REQUEST" id="on-demand" />
                  <Label htmlFor="on-demand" className="font-normal">
                    On-Demand (Pay per request)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="PROVISIONED" id="provisioned" />
                  <Label htmlFor="provisioned" className="font-normal">
                    Provisioned (Fixed capacity)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {billingMode === "PROVISIONED" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="readCapacity">Read Capacity Units</Label>
                  <Input
                    id="readCapacity"
                    type="number"
                    min="1"
                    value={readCapacity}
                    onChange={(e) => setReadCapacity(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="writeCapacity">Write Capacity Units</Label>
                  <Input
                    id="writeCapacity"
                    type="number"
                    min="1"
                    value={writeCapacity}
                    onChange={(e) => setWriteCapacity(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            <div className="rounded-md border p-4 space-y-4">
              <Label className="text-base">Advanced Options</Label>
              <div className="space-y-2">
                <Label>Table Class</Label>
                <Select
                  value={tableClass}
                  onValueChange={(value) =>
                    setTableClass(
                      value as "STANDARD" | "STANDARD_INFREQUENT_ACCESS",
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STANDARD">STANDARD</SelectItem>
                    <SelectItem value="STANDARD_INFREQUENT_ACCESS">
                      STANDARD_INFREQUENT_ACCESS
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Deletion Protection</p>
                  <p className="text-xs text-muted-foreground">
                    Prevent accidental table deletion.
                  </p>
                </div>
                <Switch
                  checked={deletionProtectionEnabled}
                  onCheckedChange={setDeletionProtectionEnabled}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">DynamoDB Streams</p>
                    <p className="text-xs text-muted-foreground">
                      Capture item-level changes.
                    </p>
                  </div>
                  <Switch checked={streamEnabled} onCheckedChange={setStreamEnabled} />
                </div>
                {streamEnabled && (
                  <Select
                    value={streamViewType}
                    onValueChange={(value) =>
                      setStreamViewType(
                        value as
                          | "NEW_IMAGE"
                          | "OLD_IMAGE"
                          | "NEW_AND_OLD_IMAGES"
                          | "KEYS_ONLY",
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NEW_IMAGE">NEW_IMAGE</SelectItem>
                      <SelectItem value="OLD_IMAGE">OLD_IMAGE</SelectItem>
                      <SelectItem value="NEW_AND_OLD_IMAGES">
                        NEW_AND_OLD_IMAGES
                      </SelectItem>
                      <SelectItem value="KEYS_ONLY">KEYS_ONLY</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            <div className="rounded-md border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Global Secondary Indexes</Label>
                  <p className="text-xs text-muted-foreground">
                    Up to 20 GSIs. Each index has its own partition/sort keys.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addGsi}
                  disabled={globalSecondaryIndexes.length >= 20}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add GSI
                </Button>
              </div>
              {globalSecondaryIndexes.map((gsi, index) => (
                <div key={`gsi-${index}`} className="border rounded-md p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">GSI #{index + 1}</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeGsi(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <Input
                      placeholder="Index name"
                      value={gsi.indexName}
                      onChange={(e) => updateGsi(index, "indexName", e.target.value)}
                    />
                    <Input
                      placeholder="Partition key"
                      value={gsi.partitionKey}
                      onChange={(e) =>
                        updateGsi(index, "partitionKey", e.target.value)
                      }
                    />
                    <Select
                      value={gsi.partitionKeyType}
                      onValueChange={(value) =>
                        updateGsi(index, "partitionKeyType", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="S">String</SelectItem>
                        <SelectItem value="N">Number</SelectItem>
                        <SelectItem value="B">Binary</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <Input
                      placeholder="Sort key (optional)"
                      value={gsi.sortKey || ""}
                      onChange={(e) => updateGsi(index, "sortKey", e.target.value)}
                    />
                    <Select
                      value={gsi.sortKeyType || "S"}
                      onValueChange={(value) => updateGsi(index, "sortKeyType", value)}
                      disabled={!gsi.sortKey}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="S">String</SelectItem>
                        <SelectItem value="N">Number</SelectItem>
                        <SelectItem value="B">Binary</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={gsi.projectionType}
                      onValueChange={(value) =>
                        updateGsi(index, "projectionType", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">ALL</SelectItem>
                        <SelectItem value="KEYS_ONLY">KEYS_ONLY</SelectItem>
                        <SelectItem value="INCLUDE">INCLUDE</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {gsi.projectionType === "INCLUDE" && (
                    <Input
                      placeholder="Non-key attributes (comma separated)"
                      value={gsi.nonKeyAttributes || ""}
                      onChange={(e) =>
                        updateGsi(index, "nonKeyAttributes", e.target.value)
                      }
                    />
                  )}
                  {billingMode === "PROVISIONED" && (
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="number"
                        min="1"
                        placeholder="GSI RCU"
                        value={gsi.readCapacityUnits || "5"}
                        onChange={(e) =>
                          updateGsi(index, "readCapacityUnits", e.target.value)
                        }
                      />
                      <Input
                        type="number"
                        min="1"
                        placeholder="GSI WCU"
                        value={gsi.writeCapacityUnits || "5"}
                        onChange={(e) =>
                          updateGsi(index, "writeCapacityUnits", e.target.value)
                        }
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="rounded-md border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Local Secondary Indexes</Label>
                  <p className="text-xs text-muted-foreground">
                    Up to 5 LSIs. They share table partition key.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addLsi}
                  disabled={localSecondaryIndexes.length >= 5}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add LSI
                </Button>
              </div>
              {localSecondaryIndexes.map((lsi, index) => (
                <div key={`lsi-${index}`} className="border rounded-md p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">LSI #{index + 1}</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeLsi(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <Input
                      placeholder="Index name"
                      value={lsi.indexName}
                      onChange={(e) => updateLsi(index, "indexName", e.target.value)}
                    />
                    <Input
                      placeholder="Sort key"
                      value={lsi.sortKey}
                      onChange={(e) => updateLsi(index, "sortKey", e.target.value)}
                    />
                    <Select
                      value={lsi.sortKeyType}
                      onValueChange={(value) => updateLsi(index, "sortKeyType", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="S">String</SelectItem>
                        <SelectItem value="N">Number</SelectItem>
                        <SelectItem value="B">Binary</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <Select
                      value={lsi.projectionType}
                      onValueChange={(value) =>
                        updateLsi(index, "projectionType", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">ALL</SelectItem>
                        <SelectItem value="KEYS_ONLY">KEYS_ONLY</SelectItem>
                        <SelectItem value="INCLUDE">INCLUDE</SelectItem>
                      </SelectContent>
                    </Select>
                    {lsi.projectionType === "INCLUDE" && (
                      <Input
                        placeholder="Non-key attributes (comma separated)"
                        value={lsi.nonKeyAttributes || ""}
                        onChange={(e) =>
                          updateLsi(index, "nonKeyAttributes", e.target.value)
                        }
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createTable.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!isValid || createTable.isPending}>
              {createTable.isPending ? "Creating..." : "Create Table"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
