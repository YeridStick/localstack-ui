"use client";

import { useState } from "react";
import { AlertCircle, Braces, FileCode2, Rocket, Terminal } from "lucide-react";
import { toast } from "sonner";
import { useRunTerraform, useTerraformStatus, TerraformAction, TerraformMode } from "@/hooks/use-terraform-iac";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

const TERRAFORM_SAMPLE = `resource "aws_vpc" "lab" {
  cidr_block           = "10.40.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "terraform-lab-vpc"
  }
}

resource "aws_subnet" "public_a" {
  vpc_id            = aws_vpc.lab.id
  cidr_block        = "10.40.1.0/24"
  availability_zone = "us-east-1a"

  tags = {
    Name = "terraform-public-a"
  }
}`;

const CLOUDFORMATION_SAMPLE = `AWSTemplateFormatVersion: "2010-09-09"
Description: "VPC and Security Group"
Resources:
  LabVPC:
    Type: AWS::EC2::VPC
    Properties:
      CidrBlock: 10.30.0.0/16
      EnableDnsHostnames: true
      Tags:
        - Key: Name
          Value: cfn-lab-vpc

  LabSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: Access to local lab
      VpcId: !Ref LabVPC
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 22
          ToPort: 22
          CidrIp: 0.0.0.0/0`;

export function IaCWorkbench() {
  const { data: runtime, isLoading: loadingRuntime } = useTerraformStatus();
  const runTerraform = useRunTerraform();

  const [mode, setMode] = useState<TerraformMode>("cloudformation-bridge");
  const [workspaceName, setWorkspaceName] = useState("network-lab");
  const [terraformConfig, setTerraformConfig] = useState(TERRAFORM_SAMPLE);
  const [cloudFormationStackName, setCloudFormationStackName] = useState(
    "hybrid-network-stack",
  );
  const [cloudFormationTemplate, setCloudFormationTemplate] = useState(
    CLOUDFORMATION_SAMPLE,
  );
  const [output, setOutput] = useState("");

  const execute = async (action: TerraformAction) => {
    if (!runtime?.terraformAvailable) {
      toast.error("Terraform CLI no esta disponible en el entorno del servidor.");
      return;
    }

    try {
      const result = await runTerraform.mutateAsync({
        action,
        mode,
        workspaceName,
        terraformConfig,
        cloudFormationStackName,
        cloudFormationTemplate,
      });

      setOutput(result.output || "Ejecucion completada sin salida.");
      if (action === "plan") {
        toast.success(
          result.hasChanges
            ? "Plan generado: hay cambios pendientes."
            : "Plan generado: no hay cambios.",
        );
      } else {
        toast.success(`Accion '${action}' completada.`);
      }
    } catch (error: any) {
      const message = error?.message || "Fallo en la ejecucion de Terraform";
      setOutput(message);
      toast.error(message);
    }
  };

  return (
    <Card className="border-slate-300/60">
      <CardHeader className="space-y-3 border-b bg-slate-50/60">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Rocket className="h-5 w-5 text-slate-700" />
              IaC Workbench (Terraform + CloudFormation)
            </CardTitle>
            <CardDescription>
              Ejecuta infraestructura real en LocalStack usando Terraform y, si
              quieres, orquesta stacks de CloudFormation desde Terraform.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={runtime?.terraformAvailable ? "default" : "destructive"}>
              {loadingRuntime
                ? "Verificando..."
                : runtime?.terraformAvailable
                  ? `Terraform ${runtime.terraformVersion || ""}`.trim()
                  : "Terraform no disponible"}
            </Badge>
            <Badge variant="outline">
              Endpoint: {runtime?.localstackEndpoint || "http://localhost:4566"}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        {!runtime?.terraformAvailable && !loadingRuntime && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Instala Terraform en la maquina donde corre Next.js para habilitar
              esta funcionalidad.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2 md:col-span-1">
            <Label htmlFor="workspaceName">Workspace</Label>
            <Input
              id="workspaceName"
              value={workspaceName}
              onChange={(event) => setWorkspaceName(event.target.value)}
              placeholder="network-lab"
            />
          </div>
          <div className="flex items-end gap-2 md:col-span-2">
            <Button
              variant="outline"
              onClick={() => execute("validate")}
              disabled={runTerraform.isPending}
            >
              Validate
            </Button>
            <Button
              variant="outline"
              onClick={() => execute("plan")}
              disabled={runTerraform.isPending}
            >
              Plan
            </Button>
            <Button onClick={() => execute("apply")} disabled={runTerraform.isPending}>
              Apply
            </Button>
            <Button
              variant="destructive"
              onClick={() => execute("destroy")}
              disabled={runTerraform.isPending}
            >
              Destroy
            </Button>
          </div>
        </div>

        <Tabs value={mode} onValueChange={(value) => setMode(value as TerraformMode)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="cloudformation-bridge">
              <FileCode2 className="mr-2 h-4 w-4" />
              Bridge CloudFormation
            </TabsTrigger>
            <TabsTrigger value="terraform">
              <Braces className="mr-2 h-4 w-4" />
              Terraform Nativo
            </TabsTrigger>
          </TabsList>

          <TabsContent value="cloudformation-bridge" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="stackName">CloudFormation Stack Name</Label>
              <Input
                id="stackName"
                value={cloudFormationStackName}
                onChange={(event) => setCloudFormationStackName(event.target.value)}
                placeholder="hybrid-network-stack"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cfnTemplate">
                CloudFormation Template (YAML o JSON)
              </Label>
              <Textarea
                id="cfnTemplate"
                value={cloudFormationTemplate}
                onChange={(event) => setCloudFormationTemplate(event.target.value)}
                className="min-h-[260px] font-mono text-xs"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bridgeTerraform">
                Terraform adicional (opcional)
              </Label>
              <Textarea
                id="bridgeTerraform"
                value={terraformConfig}
                onChange={(event) => setTerraformConfig(event.target.value)}
                className="min-h-[180px] font-mono text-xs"
              />
            </div>
          </TabsContent>

          <TabsContent value="terraform" className="space-y-2">
            <Label htmlFor="terraformConfig">Terraform HCL</Label>
            <Textarea
              id="terraformConfig"
              value={terraformConfig}
              onChange={(event) => setTerraformConfig(event.target.value)}
              className="min-h-[420px] font-mono text-xs"
            />
          </TabsContent>
        </Tabs>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <Terminal className="h-4 w-4" />
              Salida
            </Label>
            {runTerraform.isPending && (
              <Badge variant="secondary">Ejecutando...</Badge>
            )}
          </div>
          <pre className="max-h-[320px] overflow-auto rounded-md border bg-slate-950 p-4 text-xs text-slate-100">
            {output || "Aqui se mostrara la salida de Terraform."}
          </pre>
        </div>
      </CardContent>
    </Card>
  );
}
