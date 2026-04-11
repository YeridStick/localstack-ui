"use client";

import { useState, Fragment } from "react";
import { useVPCs, useDeleteVPC } from "@/hooks/use-vpc";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Network, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VPCResourceAttachments } from "./vpc-resource-attachments";

function getStateColor(state: string) {
  return state === "available" ? "bg-green-500" : "bg-yellow-500";
}

export function VPCList() {
  const { data: vpcs, isLoading } = useVPCs();
  const deleteVPC = useDeleteVPC();
  const [expandedVpc, setExpandedVpc] = useState<string | null>(null);

  const toggleExpand = (vpcId: string) => {
    setExpandedVpc(expandedVpc === vpcId ? null : vpcId);
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

  if (!vpcs || vpcs.length === 0) {
    return (
      <div className="text-center py-12">
        <Network className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No VPCs found</p>
        <p className="text-sm text-muted-foreground mt-2">
          Create a VPC to get started
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10"></TableHead>
          <TableHead>VPC ID</TableHead>
          <TableHead>CIDR Block</TableHead>
          <TableHead>State</TableHead>
          <TableHead>Default</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Docker Network</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {vpcs.map((vpc) => (
          <Fragment key={vpc.id || vpc.vpcId}>
            <TableRow>
              <TableCell>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => toggleExpand(vpc.id || vpc.vpcId)}
                >
                  {expandedVpc === (vpc.id || vpc.vpcId) ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              </TableCell>
              <TableCell className="font-medium font-mono">{vpc.id || vpc.vpcId}</TableCell>
              <TableCell>{vpc.cidrBlock}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${getStateColor(vpc.state)}`} />
                  <span className="capitalize">{vpc.state}</span>
                </div>
              </TableCell>
              <TableCell>
                {vpc.isDefault ? (
                  <Badge variant="default">Default</Badge>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell>{vpc.name || vpc.tags?.Name || "-"}</TableCell>
              <TableCell className="font-mono text-xs">{vpc.dockerNetworkName || "-"}</TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteVPC.mutate(vpc.id || vpc.vpcId)}
                  disabled={deleteVPC.isPending}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </TableCell>
            </TableRow>
            {expandedVpc === (vpc.id || vpc.vpcId) && (
              <TableRow key={`${vpc.id || vpc.vpcId}-details`}>
                <TableCell colSpan={8} className="p-0">
                  <div className="bg-muted/30 p-4">
                    <VPCResourceAttachments vpcId={vpc.id || vpc.vpcId} />
                  </div>
                </TableCell>
              </TableRow>
            )}
          </Fragment>
        ))}
      </TableBody>
    </Table>
  );
}
