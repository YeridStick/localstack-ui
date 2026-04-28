"use client";

import { useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { InstanceListDocker } from "@/components/services/ec2/instance-list-docker";
import { CreateDockerInstanceDialog } from "@/components/services/ec2/create-docker-instance-dialog";
import { CliCommandsPanel } from "@/components/cli-commands-panel";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Container, RefreshCw, Plus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function EC2Page() {
  const queryClient = useQueryClient();
  const [createInstanceOpen, setCreateInstanceOpen] = useState(false);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">EC2</h1>
            <p className="text-muted-foreground">
              Manage your EC2 instances running in MiniStack
            </p>
          </div>
          <Button
            onClick={() =>
              queryClient.invalidateQueries({ queryKey: ["ec2-instances"] })
            }
            variant="outline"
            size="sm"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        <Alert>
          <Container className="h-4 w-4" />
          <AlertDescription>
            EC2 instances run as real Docker containers. Each instance is an isolated container
            that you can start, stop, terminate, and connect to via terminal. View them in Docker Desktop.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>EC2 Instances</CardTitle>
                <CardDescription>
                  View and manage your EC2 instances
                </CardDescription>
              </div>
              <Button onClick={() => setCreateInstanceOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Instance
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <InstanceListDocker />
          </CardContent>
        </Card>

        <CliCommandsPanel
          title="Comandos AWS CLI - EC2"
          description="Ejemplos de comandos para gestionar instancias EC2 con MiniStack/LocalStack"
          commands={[
            {
              label: "Listar instancias",
              command: "aws ec2 describe-instances --endpoint-url http://localhost:4566",
              description: "Muestra todas las instancias EC2 creadas"
            },
            {
              label: "Crear instancia",
              command: "aws ec2 run-instances --image-id ami-04681a1dbd79675a5 --instance-type t2.micro --count 1 --endpoint-url http://localhost:4566",
              description: "Crea una nueva instancia EC2 (genera contenedor Docker real)"
            },
            {
              label: "Ver contenedores Docker",
              command: "docker ps --filter label=ec2_instance_id --format 'table {{.ID}}\\t{{.Names}}\\t{{.Status}}'",
              description: "Lista los contenedores Docker que representan instancias EC2"
            },
            {
              label: "Conectar a instancia",
              command: "docker exec -it <CONTAINER_ID> /bin/bash",
              description: "Accede al shell de la instancia EC2 (reemplaza <CONTAINER_ID>)"
            },
            {
              label: "Detener instancia",
              command: "aws ec2 stop-instances --instance-ids <INSTANCE_ID> --endpoint-url http://localhost:4566",
              description: "Detiene una instancia EC2 (reemplaza <INSTANCE_ID>)"
            },
            {
              label: "Terminar instancia",
              command: "aws ec2 terminate-instances --instance-ids <INSTANCE_ID> --endpoint-url http://localhost:4566",
              description: "Elimina una instancia EC2 permanentemente"
            }
          ]}
        />

        <CreateDockerInstanceDialog
          open={createInstanceOpen}
          onOpenChange={setCreateInstanceOpen}
        />
      </div>
    </MainLayout>
  );
}