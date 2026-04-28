"use client";

import { useState } from "react";
import { useRestApis } from "@/hooks/use-apigateway";
import { useLambdaFunctions } from "@/hooks/use-lambda";
import { useDynamoDBTables } from "@/hooks/use-dynamodb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Globe,
  Zap,
  Database,
  Search,
  FileCode,
  ArrowRight,
  ArrowDown,
  Plus,
  Link2,
  Trash2,
  CloudCog,
} from "lucide-react";

// Types for architecture nodes and connections
interface ArchitectureNode {
  id: string;
  type: "apigateway" | "lambda" | "dynamodb" | "s3" | "sqs" | "cloudwatch";
  name: string;
  status: "active" | "inactive" | "error";
  metadata?: Record<string, string>;
}

interface ArchitectureConnection {
  id: string;
  from: string;
  to: string;
  type: "http" | "trigger" | "sdk" | "log";
  label?: string;
  method?: string;
}

interface ArchitectureFlow {
  id: string;
  name: string;
  description?: string;
  nodes: ArchitectureNode[];
  connections: ArchitectureConnection[];
}

// Mock data for demonstration - in production, this would come from an API
const mockFlows: ArchitectureFlow[] = [
  {
    id: "books-api",
    name: "Books API",
    description: "API REST para gestión de libros",
    nodes: [
      {
        id: "apigw-books",
        type: "apigateway",
        name: "books-api",
        status: "active",
        metadata: { endpoint: "/books" },
      },
      {
        id: "lambda-books",
        type: "lambda",
        name: "books-handler",
        status: "active",
        metadata: { runtime: "nodejs20.x" },
      },
      {
        id: "dynamodb-books",
        type: "dynamodb",
        name: "books-table",
        status: "active",
        metadata: { items: "150" },
      },
      {
        id: "cloudwatch-logs",
        type: "cloudwatch",
        name: "/aws/lambda/books-handler",
        status: "active",
      },
    ],
    connections: [
      {
        id: "conn-1",
        from: "apigw-books",
        to: "lambda-books",
        type: "http",
        label: "POST /books",
        method: "POST",
      },
      {
        id: "conn-2",
        from: "lambda-books",
        to: "dynamodb-books",
        type: "sdk",
        label: "PutItem",
      },
      {
        id: "conn-3",
        from: "lambda-books",
        to: "cloudwatch-logs",
        type: "log",
        label: "logs",
      },
    ],
  },
];

// Service icon mapping
const serviceIcons = {
  apigateway: Globe,
  lambda: Zap,
  dynamodb: Database,
  s3: FileCode,
  sqs: CloudCog,
  cloudwatch: Search,
};

const serviceColors = {
  apigateway: "bg-purple-100 border-purple-300 text-purple-700",
  lambda: "bg-orange-100 border-orange-300 text-orange-700",
  dynamodb: "bg-blue-100 border-blue-300 text-blue-700",
  s3: "bg-amber-100 border-amber-300 text-amber-700",
  sqs: "bg-cyan-100 border-cyan-300 text-cyan-700",
  cloudwatch: "bg-pink-100 border-pink-300 text-pink-700",
};

const serviceLabels = {
  apigateway: "API Gateway",
  lambda: "Lambda",
  dynamodb: "DynamoDB",
  s3: "S3",
  sqs: "SQS",
  cloudwatch: "CloudWatch",
};

export function ArchitectureFlowDiagram() {
  const [selectedFlow, setSelectedFlow] = useState<ArchitectureFlow | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Fetch real data from hooks
  const { data: apis, isLoading: apisLoading } = useRestApis();
  const { data: functions, isLoading: functionsLoading } = useLambdaFunctions();
  const { data: tables, isLoading: tablesLoading } = useDynamoDBTables();

  const isLoading = apisLoading || functionsLoading || tablesLoading;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 gap-4">
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Diagramas de Arquitectura</h3>
          <p className="text-sm text-muted-foreground">
            Visualiza las conexiones entre tus servicios AWS
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Diagrama
        </Button>
      </div>

      {/* Flow List */}
      <div className="grid grid-cols-1 gap-4">
        {mockFlows.map((flow) => (
          <FlowCard
            key={flow.id}
            flow={flow}
            onClick={() => setSelectedFlow(flow)}
          />
        ))}
      </div>

      {/* Real Resources Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Recursos Detectados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-purple-500" />
              <span className="text-sm">{apis?.length || 0} APIs</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-orange-500" />
              <span className="text-sm">{functions?.length || 0} Functions</span>
            </div>
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-blue-500" />
              <span className="text-sm">{tables?.length || 0} Tablas</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedFlow} onOpenChange={() => setSelectedFlow(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedFlow?.name}</DialogTitle>
          </DialogHeader>
          {selectedFlow && <FlowVisualizer flow={selectedFlow} />}
        </DialogContent>
      </Dialog>

      {/* Create Dialog Placeholder */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Nuevo Diagrama</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Selecciona los servicios que quieres conectar:
            </p>
            <div className="grid grid-cols-2 gap-2">
              {apis?.map((api) => (
                <Button
                  key={api.id}
                  variant="outline"
                  className="justify-start"
                  onClick={() => setShowCreateDialog(false)}
                >
                  <Globe className="h-4 w-4 mr-2 text-purple-500" />
                  {api.name}
                </Button>
              ))}
              {functions?.map((func) => (
                <Button
                  key={func.functionName}
                  variant="outline"
                  className="justify-start"
                  onClick={() => setShowCreateDialog(false)}
                >
                  <Zap className="h-4 w-4 mr-2 text-orange-500" />
                  {func.functionName}
                </Button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FlowCard({
  flow,
  onClick,
}: {
  flow: ArchitectureFlow;
  onClick: () => void;
}) {
  return (
    <Card
      className="cursor-pointer hover:border-primary transition-colors"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{flow.name}</CardTitle>
          <Badge variant="outline">{flow.nodes.length} servicios</Badge>
        </div>
        {flow.description && (
          <p className="text-sm text-muted-foreground">{flow.description}</p>
        )}
      </CardHeader>
      <CardContent>
        {/* Mini Preview */}
        <div className="flex items-center gap-2 overflow-x-auto py-2">
          {flow.nodes.map((node, index) => {
            const Icon = serviceIcons[node.type];
            return (
              <div key={node.id} className="flex items-center gap-2">
                <div
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-md border ${serviceColors[node.type]}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium truncate max-w-[100px]">
                    {node.name}
                  </span>
                </div>
                {index < flow.nodes.length - 1 && (
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function FlowVisualizer({ flow }: { flow: ArchitectureFlow }) {
  // Group nodes by type for layout
  const nodesByType = flow.nodes.reduce((acc, node) => {
    if (!acc[node.type]) acc[node.type] = [];
    acc[node.type].push(node);
    return acc;
  }, {} as Record<string, ArchitectureNode[]>);

  // Simple layout: API Gateway -> Lambda -> Data stores
  const layers = [
    nodesByType["apigateway"] || [],
    nodesByType["lambda"] || [],
    [
      ...(nodesByType["dynamodb"] || []),
      ...(nodesByType["s3"] || []),
      ...(nodesByType["sqs"] || []),
    ],
    nodesByType["cloudwatch"] || [],
  ].filter((layer) => layer.length > 0);

  return (
    <div className="space-y-6">
      {/* Main Flow Diagram */}
      <div className="bg-muted/30 rounded-lg p-6">
        <div className="flex flex-col items-center gap-8">
          {layers.map((layer, layerIndex) => (
            <div key={layerIndex} className="w-full">
              <div
                className={`flex ${
                  layer.length === 1 ? "justify-center" : "justify-center gap-8"
                }`}
              >
                {layer.map((node) => (
                  <NodeCard key={node.id} node={node} />
                ))}
              </div>
              {layerIndex < layers.length - 1 && (
                <div className="flex justify-center mt-4">
                  <ArrowDown className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Connections List */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium">Conexiones</h4>
        <div className="space-y-2">
          {flow.connections.map((conn) => (
            <ConnectionRow
              key={conn.id}
              connection={conn}
              nodes={flow.nodes}
            />
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm">
          <Link2 className="h-4 w-4 mr-2" />
          Agregar Conexión
        </Button>
        <Button variant="outline" size="sm" className="text-destructive">
          <Trash2 className="h-4 w-4 mr-2" />
          Eliminar
        </Button>
      </div>
    </div>
  );
}

function NodeCard({ node }: { node: ArchitectureNode }) {
  const Icon = serviceIcons[node.type];
  const isActive = node.status === "active";

  return (
    <div
      className={`relative p-4 rounded-lg border-2 min-w-[160px] max-w-[200px] ${
        isActive ? serviceColors[node.type] : "bg-gray-100 border-gray-300"
      }`}
    >
      <div className="flex flex-col items-center gap-2">
        <Icon className="h-8 w-8" />
        <div className="text-center">
          <p className="font-semibold text-sm">{serviceLabels[node.type]}</p>
          <p className="text-xs truncate max-w-[140px]">{node.name}</p>
        </div>
        <div
          className={`h-2 w-2 rounded-full ${
            isActive ? "bg-green-500" : "bg-red-500"
          }`}
        />
      </div>
      {node.metadata && (
        <div className="mt-2 text-xs text-center space-y-0.5">
          {Object.entries(node.metadata).map(([key, value]) => (
            <p key={key} className="text-muted-foreground">
              {key}: {value}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function ConnectionRow({
  connection,
  nodes,
}: {
  connection: ArchitectureConnection;
  nodes: ArchitectureNode[];
}) {
  const fromNode = nodes.find((n) => n.id === connection.from);
  const toNode = nodes.find((n) => n.id === connection.to);

  if (!fromNode || !toNode) return null;

  const typeColors = {
    http: "bg-green-100 text-green-700 border-green-300",
    trigger: "bg-blue-100 text-blue-700 border-blue-300",
    sdk: "bg-purple-100 text-purple-700 border-purple-300",
    log: "bg-pink-100 text-pink-700 border-pink-300",
  };

  return (
    <div className="flex items-center gap-3 p-2 rounded-md border bg-muted/40">
      <div className="flex items-center gap-2 flex-1">
        <span className="text-sm font-medium">{fromNode.name}</span>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">{toNode.name}</span>
      </div>
      <Badge className={typeColors[connection.type]}>
        {connection.label || connection.type}
      </Badge>
      {connection.method && (
        <Badge variant="outline">{connection.method}</Badge>
      )}
    </div>
  );
}
