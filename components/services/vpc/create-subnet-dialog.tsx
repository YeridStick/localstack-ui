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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateSubnet, useVPCs } from "@/hooks/use-vpc";

interface CreateSubnetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateSubnetDialog({ open, onOpenChange }: CreateSubnetDialogProps) {
  const [vpcId, setVpcId] = useState("");
  const [cidrBlock, setCidrBlock] = useState("10.0.1.0/24");
  const [availabilityZone, setAvailabilityZone] = useState("");
  const createSubnet = useCreateSubnet();
  const { data: vpcs } = useVPCs();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createSubnet.mutateAsync({
      vpcId,
      cidrBlock,
      availabilityZone: availabilityZone || undefined,
    });
    onOpenChange(false);
    setVpcId("");
    setCidrBlock("10.0.1.0/24");
    setAvailabilityZone("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Subnet</DialogTitle>
          <DialogDescription>
            Create a subnet within a VPC
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="vpc">VPC</Label>
            <Select value={vpcId} onValueChange={setVpcId} required>
              <SelectTrigger>
                <SelectValue placeholder="Select VPC" />
              </SelectTrigger>
              <SelectContent>
                {vpcs?.map((vpc) => (
                  <SelectItem key={vpc.vpcId} value={vpc.vpcId}>
                    {vpc.tags?.Name || vpc.vpcId} ({vpc.cidrBlock})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cidr">CIDR Block</Label>
            <Input
              id="cidr"
              value={cidrBlock}
              onChange={(e) => setCidrBlock(e.target.value)}
              placeholder="10.0.1.0/24"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="az">Availability Zone (optional)</Label>
            <Input
              id="az"
              value={availabilityZone}
              onChange={(e) => setAvailabilityZone(e.target.value)}
              placeholder="us-east-1a"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createSubnet.isPending || !vpcId}>
              {createSubnet.isPending ? "Creating..." : "Create Subnet"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
