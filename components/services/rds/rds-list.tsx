"use client";

import { useRDSInstances, useDeleteRDSInstance } from "@/hooks/use-rds";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Database, Trash2, Plus, MoreVertical, Network } from "lucide-react";
import { CreateRDSDialog } from "./create-rds-dialog";
import { MoveRDSToVPCDialog } from "./move-to-vpc-dialog";
import { useState } from "react";
import { RDSInstance } from "@/types/rds";

export function RDSList() {
  const { data: instances, isLoading } = useRDSInstances();
  const deleteRDS = useDeleteRDSInstance();
  const [moveVpcDialogOpen, setMoveVpcDialogOpen] = useState(false);
  const [rdsToMove, setRdsToMove] = useState<RDSInstance | null>(null);

  if (isLoading) {
    return <div className="p-4">Loading RDS instances...</div>;
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "available":
        return "bg-green-500";
      case "creating":
        return "bg-yellow-500";
      case "deleting":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Database className="h-6 w-6" />
          RDS Instances
        </h2>
        <CreateRDSDialog />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Engine</TableHead>
            <TableHead>DB Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Endpoint</TableHead>
            <TableHead>VPC</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {instances?.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                No RDS instances found. Create one to get started.
              </TableCell>
            </TableRow>
          )}
          {instances?.map((instance) => (
            <TableRow key={instance.id}>
              <TableCell className="font-mono text-xs">{instance.id}</TableCell>
              <TableCell>
                <Badge variant="outline">{instance.engine}</Badge>
              </TableCell>
              <TableCell>{instance.dbName}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${getStatusColor(instance.status)}`} />
                  <span className="capitalize">{instance.status}</span>
                </div>
              </TableCell>
              <TableCell className="font-mono text-xs">
                {instance.endpoint || "-"}
              </TableCell>
              <TableCell className="font-mono text-xs">
                {instance.vpcId}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => deleteRDS.mutate(instance.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setRdsToMove(instance);
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

      <MoveRDSToVPCDialog
        open={moveVpcDialogOpen}
        onOpenChange={setMoveVpcDialogOpen}
        rdsId={rdsToMove?.id || ""}
        currentVpcId={rdsToMove?.vpcId}
      />
    </div>
  );
}
