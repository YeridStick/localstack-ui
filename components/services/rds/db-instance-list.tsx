"use client";

import { useState } from "react";
import { useRDSInstances, useDeleteRDSInstance } from "@/hooks/use-rds";
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
import { MoreVertical, Trash2, Database, Eye } from "lucide-react";
import { formatDistanceToNow } from "@/lib/utils";
import { RDSDBInstance } from "@/types";

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
  
  const [instanceToDelete, setInstanceToDelete] = useState<RDSDBInstance | null>(null);

  const handleDelete = async () => {
    if (!instanceToDelete) return;

    await deleteInstance.mutateAsync({
      dbInstanceIdentifier: instanceToDelete.dbInstanceIdentifier,
    });
    setInstanceToDelete(null);
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
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {instances.map((instance) => (
            <TableRow key={instance.dbInstanceIdentifier}>
              <TableCell className="font-medium">
                {instance.dbInstanceIdentifier}
              </TableCell>
              <TableCell>
                {instance.engine} {instance.engineVersion}
              </TableCell>
              <TableCell>{instance.dbInstanceClass}</TableCell>
              <TableCell>
                <StatusBadge status={instance.dbInstanceStatus} />
              </TableCell>
              <TableCell>
                {instance.endpoint ? (
                  <span className="text-sm font-mono">
                    {instance.endpoint.address}:{instance.endpoint.port}
                  </span>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell>
                {instance.instanceCreateTime
                  ? `${formatDistanceToNow(new Date(instance.instanceCreateTime))} ago`
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
                      className="text-destructive"
                      onClick={() => setInstanceToDelete(instance)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Instance
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
              <strong>{instanceToDelete?.dbInstanceIdentifier}</strong>? This action
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
    </>
  );
}