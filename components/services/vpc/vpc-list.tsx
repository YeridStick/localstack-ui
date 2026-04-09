"use client";

import { useVPCs, useCreateVPC } from "@/hooks/use-vpc";
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
import { Network } from "lucide-react";

function getStateColor(state: string) {
  return state === "available" ? "bg-green-500" : "bg-yellow-500";
}

export function VPCList() {
  const { data: vpcs, isLoading } = useVPCs();

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
          <TableHead>VPC ID</TableHead>
          <TableHead>CIDR Block</TableHead>
          <TableHead>State</TableHead>
          <TableHead>Default</TableHead>
          <TableHead>Name</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {vpcs.map((vpc) => (
          <TableRow key={vpc.vpcId}>
            <TableCell className="font-medium font-mono">{vpc.vpcId}</TableCell>
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
            <TableCell>{vpc.tags?.Name || "-"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
