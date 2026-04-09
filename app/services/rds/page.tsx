"use client";

import { useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { DBInstanceList } from "@/components/services/rds/db-instance-list";
import { CreateDBDialog } from "@/components/services/rds/create-db-dialog";
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
      </div>
    </MainLayout>
  );
}