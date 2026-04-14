"use client";

import { useState } from "react";
import { 
  useCloudFormationStacks, 
  useCreateCloudFormationStack, 
  useDeleteCloudFormationStack 
} from "@/hooks/use-vpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { 
  Layers, 
  Plus, 
  Trash2, 
  RefreshCw,
  FileCode,
  CheckCircle,
  XCircle,
  Clock
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function CloudFormationList() {
  const { data, isLoading, refetch } = useCloudFormationStacks();
  const createStack = useCreateCloudFormationStack();
  const deleteStack = useDeleteCloudFormationStack();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [templateBody, setTemplateBody] = useState("");
  const [stackName, setStackName] = useState("");

  const handleCreate = async () => {
    if (!stackName || !templateBody) return;
    try {
      await createStack.mutateAsync({
        stackName,
        templateBody,
      });
      setCreateDialogOpen(false);
      setStackName("");
      setTemplateBody("");
    } catch (error) {
      console.error("Failed to create stack:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Layers className="h-5 w-5" />
            CloudFormation Stacks
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage infrastructure as code
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Create Stack
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create CloudFormation Stack</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Stack Name</label>
                  <Input
                    placeholder="my-infrastructure-stack"
                    value={stackName}
                    onChange={(e) => setStackName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Template (YAML/JSON)</label>
                  <Textarea
                    placeholder={`AWSTemplateFormatVersion: '2010-09-09'
Resources:
  MyVPC:
    Type: AWS::EC2::VPC
    Properties:
      CidrBlock: 10.0.0.0/16`}
                    value={templateBody}
                    onChange={(e) => setTemplateBody(e.target.value)}
                    className="min-h-[300px] font-mono text-sm"
                  />
                </div>
                <Button 
                  onClick={handleCreate} 
                  disabled={createStack.isPending || !stackName || !templateBody}
                  className="w-full"
                >
                  {createStack.isPending ? "Creating..." : "Create Stack"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stack Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!data?.stacks || data.stacks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <Layers className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No CloudFormation stacks found</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Create a stack to manage infrastructure as code
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                data.stacks.map((stack) => (
                  <TableRow key={stack.StackId}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FileCode className="h-4 w-4 text-blue-500" />
                        {stack.StackName}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={stack.StackStatus} />
                    </TableCell>
                    <TableCell>
                      {formatDistanceToNow(new Date(stack.CreationTime), { addSuffix: true })}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {stack.TemplateDescription || "-"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteStack.mutate(stack.StackName)}
                        disabled={deleteStack.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Sample Templates Card */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-sm">Sample Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SampleTemplateCard
              title="Basic VPC"
              description="Create a VPC with subnet and internet gateway"
              onClick={() => {
                setStackName("basic-vpc");
                setTemplateBody(`AWSTemplateFormatVersion: '2010-09-09'
Resources:
  VPC:
    Type: AWS::EC2::VPC
    Properties:
      CidrBlock: 10.0.0.0/16
      Tags:
        - Key: Name
          Value: MyVPC`);
                setCreateDialogOpen(true);
              }}
            />
            <SampleTemplateCard
              title="EC2 Instance"
              description="Launch an EC2 instance in a VPC"
              onClick={() => {
                setStackName("ec2-instance");
                setTemplateBody(`AWSTemplateFormatVersion: '2010-09-09'
Resources:
  EC2Instance:
    Type: AWS::EC2::Instance
    Properties:
      ImageId: ami-12345678
      InstanceType: t2.micro
      Tags:
        - Key: Name
          Value: MyInstance`);
                setCreateDialogOpen(true);
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const isSuccess = status.includes("COMPLETE") || status === "CREATE_COMPLETE";
  const isFailed = status.includes("FAILED") || status.includes("ROLLBACK");
  const isInProgress = status.includes("PROGRESS") || status.includes("PENDING");

  return (
    <Badge
      variant={isSuccess ? "default" : isFailed ? "destructive" : "secondary"}
      className="flex items-center gap-1 w-fit"
    >
      {isSuccess ? (
        <CheckCircle className="h-3 w-3" />
      ) : isFailed ? (
        <XCircle className="h-3 w-3" />
      ) : (
        <Clock className="h-3 w-3" />
      )}
      {status}
    </Badge>
  );
}

interface SampleTemplateCardProps {
  title: string;
  description: string;
  onClick: () => void;
}

function SampleTemplateCard({ title, description, onClick }: SampleTemplateCardProps) {
  return (
    <div
      className="border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={onClick}
    >
      <div className="flex items-center gap-2 mb-2">
        <FileCode className="h-4 w-4 text-blue-500" />
        <span className="font-medium text-sm">{title}</span>
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
