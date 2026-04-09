"use client";

import { useState } from "react";
import {
  useDockerInstances,
  useControlDockerInstance,
  useTerminateDockerInstance,
  DockerInstance,
} from "@/hooks/use-ec2-docker";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  MoreVertical,
  Play,
  Square,
  Trash2,
  Server,
  Terminal,
  Container,
} from "lucide-react";
import { InstanceTerminal } from "./instance-terminal";

function getStateColor(state: string) {
  switch (state) {
    case "running":
      return "bg-green-500";
    case "stopped":
      return "bg-yellow-500";
    case "pending":
    case "stopping":
      return "bg-blue-500";
    default:
      return "bg-gray-500";
  }
}

function InstanceStateBadge({ state }: { state: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`h-2 w-2 rounded-full ${getStateColor(state)}`} />
      <span className="capitalize">{state}</span>
    </div>
  );
}

export function InstanceListDocker() {
  const { data: instances, isLoading } = useDockerInstances();
  const controlInstance = useControlDockerInstance();
  const terminateInstance = useTerminateDockerInstance();

  const [selectedInstance, setSelectedInstance] = useState<DockerInstance | null>(null);
  const [action, setAction] = useState<"start" | "stop" | "terminate" | null>(null);
  const [connectInstance, setConnectInstance] = useState<DockerInstance | null>(null);
  const [terminalOpen, setTerminalOpen] = useState(false);

  const handleAction = async () => {
    if (!selectedInstance || !action) return;

    if (action === "terminate") {
      await terminateInstance.mutateAsync(selectedInstance.instanceId);
    } else {
      await controlInstance.mutateAsync({
        instanceId: selectedInstance.instanceId,
        action,
      });
    }
    setSelectedInstance(null);
    setAction(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (!instances || instances.length === 0) {
    return (
      <div className="text-center py-12">
        <Container className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No EC2 instances found</p>
        <p className="text-sm text-muted-foreground mt-2">
          Create Docker-based instances to get started
        </p>
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Instance ID</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Image</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>State</TableHead>
            <TableHead>Container ID</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {instances.map((instance) => (
            <TableRow key={instance.instanceId}>
              <TableCell className="font-medium font-mono text-xs">
                {instance.instanceId}
              </TableCell>
              <TableCell>{instance.name}</TableCell>
              <TableCell>
                <Badge variant="outline" className="font-mono text-xs">
                  {instance.image}
                </Badge>
              </TableCell>
              <TableCell>{instance.instanceType}</TableCell>
              <TableCell>
                <InstanceStateBadge state={instance.state} />
              </TableCell>
              <TableCell className="font-mono text-xs">
                {instance.containerId?.slice(0, 12)}
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedInstance(instance);
                        setAction("start");
                      }}
                      disabled={instance.state === "running"}
                    >
                      <Play className="mr-2 h-4 w-4" />
                      Start
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedInstance(instance);
                        setAction("stop");
                      }}
                      disabled={instance.state === "stopped"}
                    >
                      <Square className="mr-2 h-4 w-4" />
                      Stop
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={instance.state !== "running"}
                      onClick={() => {
                        setConnectInstance({
                          ...instance,
                          state: instance.state as any,
                        });
                        setTerminalOpen(true);
                      }}
                    >
                      <Terminal className="mr-2 h-4 w-4" />
                      Connect (Terminal)
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => {
                        setSelectedInstance(instance);
                        setAction("terminate");
                      }}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Terminate
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <AlertDialog
        open={!!selectedInstance && !!action}
        onOpenChange={() => {
          setSelectedInstance(null);
          setAction(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {action === "terminate"
                ? "Terminate Instance"
                : `${action?.charAt(0).toUpperCase()}${action?.slice(1)} Instance`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {action === "terminate" ? (
                <>
                  Are you sure you want to terminate instance{" "}
                  <strong>{selectedInstance?.name}</strong> ({selectedInstance?.instanceId})?
                  <br />
                  This will stop and remove the Docker container permanently.
                </>
              ) : (
                <>
                  Are you sure you want to {action} instance{" "}
                  <strong>{selectedInstance?.name}</strong>?
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAction}
              className={
                action === "terminate"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : ""
              }
            >
              {action === "terminate" ? "Terminate" : `${action?.charAt(0).toUpperCase()}${action?.slice(1)}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <InstanceTerminal
        instance={
          connectInstance
            ? {
                instanceId: connectInstance.instanceId,
                instanceType: connectInstance.instanceType,
                state: connectInstance.state as "running" | "stopped" | "pending" | "shutting-down" | "terminated" | "stopping",
                publicIpAddress: connectInstance.publicIpAddress,
                containerId: connectInstance.containerId,
                name: connectInstance.name,
              }
            : null
        }
        open={terminalOpen}
        onOpenChange={setTerminalOpen}
      />
    </>
  );
}
