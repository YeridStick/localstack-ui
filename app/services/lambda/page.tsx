"use client";

import { useState } from "react";
import { ServicePageLayout } from "@/components/layout/service-page-layout";
import { FunctionList } from "@/components/services/lambda/function-list";
import { FunctionViewer } from "@/components/services/lambda/function-viewer";
import { CliCommandsPanel } from "@/components/cli-commands-panel";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Zap, Cpu, Timer, Package, RefreshCw, Info } from "lucide-react";
import { LambdaFunction } from "@/types";
import { useQueryClient } from "@tanstack/react-query";
import { useLambdaFunctions } from "@/hooks/use-lambda";

export default function LambdaPage() {
  const [selectedFunction, setSelectedFunction] =
    useState<LambdaFunction | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const queryClient = useQueryClient();
  const { data: functions, isLoading } = useLambdaFunctions();

  const handleViewFunction = (func: LambdaFunction) => {
    setSelectedFunction(func);
    setViewerOpen(true);
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["lambda-functions"] });
  };

  // Calculate stats
  const totalFunctions = functions?.length || 0;
  const totalCodeSize =
    functions?.reduce((sum, fn) => sum + (fn.codeSize || 0), 0) || 0;
  const pythonFunctions =
    functions?.filter((fn) => fn.runtime?.includes("python")).length || 0;
  const nodeFunctions =
    functions?.filter((fn) => fn.runtime?.includes("nodejs")).length || 0;

  return (
    <ServicePageLayout
      title="Lambda"
      description="View and monitor your serverless functions"
      icon={Zap}
      secondaryAction={{
        label: "Refresh",
        icon: RefreshCw,
        onClick: handleRefresh,
      }}
      stats={[
        {
          title: "Total Functions",
          value: totalFunctions,
          description: "Deployed functions",
          icon: Zap,
          loading: isLoading,
        },
        {
          title: "Total Code Size",
          value: `${(totalCodeSize / 1024 / 1024).toFixed(2)} MB`,
          description: "Combined size",
          icon: Package,
          loading: isLoading,
        },
        {
          title: "Python Functions",
          value: pythonFunctions,
          description: "Python runtime",
          icon: Cpu,
          loading: isLoading,
        },
        {
          title: "Node.js Functions",
          value: nodeFunctions,
          description: "Node.js runtime",
          icon: Timer,
          loading: isLoading,
        },
      ]}
      alert={{
        icon: Info,
        description:
          "This interface provides read-only access to Lambda functions in your LocalStack instance. Use the AWS CLI or SDK to deploy and manage functions.",
      }}
    >
      <Card>
        <CardHeader>
          <CardTitle>Lambda Functions</CardTitle>
          <CardDescription>
            View your deployed Lambda functions and their configurations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FunctionList onViewFunction={handleViewFunction} />
        </CardContent>
      </Card>

      <FunctionViewer
        func={selectedFunction}
        open={viewerOpen}
        onOpenChange={setViewerOpen}
      />

      <CliCommandsPanel
        title="Comandos AWS CLI - Lambda"
        description="Ejemplos de comandos para gestionar funciones Lambda"
        commands={[
          {
            label: "Listar funciones",
            command: "aws lambda list-functions --endpoint-url http://localhost:4566",
            description: "Muestra todas las funciones Lambda"
          },
          {
            label: "Crear función (Python)",
            command: "aws lambda create-function --function-name mi-funcion --runtime python3.9 --handler lambda_function.handler --role arn:aws:iam::000000000000:role/lambda-role --zip-file fileb://function.zip --endpoint-url http://localhost:4566",
            description: "Crea una función Lambda con runtime Python"
          },
          {
            label: "Invocar función",
            command: "aws lambda invoke --function-name mi-funcion --payload '{\"key\":\"value\"}' output.txt --endpoint-url http://localhost:4566",
            description: "Invoca una función Lambda con payload JSON"
          },
          {
            label: "Eliminar función",
            command: "aws lambda delete-function --function-name mi-funcion --endpoint-url http://localhost:4566",
            description: "Elimina una función Lambda"
          }
        ]}
      />
    </ServicePageLayout>
  );
}
