"use client";

import { useState } from "react";
import {
  useEC2Instances,
  useStartInstance,
  useStopInstance,
  useTerminateInstance,
} from "@/hooks/use-ec2";
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
import { MoreVertical, Play, Square, Trash2, Server, Eye } from "lucide-react";
import { formatDistanceToNow } from "@/lib/utils";
import { EC2Instance } from "@/types";

function getStateColor(state: string) {
  switch (state) {
    case "running":
      return "bg-green-500";
    case "stopped":
      return "bg-yellow-500";
    case "pending":
    case "stopping":
      return "bg-blue-500";
    case "shutting-down":
    case "terminated":
      return "bg-red-500";
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

export function InstanceList() {
  const { data: instances, isLoading } = useEC2Instances();
  const startInstance = useStartInstance();
  const stopInstance = useStopInstance();
  const terminateInstance = useTerminateInstance();
  
  const [selectedInstance, setSelectedInstance] = useState<EC2Instance | null>(null);
  const [action, setAction] = useState<"start" | "stop" | "terminate" | null>(null);

  const handleAction = async () => {
    if (!selectedInstance || !action) return;

    switch (action) {
      case "start":
        await startInstance.mutateAsync(selectedInstance.instanceId);
        break;
      case "stop":
        await stopInstance.mutateAsync(selectedInstance.instanceId);
        break;
      case "terminate":
        await terminateInstance.mutateAsync(selectedInstance.instanceId);
        break;
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
        <Server className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No EC2 instances found</p>
        <p className="text-sm text-muted-foreground mt-2">
          Create instances using AWS CLI or MiniStack commands
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
            <TableHead>Type</TableHead>
            <TableHead>State</TableHead>
            <TableHead>Public IP</TableHead>
            <TableHead>Launched</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {instances.map((instance) => (
            <TableRow key={instance.instanceId}>
              <TableCell className="font-medium">{instance.instanceId}</TableCell>
              <TableCell>{instance.instanceType}</TableCell>
              <TableCell>
                <InstanceStateBadge state={instance.state} />
              </TableCell>
              <TableCell>
                {instance.publicIpAddress || (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell>
                {instance.launchTime
                  ? `${formatDistanceToNow(new Date(instance.launchTime))} ago`
                  : "-"}
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
              {action === "terminate" ? "Terminate Instance" : `${action?.charAt(0).toUpperCase()}${action?.slice(1)} Instance`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {action === "terminate" ? (
                <>
                  Are you sure you want to terminate instance{" "}
                  <strong>{selectedInstance?.instanceId}</strong>? This action cannot be
                  undone and the instance will be permanently deleted.
                </>
              ) : (
                <>
                  Are you sure you want to {action} instance{" "}
                  <strong>{selectedInstance?.instanceId}</strong>?
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAction}
              className={action === "terminate" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
            >
              {action === "terminate" ? "Terminate Instance" : `${action?.charAt(0).toUpperCase()}${action?.slice(1)} Instance`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}