"use client";

import { useSecurityGroups } from "@/hooks/use-vpc";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield } from "lucide-react";

export function SecurityGroupList() {
  const { data: securityGroups, isLoading } = useSecurityGroups();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (!securityGroups || securityGroups.length === 0) {
    return (
      <div className="text-center py-12">
        <Shield className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No security groups found</p>
        <p className="text-sm text-muted-foreground mt-2">
          Create security groups to control traffic
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Group ID</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>VPC ID</TableHead>
          <TableHead>Inbound Rules</TableHead>
          <TableHead>Outbound Rules</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {securityGroups.map((sg) => (
          <TableRow key={sg.groupId}>
            <TableCell className="font-medium font-mono">{sg.groupId}</TableCell>
            <TableCell>{sg.groupName}</TableCell>
            <TableCell className="max-w-xs truncate">{sg.description}</TableCell>
            <TableCell className="font-mono text-sm">{sg.vpcId}</TableCell>
            <TableCell>{sg.ipPermissions?.length || 0}</TableCell>
            <TableCell>{sg.ipPermissionsEgress?.length || 0}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
