"use client";

import { useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { DBInstanceList } from "@/components/services/rds/db-instance-list";
import { CreateDBDialog } from "@/components/services/rds/create-db-dialog";
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
import { Database, RefreshCw, Plus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function RDSPage() {
  const queryClient = useQueryClient();
  const [createDBOpen, setCreateDBOpen] = useState(false);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">RDS</h1>
            <p className="text-muted-foreground">
              Manage your RDS database instances
            </p>
          </div>
          <Button
            onClick={() =>
              queryClient.invalidateQueries({ queryKey: ["rds-instances"] })
            }
            variant="outline"
            size="sm"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        <Alert>
          <Database className="h-4 w-4" />
          <AlertDescription>
            RDS in LocalStack provides simulated database instances. Create and manage
            MySQL, PostgreSQL, and other database engines locally.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>RDS Instances</CardTitle>
                <CardDescription>
                  View and manage your database instances
                </CardDescription>
              </div>
              <Button onClick={() => setCreateDBOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Database
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <DBInstanceList />
          </CardContent>
        </Card>

        <CreateDBDialog
          open={createDBOpen}
          onOpenChange={setCreateDBOpen}
        />

        <CliCommandsPanel
          title="Comandos AWS CLI - RDS"
          description="Ejemplos de comandos para gestionar bases de datos RDS"
          commands={[
            {
              label: "Listar instancias",
              command: "aws rds describe-db-instances --endpoint-url http://localhost:4566",
              description: "Muestra todas las instancias de base de datos"
            },
            {
              label: "Crear instancia MySQL",
              command: "aws rds create-db-instance --db-instance-identifier mi-db --db-instance-class db.t2.micro --engine mysql --master-username admin --master-user-password password123 --allocated-storage 20 --endpoint-url http://localhost:4566",
              description: "Crea una instancia MySQL"
            },
            {
              label: "Crear instancia Postgres",
              command: "aws rds create-db-instance --db-instance-identifier mi-postgres --db-instance-class db.t2.micro --engine postgres --master-username postgres --master-user-password password123 --allocated-storage 20 --endpoint-url http://localhost:4566",
              description: "Crea una instancia PostgreSQL"
            },
            {
              label: "Eliminar instancia",
              command: "aws rds delete-db-instance --db-instance-identifier mi-db --skip-final-snapshot --endpoint-url http://localhost:4566",
              description: "Elimina una instancia RDS"
            }
          ]}
        />
      </div>
    </MainLayout>
  );
}