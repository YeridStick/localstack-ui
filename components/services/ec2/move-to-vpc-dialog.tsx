"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMoveEC2ToVPC } from "@/hooks/use-vpc-attach";
import { useVPCs } from "@/hooks/use-vpc";
import { Network } from "lucide-react";

interface MoveToVPCDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instanceId: string;
  currentVpcId?: string;
}

export function MoveToVPCDialog({
  open,
  onOpenChange,
  instanceId,
  currentVpcId,
}: MoveToVPCDialogProps) {
  const [selectedVpcId, setSelectedVpcId] = useState<string>("");
  const { data: vpcs } = useVPCs();
  const moveMutation = useMoveEC2ToVPC();
  const resolveVpcId = (vpc: { id?: string; vpcId: string }) => vpc.id || vpc.vpcId;

  const handleMove = async () => {
    if (!selectedVpcId) return;

    try {
      await moveMutation.mutateAsync({
        instanceId,
        vpcId: selectedVpcId,
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to move instance:", error);
    }
  };

  // Filter out current VPC from options
  const availableVpcs =
    vpcs?.filter((vpc) => resolveVpcId(vpc) !== currentVpcId) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Network className="h-5 w-5" />
            Move Instance to VPC
          </DialogTitle>
          <DialogDescription>
            Connect this EC2 instance to a different VPC. The instance will be
            attached to the VPC&apos;s Docker network for network isolation.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <label className="text-sm font-medium mb-2 block">
            Select VPC
          </label>
          <Select value={selectedVpcId} onValueChange={setSelectedVpcId}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a VPC..." />
            </SelectTrigger>
            <SelectContent>
              {availableVpcs.map((vpc) => (
                <SelectItem key={resolveVpcId(vpc)} value={resolveVpcId(vpc)}>
                  {vpc.name || resolveVpcId(vpc)} ({vpc.cidrBlock})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {currentVpcId && (
            <p className="text-sm text-muted-foreground mt-2">
              Current VPC:{" "}
              {vpcs?.find((v) => resolveVpcId(v) === currentVpcId)?.name ||
                currentVpcId}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleMove}
            disabled={!selectedVpcId || moveMutation.isPending}
          >
            {moveMutation.isPending ? "Moving..." : "Move to VPC"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
