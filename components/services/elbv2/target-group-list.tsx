"use client";

import { useTargetGroups } from "@/hooks/use-elbv2";
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
import { Target } from "lucide-react";

export function TargetGroupList() {
  const { data: targetGroups, isLoading } = useTargetGroups();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (!targetGroups || targetGroups.length === 0) {
    return (
      <div className="text-center py-12">
        <Target className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No target groups found</p>
        <p className="text-sm text-muted-foreground mt-2">
          Create target groups to route traffic to your instances
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Protocol</TableHead>
          <TableHead>Port</TableHead>
          <TableHead>Target Type</TableHead>
          <TableHead>VPC</TableHead>
          <TableHead>Health Check</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {targetGroups.map((tg) => (
          <TableRow key={tg.targetGroupArn}>
            <TableCell className="font-medium">{tg.targetGroupName}</TableCell>
            <TableCell>{tg.protocol}</TableCell>
            <TableCell>{tg.port}</TableCell>
            <TableCell>
              <Badge variant="outline" className="capitalize">
                {tg.targetType}
              </Badge>
            </TableCell>
            <TableCell className="font-mono text-sm">{tg.vpcId || "-"}</TableCell>
            <TableCell>
              {tg.healthCheckEnabled ? (
                <span className="text-green-600 text-sm">Enabled</span>
              ) : (
                <span className="text-muted-foreground text-sm">Disabled</span>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
