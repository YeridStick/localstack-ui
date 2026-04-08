"use client";

import { MainLayout } from "@/components/layout/main-layout";
import { InstanceList } from "@/components/services/ec2/instance-list";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Server, RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function EC2Page() {
  const queryClient = useQueryClient();

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
          <Server className="h-4 w-4" />
          <AlertDescription>
            EC2 in MiniStack runs actual Docker containers. Each instance is an isolated
            container that you can manage here or view in Docker Desktop.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>EC2 Instances</CardTitle>
            <CardDescription>
              View and manage your EC2 instances
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InstanceList />
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}