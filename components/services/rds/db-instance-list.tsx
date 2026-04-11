"use client";

import { useState } from "react";
import { useRDSInstances, useDeleteRDSInstance } from "@/hooks/use-rds";
import { RDSInstance } from "@/types/rds";
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
import { MoreVertical, Trash2, Database, Eye, Copy, ExternalLink, Network } from "lucide-react";
import { formatDistanceToNow } from "@/lib/utils";
import { MoveRDSToVPCDialog } from "./move-to-vpc-dialog";

function StatusBadge({ status }: { status: string }) {
  const getColor = () => {
    switch (status.toLowerCase()) {
      case "available":
        return "bg-green-500";
      case "creating":
      case "modifying":
        return "bg-blue-500";
      case "deleting":
        return "bg-red-500";
      default:
        return "bg-yellow-500";
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className={`h-2 w-2 rounded-full ${getColor()}`} />
      <span className="capitalize">{status}</span>
    </div>
  );
}

export function DBInstanceList() {
  const { data: instances, isLoading } = useRDSInstances();
  const deleteInstance = useDeleteRDSInstance();
  
  const [instanceToDelete, setInstanceToDelete] = useState<RDSInstance | null>(null);
  const [instanceToView, setInstanceToView] = useState<RDSInstance | null>(null);
  const [moveVpcDialogOpen, setMoveVpcDialogOpen] = useState(false);
  const [instanceToMove, setInstanceToMove] = useState<RDSInstance | null>(null);

  const handleDelete = async () => {
    if (!instanceToDelete) return;

    await deleteInstance.mutateAsync(instanceToDelete.id);
    setInstanceToDelete(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
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
        <Database className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No RDS instances found</p>
        <p className="text-sm text-muted-foreground mt-2">
          Create database instances using AWS CLI commands
        </p>
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>DB Identifier</TableHead>
            <TableHead>Engine</TableHead>
            <TableHead>Class</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Endpoint</TableHead>
            <TableHead>Container ID</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {instances.map((instance, index) => (
            <TableRow key={instance.id || `rds-${index}`}>
              <TableCell className="font-medium">
                {instance.id}
              </TableCell>
              <TableCell>
                {instance.engine} {instance.engineVersion}
              </TableCell>
              <TableCell>{instance.instanceClass}</TableCell>
              <TableCell>
                <StatusBadge status={instance.status} />
              </TableCell>
              <TableCell>
                {instance.endpoint ? (
                  <span className="text-sm font-mono">
                    {instance.endpoint}
                  </span>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell>
                {instance.containerId ? (
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">
                    {instance.containerId.substring(0, 12)}
                  </code>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell>
                {instance.createdAt
                  ? `${formatDistanceToNow(new Date(instance.createdAt))} ago`
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
                    <DropdownMenuItem onClick={() => setInstanceToView(instance)}>
                      <Eye className="mr-2 h-4 w-4" />
                      View Connection
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => setInstanceToDelete(instance)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Instance
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setInstanceToMove(instance);
                        setMoveVpcDialogOpen(true);
                      }}
                    >
                      <Network className="mr-2 h-4 w-4" />
                      Move to VPC
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <AlertDialog
        open={!!instanceToDelete}
        onOpenChange={() => setInstanceToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete RDS Instance</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the RDS instance{" "}
              <strong>{instanceToDelete?.id}</strong>? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Connection Details Dialog */}
      <AlertDialog
        open={!!instanceToView}
        onOpenChange={() => setInstanceToView(null)}
      >
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Database Connection Details</AlertDialogTitle>
            <AlertDialogDescription>
              Use these credentials to connect to your database instance.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {instanceToView && (
            <div className="space-y-4 my-4">
              <div className="grid grid-cols-3 gap-2 text-sm">
                <span className="text-muted-foreground">Endpoint:</span>
                <span className="col-span-2 font-mono">{instanceToView.endpoint}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <span className="text-muted-foreground">Port:</span>
                <span className="col-span-2 font-mono">5432</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <span className="text-muted-foreground">Database:</span>
                <span className="col-span-2 font-mono">{instanceToView.dbName || "postgres"}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <span className="text-muted-foreground">Username:</span>
                <span className="col-span-2 font-mono">{instanceToView.masterUsername}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <span className="text-muted-foreground">Password:</span>
                <span className="col-span-2 font-mono">{instanceToView.masterUserPassword}</span>
              </div>
              
              <div className="pt-4 border-t">
                <p className="text-sm font-medium mb-2">Connection Command:</p>
                <div className="bg-muted p-3 rounded-md relative group">
                  <code className="text-xs font-mono break-all">
                    PGPASSWORD="{instanceToView.masterUserPassword}" psql -h {instanceToView.endpoint?.split(":")[0]} -p 5432 -U {instanceToView.masterUsername} -d {instanceToView.dbName || "postgres"}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => copyToClipboard(`PGPASSWORD="${instanceToView.masterUserPassword}" psql -h ${instanceToView.endpoint?.split(":")[0]} -p 5432 -U ${instanceToView.masterUsername} -d ${instanceToView.dbName || "postgres"}`)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              
              <div className="pt-2">
                <p className="text-sm font-medium mb-2">Connection String:</p>
                <div className="bg-muted p-3 rounded-md relative group">
                  <code className="text-xs font-mono break-all">
                    postgresql://{instanceToView.masterUsername}:{instanceToView.masterUserPassword}@{instanceToView.endpoint}/{instanceToView.dbName || "postgres"}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => copyToClipboard(`postgresql://${instanceToView.masterUsername}:${instanceToView.masterUserPassword}@${instanceToView.endpoint}/${instanceToView.dbName || "postgres"}`)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <MoveRDSToVPCDialog
        open={moveVpcDialogOpen}
        onOpenChange={setMoveVpcDialogOpen}
        rdsId={instanceToMove?.id || ""}
        currentVpcId={instanceToMove?.vpcId}
      />
    </>
  );
}