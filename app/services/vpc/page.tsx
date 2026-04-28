"use client";

import { MainLayout } from "@/components/layout/main-layout";
import { VPCList } from "@/components/services/vpc/vpc-list";
import { SubnetList } from "@/components/services/vpc/subnet-list";
import { SecurityGroupList } from "@/components/services/vpc/security-group-list";
import { CreateVPCDialog } from "@/components/services/vpc/create-vpc-dialog";
import { CreateSubnetDialog } from "@/components/services/vpc/create-subnet-dialog";
import { CreateSecurityGroupDialog } from "@/components/services/vpc/create-security-group-dialog";
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
import { Network, RefreshCw, Plus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function VPCPage() {
  const queryClient = useQueryClient();
  const [createVPCOpen, setCreateVPCOpen] = useState(false);
  const [createSubnetOpen, setCreateSubnetOpen] = useState(false);
  const [createSGOpen, setCreateSGOpen] = useState(false);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">VPC</h1>
            <p className="text-muted-foreground">
              Manage Virtual Private Cloud networks
            </p>
          </div>
          <Button
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ["vpcs"] });
              queryClient.invalidateQueries({ queryKey: ["subnets"] });
              queryClient.invalidateQueries({ queryKey: ["security-groups"] });
            }}
            variant="outline"
            size="sm"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        <Alert>
          <Network className="h-4 w-4" />
          <AlertDescription>
            VPC allows you to create isolated virtual networks for your AWS resources.
            Create VPCs, subnets, route tables, and security groups.
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="vpcs">
          <TabsList>
            <TabsTrigger value="vpcs">VPCs</TabsTrigger>
            <TabsTrigger value="subnets">Subnets</TabsTrigger>
            <TabsTrigger value="security-groups">Security Groups</TabsTrigger>
          </TabsList>

          <TabsContent value="vpcs" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Virtual Private Clouds</CardTitle>
                    <CardDescription>Manage your VPCs</CardDescription>
                  </div>
                  <Button onClick={() => setCreateVPCOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create VPC
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <VPCList />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subnets" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Subnets</CardTitle>
                    <CardDescription>Manage subnets within your VPCs</CardDescription>
                  </div>
                  <Button onClick={() => setCreateSubnetOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Subnet
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <SubnetList />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security-groups" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Security Groups</CardTitle>
                    <CardDescription>Manage firewall rules</CardDescription>
                  </div>
                  <Button onClick={() => setCreateSGOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Security Group
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <SecurityGroupList />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <CreateVPCDialog open={createVPCOpen} onOpenChange={setCreateVPCOpen} />
        <CreateSubnetDialog open={createSubnetOpen} onOpenChange={setCreateSubnetOpen} />
        <CreateSecurityGroupDialog open={createSGOpen} onOpenChange={setCreateSGOpen} />

        <CliCommandsPanel
          title="Comandos AWS CLI - VPC"
          description="Ejemplos de comandos para gestionar VPCs, subnets y security groups"
          commands={[
            {
              label: "Listar VPCs",
              command: "aws ec2 describe-vpcs --endpoint-url http://localhost:4566",
              description: "Muestra todas las VPCs"
            },
            {
              label: "Crear VPC",
              command: "aws ec2 create-vpc --cidr-block 10.0.0.0/16 --endpoint-url http://localhost:4566",
              description: "Crea una nueva VPC con rango CIDR 10.0.0.0/16"
            },
            {
              label: "Listar subnets",
              command: "aws ec2 describe-subnets --endpoint-url http://localhost:4566",
              description: "Muestra todas las subnets"
            },
            {
              label: "Crear subnet",
              command: "aws ec2 create-subnet --vpc-id <VPC_ID> --cidr-block 10.0.1.0/24 --endpoint-url http://localhost:4566",
              description: "Crea una subnet en una VPC (reemplaza <VPC_ID>)"
            },
            {
              label: "Listar Security Groups",
              command: "aws ec2 describe-security-groups --endpoint-url http://localhost:4566",
              description: "Muestra todos los security groups"
            },
            {
              label: "Crear Internet Gateway",
              command: "aws ec2 create-internet-gateway --endpoint-url http://localhost:4566",
              description: "Crea un Internet Gateway para acceso público"
            }
          ]}
        />
      </div>
    </MainLayout>
  );
}
