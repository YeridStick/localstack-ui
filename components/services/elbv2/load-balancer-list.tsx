"use client";

import { useLoadBalancers, useDeleteLoadBalancer } from "@/hooks/use-elbv2";
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
import { MoreVertical, Trash2, Scale } from "lucide-react";
import { useState } from "react";
import { LoadBalancer } from "@/types";

function getStateColor(state?: { code?: string }) {
  switch (state?.code) {
    case "active":
      return "bg-green-500";
    case "provisioning":
      return "bg-yellow-500";
    case "failed":
      return "bg-red-500";
    default:
      return "bg-gray-500";
  }
}

export function LoadBalancerList() {
  const { data: loadBalancers, isLoading } = useLoadBalancers();
  const deleteLoadBalancer = useDeleteLoadBalancer();
  const [lbToDelete, setLbToDelete] = useState<LoadBalancer | null>(null);

  const handleDelete = async () => {
    if (!lbToDelete?.loadBalancerArn) return;
    await deleteLoadBalancer.mutateAsync(lbToDelete.loadBalancerArn);
    setLbToDelete(null);
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

  if (!loadBalancers || loadBalancers.length === 0) {
    return (
      <div className="text-center py-12">
        <Scale className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No load balancers found</p>
        <p className="text-sm text-muted-foreground mt-2">
          Create an Application or Network Load Balancer
        </p>
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Scheme</TableHead>
            <TableHead>State</TableHead>
            <TableHead>DNS Name</TableHead>
            <TableHead>VPC</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loadBalancers.map((lb) => (
            <TableRow key={lb.loadBalancerArn}>
              <TableCell className="font-medium">{lb.loadBalancerName}</TableCell>
              <TableCell>
                <Badge variant="outline" className="capitalize">
                  {lb.loadBalancerType}
                </Badge>
              </TableCell>
              <TableCell className="capitalize">{lb.scheme}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${getStateColor(lb.state)}`} />
                  <span className="capitalize">{lb.state?.code}</span>
                </div>
              </TableCell>
              <TableCell className="font-mono text-sm">{lb.dnsName}</TableCell>
              <TableCell className="font-mono text-sm">{lb.vpcId || "-"}</TableCell>
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
                      onClick={() => setLbToDelete(lb)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <AlertDialog
        open={!!lbToDelete}
        onOpenChange={() => setLbToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Load Balancer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete load balancer &quot;{lbToDelete?.loadBalancerName}&quot;?
              This action cannot be undone.
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
