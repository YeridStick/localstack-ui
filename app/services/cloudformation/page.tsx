"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { StackList } from "@/components/services/cloudformation/stack-list";
import { IaCWorkbench } from "@/components/services/cloudformation/iac-workbench";
import { ServicePageLayout } from "@/components/layout/service-page-layout";
import { Layers, CheckCircle, AlertCircle, Clock, Info } from "lucide-react";
import { useStacks } from "@/hooks/use-cloudformation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function CloudFormationPage() {
  const { data: stacks } = useStacks();

  const totalStacks = stacks?.length || 0;
  const completeStacks =
    stacks?.filter(
      (s) =>
        s.stackStatus.includes("COMPLETE") &&
        !s.stackStatus.includes("FAILED") &&
        !s.stackStatus.includes("ROLLBACK"),
    ).length || 0;
  const inProgressStacks =
    stacks?.filter((s) => s.stackStatus.includes("IN_PROGRESS")).length || 0;
  const failedStacks =
    stacks?.filter(
      (s) =>
        s.stackStatus.includes("FAILED") || s.stackStatus.includes("ROLLBACK"),
    ).length || 0;

  return (
    <ServicePageLayout
      title="CloudFormation"
      description="Infrastructure as Code service"
      icon={Layers}
    >
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stacks</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStacks}</div>
            <p className="text-xs text-muted-foreground">All stacks</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Complete</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completeStacks}</div>
            <p className="text-xs text-muted-foreground">
              Successfully deployed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inProgressStacks}</div>
            <p className="text-xs text-muted-foreground">Currently deploying</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {failedStacks}
            </div>
            <p className="text-xs text-muted-foreground">Deployment failed</p>
          </CardContent>
        </Card>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          AWS CloudFormation lets you model, provision, and manage AWS and
          third-party resources by treating infrastructure as code. Create
          templates that describe your AWS resources and CloudFormation takes
          care of provisioning and configuring those resources for you.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="stacks" className="space-y-4">
        <TabsList className="grid w-full max-w-lg grid-cols-2">
          <TabsTrigger value="stacks">CloudFormation Stacks</TabsTrigger>
          <TabsTrigger value="iac">IaC Workbench</TabsTrigger>
        </TabsList>

        <TabsContent value="stacks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Stacks</CardTitle>
              <CardDescription>
                Manage your CloudFormation stacks and their resources
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StackList />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="iac" className="space-y-4">
          <IaCWorkbench />
        </TabsContent>
      </Tabs>
    </ServicePageLayout>
  );
}
