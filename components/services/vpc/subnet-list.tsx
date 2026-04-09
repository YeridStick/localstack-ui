"use client";

import { useSubnets } from "@/hooks/use-vpc";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Network } from "lucide-react";

function getStateColor(state: string) {
  return state === "available" ? "bg-green-500" : "bg-yellow-500";
}

export function SubnetList() {
  const { data: subnets, isLoading } = useSubnets();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (!subnets || subnets.length === 0) {
    return (
      <div className="text-center py-12">
        <Network className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No subnets found</p>
        <p className="text-sm text-muted-foreground mt-2">
          Create a subnet within a VPC
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Subnet ID</TableHead>
          <TableHead>VPC ID</TableHead>
          <TableHead>CIDR Block</TableHead>
          <TableHead>AZ</TableHead>
          <TableHead>State</TableHead>
          <TableHead>Available IPs</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {subnets.map((subnet) => (
          <TableRow key={subnet.subnetId}>
            <TableCell className="font-medium font-mono">{subnet.subnetId}</TableCell>
            <TableCell className="font-mono text-sm">{subnet.vpcId}</TableCell>
            <TableCell>{subnet.cidrBlock}</TableCell>
            <TableCell>{subnet.availabilityZone}</TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${getStateColor(subnet.state || "available")}`} />
                <span className="capitalize">{subnet.state}</span>
              </div>
            </TableCell>
            <TableCell>{subnet.availableIpAddressCount}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
