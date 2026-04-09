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
import { useVPCs, useSubnets, useSecurityGroups } from "@/hooks/use-vpc";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface CreateInstanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const INSTANCE_TYPES = [
  "t2.micro",
  "t2.small",
  "t2.medium",
  "t3.micro",
  "t3.small",
  "t3.medium",
  "m5.large",
];

const AMIS = [
  { id: "ami-12345678", name: "Amazon Linux 2", os: "linux" },
  { id: "ami-87654321", name: "Ubuntu 20.04", os: "linux" },
  { id: "ami-abcd1234", name: "Windows Server 2019", os: "windows" },
];

export function CreateInstanceDialog({
  open,
  onOpenChange,
}: CreateInstanceDialogProps) {
  const queryClient = useQueryClient();
  const [imageId, setImageId] = useState("");
  const [instanceType, setInstanceType] = useState("t2.micro");
  const [keyName, setKeyName] = useState("");
  const [vpcId, setVpcId] = useState<string | undefined>(undefined);
  const [subnetId, setSubnetId] = useState<string | undefined>(undefined);
  const [volumeSize, setVolumeSize] = useState(8);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: vpcs } = useVPCs();
  const { data: subnets } = useSubnets(vpcId || undefined);
  const { data: securityGroups } = useSecurityGroups(vpcId || undefined);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/ec2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageId,
          instanceType,
          keyName: keyName || undefined,
          subnetId: subnetId,
          volumeSize,
          minCount: 1,
          maxCount: 1,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create instance");
      }

      toast.success("EC2 instance created successfully");
      queryClient.invalidateQueries({ queryKey: ["ec2-instances"] });
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      toast.error(error.message || "Failed to create instance");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setImageId("");
    setInstanceType("t2.micro");
    setKeyName("");
    setVpcId(undefined);
    setSubnetId(undefined);
    setVolumeSize(8);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create EC2 Instance</DialogTitle>
          <DialogDescription>
            Launch a new EC2 instance in your VPC
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ami">Amazon Machine Image (AMI) *</Label>
              <Select value={imageId} onValueChange={setImageId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select AMI" />
                </SelectTrigger>
                <SelectContent>
                  {AMIS.map((ami) => (
                    <SelectItem key={ami.id} value={ami.id}>
                      {ami.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="instanceType">Instance Type *</Label>
              <Select value={instanceType} onValueChange={setInstanceType} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select instance type" />
                </SelectTrigger>
                <SelectContent>
                  {INSTANCE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="keyName">Key Pair Name (optional)</Label>
            <Input
              id="keyName"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              placeholder="my-key-pair"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="vpc">VPC (optional)</Label>
            <Select value={vpcId} onValueChange={(value) => { setVpcId(value === "__default__" ? undefined : value); setSubnetId(undefined); }}>
              <SelectTrigger>
                <SelectValue placeholder="Default VPC" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__default__">Default VPC</SelectItem>
                {vpcs?.map((vpc) => (
                  <SelectItem key={vpc.vpcId} value={vpc.vpcId}>
                    {vpc.tags?.Name || vpc.vpcId} ({vpc.cidrBlock})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {vpcId && (
            <div className="space-y-2">
              <Label htmlFor="subnet">Subnet (optional)</Label>
              <Select value={subnetId} onValueChange={(value) => setSubnetId(value === "__auto__" ? undefined : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Auto-select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__auto__">Auto-select</SelectItem>
                  {subnets?.map((subnet) => (
                    <SelectItem key={subnet.subnetId} value={subnet.subnetId}>
                      {subnet.subnetId} ({subnet.cidrBlock}) - {subnet.availabilityZone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="volumeSize">Root Volume Size (GB)</Label>
            <Input
              id="volumeSize"
              type="number"
              min={8}
              max={16384}
              value={volumeSize}
              onChange={(e) => setVolumeSize(parseInt(e.target.value) || 8)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Size of the root EBS volume (8-16384 GB)
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !imageId}>
              {isSubmitting ? "Creating..." : "Create Instance"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
