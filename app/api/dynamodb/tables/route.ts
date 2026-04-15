import { NextRequest, NextResponse } from "next/server";
import {
  ListTablesCommand,
  CreateTableCommand,
  DeleteTableCommand,
  DescribeTableCommand,
  AttributeDefinition,
  KeySchemaElement,
} from "@aws-sdk/client-dynamodb";
import { dynamoClient } from "@/lib/aws-config";

const TABLE_NAME_REGEX = /^[a-zA-Z0-9_.-]{3,255}$/;
const ATTRIBUTE_NAME_REGEX = /^[a-zA-Z0-9_.-]{1,255}$/;
const VALID_ATTRIBUTE_TYPES = new Set(["S", "N", "B"]);
const VALID_BILLING_MODES = new Set(["PAY_PER_REQUEST", "PROVISIONED"]);
const VALID_PROJECTION_TYPES = new Set(["ALL", "KEYS_ONLY", "INCLUDE"]);
const VALID_STREAM_VIEW_TYPES = new Set([
  "NEW_IMAGE",
  "OLD_IMAGE",
  "NEW_AND_OLD_IMAGES",
  "KEYS_ONLY",
]);
const VALID_TABLE_CLASSES = new Set([
  "STANDARD",
  "STANDARD_INFREQUENT_ACCESS",
]);

function normalizeAttributeDefinitions(raw: any[]): AttributeDefinition[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error("At least one attribute definition is required.");
  }

  const deduped = new Map<string, "S" | "N" | "B">();
  raw.forEach((attr, index) => {
    const attributeName = String(attr.AttributeName ?? attr.attributeName ?? "").trim();
    const attributeType = String(attr.AttributeType ?? attr.attributeType ?? "").trim();

    if (!ATTRIBUTE_NAME_REGEX.test(attributeName)) {
      throw new Error(`Invalid attribute name at position ${index + 1}.`);
    }
    if (!VALID_ATTRIBUTE_TYPES.has(attributeType)) {
      throw new Error(`Invalid attribute type for "${attributeName}". Use S, N, or B.`);
    }

    const existing = deduped.get(attributeName);
    if (existing && existing !== attributeType) {
      throw new Error(`Conflicting types for attribute "${attributeName}".`);
    }
    deduped.set(attributeName, attributeType as "S" | "N" | "B");
  });

  return Array.from(deduped.entries()).map(([AttributeName, AttributeType]) => ({
    AttributeName,
    AttributeType,
  }));
}

function normalizeKeySchema(raw: any[], context: string): KeySchemaElement[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error(`${context}: key schema is required.`);
  }

  const normalized = raw.map((item, index) => {
    const attributeName = String(item.AttributeName ?? item.attributeName ?? "").trim();
    const keyType = String(item.KeyType ?? item.keyType ?? "").trim();

    if (!ATTRIBUTE_NAME_REGEX.test(attributeName)) {
      throw new Error(`${context}: invalid key attribute at position ${index + 1}.`);
    }
    if (keyType !== "HASH" && keyType !== "RANGE") {
      throw new Error(`${context}: key type must be HASH or RANGE.`);
    }

    return {
      AttributeName: attributeName,
      KeyType: keyType as "HASH" | "RANGE",
    };
  });

  const hashCount = normalized.filter((key) => key.KeyType === "HASH").length;
  if (hashCount !== 1) {
    throw new Error(`${context}: exactly one HASH key is required.`);
  }

  return normalized;
}

function normalizeThroughput(raw: any, context: string) {
  if (!raw) {
    throw new Error(`${context}: provisioned throughput is required.`);
  }

  const read = Number(raw.ReadCapacityUnits ?? raw.readCapacityUnits);
  const write = Number(raw.WriteCapacityUnits ?? raw.writeCapacityUnits);
  if (!Number.isInteger(read) || read <= 0 || !Number.isInteger(write) || write <= 0) {
    throw new Error(`${context}: read/write capacity units must be positive integers.`);
  }

  return {
    ReadCapacityUnits: read,
    WriteCapacityUnits: write,
  };
}

function normalizeProjection(raw: any, context: string) {
  const projectionType = String(raw?.ProjectionType ?? raw?.projectionType ?? "ALL").trim();
  if (!VALID_PROJECTION_TYPES.has(projectionType)) {
    throw new Error(`${context}: invalid projection type.`);
  }

  const nonKeyAttributes = Array.isArray(raw?.NonKeyAttributes)
    ? raw.NonKeyAttributes
    : typeof raw?.nonKeyAttributes === "string"
      ? raw.nonKeyAttributes.split(",").map((value: string) => value.trim()).filter(Boolean)
      : Array.isArray(raw?.nonKeyAttributes)
        ? raw.nonKeyAttributes
        : [];

  if (projectionType === "INCLUDE" && nonKeyAttributes.length === 0) {
    throw new Error(`${context}: INCLUDE projection requires non-key attributes.`);
  }

  return {
    ProjectionType: projectionType as "ALL" | "KEYS_ONLY" | "INCLUDE",
    ...(projectionType === "INCLUDE" ? { NonKeyAttributes: nonKeyAttributes } : {}),
  };
}

// GET /api/dynamodb/tables - List all tables
export async function GET() {
  try {
    const response = await dynamoClient.send(new ListTablesCommand({}));
    const tableNames = response.TableNames || [];

    // Get details for each table
    const tableDetails = await Promise.all(
      tableNames.map(async (tableName) => {
        try {
          const describeResponse = await dynamoClient.send(
            new DescribeTableCommand({ TableName: tableName }),
          );
          const table = describeResponse.Table;

          return {
            tableName: table?.TableName || tableName,
            tableStatus: table?.TableStatus || "UNKNOWN",
            creationDateTime: table?.CreationDateTime,
            itemCount: table?.ItemCount || 0,
            tableSizeBytes: table?.TableSizeBytes || 0,
            tableArn: table?.TableArn,
            keySchema: table?.KeySchema,
          };
        } catch (error) {
          console.error(`Error describing table ${tableName}:`, error);
          return {
            tableName,
            tableStatus: "UNKNOWN",
            creationDateTime: new Date(),
            itemCount: 0,
            tableSizeBytes: 0,
          };
        }
      }),
    );

    return NextResponse.json({ tables: tableDetails });
  } catch (error: any) {
    console.error("Error listing tables:", error);
    return NextResponse.json(
      { error: error.message || "Failed to list tables" },
      { status: 500 },
    );
  }
}

// POST /api/dynamodb/tables - Create a new table
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      tableName,
      attributeDefinitions,
      keySchema,
      billingMode = "PAY_PER_REQUEST",
      provisionedThroughput,
      globalSecondaryIndexes,
      localSecondaryIndexes,
      streamSpecification,
      tableClass,
      deletionProtectionEnabled,
      tags,
    } = body;

    if (!tableName || !attributeDefinitions || !keySchema) {
      return NextResponse.json(
        {
          error:
            "Table name, attribute definitions, and key schema are required",
        },
        { status: 400 },
      );
    }

    const normalizedTableName = String(tableName).trim();
    if (!TABLE_NAME_REGEX.test(normalizedTableName)) {
      return NextResponse.json(
        { error: "Invalid table name. Use 3-255 chars: a-z A-Z 0-9 _ . -" },
        { status: 400 },
      );
    }
    if (!VALID_BILLING_MODES.has(String(billingMode))) {
      return NextResponse.json(
        { error: "Invalid billing mode. Use PAY_PER_REQUEST or PROVISIONED." },
        { status: 400 },
      );
    }

    const normalizedAttributes = normalizeAttributeDefinitions(attributeDefinitions);
    const normalizedKeySchema = normalizeKeySchema(keySchema, "Table");
    const tableHashKey =
      normalizedKeySchema.find((key) => key.KeyType === "HASH")?.AttributeName || "";
    const attributeNames = new Set(normalizedAttributes.map((attr) => attr.AttributeName));

    normalizedKeySchema.forEach((key) => {
      if (!attributeNames.has(key.AttributeName)) {
        throw new Error(`Key schema attribute "${key.AttributeName}" is missing in attribute definitions.`);
      }
    });

    const normalizedGsis = Array.isArray(globalSecondaryIndexes)
      ? globalSecondaryIndexes.map((index: any, idx: number) => {
          const indexName = String(index.IndexName ?? index.indexName ?? "").trim();
          if (!TABLE_NAME_REGEX.test(indexName)) {
            throw new Error(`Invalid GSI name at position ${idx + 1}.`);
          }

          const normalizedIndexKeySchema = normalizeKeySchema(
            index.KeySchema ?? index.keySchema,
            `GSI ${indexName}`,
          );
          const hasRange =
            normalizedIndexKeySchema.filter((key) => key.KeyType === "RANGE")
              .length <= 1;
          if (!hasRange) {
            throw new Error(`GSI ${indexName}: only one RANGE key is allowed.`);
          }
          normalizedIndexKeySchema.forEach((key) => {
            if (!attributeNames.has(key.AttributeName)) {
              throw new Error(
                `GSI ${indexName}: key attribute "${key.AttributeName}" is missing in attribute definitions.`,
              );
            }
          });

          return {
            IndexName: indexName,
            KeySchema: normalizedIndexKeySchema,
            Projection: normalizeProjection(index.Projection ?? index.projection, `GSI ${indexName}`),
            ...(billingMode === "PROVISIONED"
              ? {
                  ProvisionedThroughput: normalizeThroughput(
                    index.ProvisionedThroughput ?? index.provisionedThroughput,
                    `GSI ${indexName}`,
                  ),
                }
              : {}),
          };
        })
      : [];
    if (normalizedGsis.length > 20) {
      throw new Error("A table can have up to 20 global secondary indexes.");
    }

    const normalizedLsis = Array.isArray(localSecondaryIndexes)
      ? localSecondaryIndexes.map((index: any, idx: number) => {
          const indexName = String(index.IndexName ?? index.indexName ?? "").trim();
          if (!TABLE_NAME_REGEX.test(indexName)) {
            throw new Error(`Invalid LSI name at position ${idx + 1}.`);
          }

          const normalizedIndexKeySchema = normalizeKeySchema(
            index.KeySchema ?? index.keySchema,
            `LSI ${indexName}`,
          );
          const lsiHash =
            normalizedIndexKeySchema.find((key) => key.KeyType === "HASH")
              ?.AttributeName || "";
          const lsiRangeCount = normalizedIndexKeySchema.filter(
            (key) => key.KeyType === "RANGE",
          ).length;
          if (!lsiHash || lsiHash !== tableHashKey || lsiRangeCount !== 1) {
            throw new Error(
              `LSI ${indexName}: must include table HASH key (${tableHashKey}) and one RANGE key.`,
            );
          }
          normalizedIndexKeySchema.forEach((key) => {
            if (!attributeNames.has(key.AttributeName)) {
              throw new Error(
                `LSI ${indexName}: key attribute "${key.AttributeName}" is missing in attribute definitions.`,
              );
            }
          });

          return {
            IndexName: indexName,
            KeySchema: normalizedIndexKeySchema,
            Projection: normalizeProjection(index.Projection ?? index.projection, `LSI ${indexName}`),
          };
        })
      : [];
    if (normalizedLsis.length > 5) {
      throw new Error("A table can have up to 5 local secondary indexes.");
    }

    const allIndexNames = [
      ...normalizedGsis.map((index) => index.IndexName),
      ...normalizedLsis.map((index) => index.IndexName),
    ];
    if (new Set(allIndexNames).size !== allIndexNames.length) {
      throw new Error("Index names must be unique across GSIs and LSIs.");
    }

    const normalizedStream =
      streamSpecification?.streamEnabled === true ||
      streamSpecification?.StreamEnabled === true
        ? {
            StreamEnabled: true,
            StreamViewType: String(
              streamSpecification.streamViewType ??
                streamSpecification.StreamViewType ??
                "",
            ),
          }
        : undefined;

    if (
      normalizedStream &&
      !VALID_STREAM_VIEW_TYPES.has(normalizedStream.StreamViewType)
    ) {
      return NextResponse.json(
        { error: "Invalid stream view type." },
        { status: 400 },
      );
    }

    if (tableClass && !VALID_TABLE_CLASSES.has(String(tableClass))) {
      return NextResponse.json(
        { error: "Invalid table class." },
        { status: 400 },
      );
    }

    const normalizedTags = Array.isArray(tags)
      ? tags
          .map((tag: any) => ({
            Key: String(tag.Key ?? tag.key ?? "").trim(),
            Value: String(tag.Value ?? tag.value ?? "").trim(),
          }))
          .filter((tag) => tag.Key)
      : [];

    const params: any = {
      TableName: normalizedTableName,
      AttributeDefinitions: normalizedAttributes as AttributeDefinition[],
      KeySchema: normalizedKeySchema as KeySchemaElement[],
      BillingMode: billingMode,
      ...(normalizedGsis.length > 0 ? { GlobalSecondaryIndexes: normalizedGsis } : {}),
      ...(normalizedLsis.length > 0 ? { LocalSecondaryIndexes: normalizedLsis } : {}),
      ...(normalizedStream ? { StreamSpecification: normalizedStream } : {}),
      ...(tableClass ? { TableClass: tableClass } : {}),
      ...(typeof deletionProtectionEnabled === "boolean"
        ? { DeletionProtectionEnabled: deletionProtectionEnabled }
        : {}),
      ...(normalizedTags.length > 0 ? { Tags: normalizedTags } : {}),
    };

    if (billingMode === "PROVISIONED") {
      if (!provisionedThroughput) {
        return NextResponse.json(
          { error: "Provisioned throughput is required for PROVISIONED mode." },
          { status: 400 },
        );
      }
      params.ProvisionedThroughput = normalizeThroughput(provisionedThroughput, "Table");
    }

    const response = await dynamoClient.send(new CreateTableCommand(params));

    return NextResponse.json({
      success: true,
      tableName: normalizedTableName,
      tableDescription: response.TableDescription,
    });
  } catch (error: any) {
    console.error("Error creating table:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create table" },
      { status: 500 },
    );
  }
}

// DELETE /api/dynamodb/tables - Delete a table
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tableName = searchParams.get("tableName");

    if (!tableName) {
      return NextResponse.json(
        { error: "Table name is required" },
        { status: 400 },
      );
    }

    await dynamoClient.send(
      new DeleteTableCommand({
        TableName: tableName,
      }),
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting table:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete table" },
      { status: 500 },
    );
  }
}
