"use client";

import { useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { InstanceListDocker } from "@/components/services/ec2/instance-list-docker";
import { CreateDockerInstanceDialog } from "@/components/services/ec2/create-docker-instance-dialog";
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
              queryClient.invalidateQueries({ queryKey: ["ec2-docker-instances"] })
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

        <CreateDockerInstanceDialog
          open={createInstanceOpen}
          onOpenChange={setCreateInstanceOpen}
        />
      </div>
    </MainLayout>
  );
}