"use client";

import { useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { LoadBalancerList } from "@/components/services/elbv2/load-balancer-list";
import { TargetGroupList } from "@/components/services/elbv2/target-group-list";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Scale, RefreshCw, Plus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ELBv2Page() {
  const queryClient = useQueryClient();

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Load Balancers</h1>
            <p className="text-muted-foreground">
              Manage Application (ALB) and Network Load Balancers (NLB)
            </p>
          </div>
          <Button
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ["load-balancers"] });
              queryClient.invalidateQueries({ queryKey: ["target-groups"] });
            }}
            variant="outline"
            size="sm"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        <Alert>
          <Scale className="h-4 w-4" />
          <AlertDescription>
            Load balancers distribute traffic across multiple targets. Create ALB for HTTP/HTTPS
            or NLB for TCP/UDP traffic.
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="load-balancers">
          <TabsList>
            <TabsTrigger value="load-balancers">Load Balancers</TabsTrigger>
            <TabsTrigger value="target-groups">Target Groups</TabsTrigger>
          </TabsList>

          <TabsContent value="load-balancers" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Load Balancers</CardTitle>
                    <CardDescription>Manage your ALB and NLB instances</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <LoadBalancerList />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="target-groups" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Target Groups</CardTitle>
                    <CardDescription>Route traffic to registered targets</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <TargetGroupList />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
