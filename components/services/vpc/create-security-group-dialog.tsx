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
import { useCreateSecurityGroup, useVPCs } from "@/hooks/use-vpc";

interface CreateSecurityGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateSecurityGroupDialog({ open, onOpenChange }: CreateSecurityGroupDialogProps) {
  const [groupName, setGroupName] = useState("");
  const [description, setDescription] = useState("");
  const [vpcId, setVpcId] = useState("");
  const createSecurityGroup = useCreateSecurityGroup();
  const { data: vpcs } = useVPCs();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createSecurityGroup.mutateAsync({
      groupName,
      description,
      vpcId,
    });
    onOpenChange(false);
    setGroupName("");
    setDescription("");
    setVpcId("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Security Group</DialogTitle>
          <DialogDescription>
            Create a security group to control inbound and outbound traffic
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Group Name</Label>
            <Input
              id="name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="my-security-group"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description of the security group"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="vpc">VPC</Label>
            <Select value={vpcId} onValueChange={setVpcId} required>
              <SelectTrigger>
                <SelectValue placeholder="Select VPC" />
              </SelectTrigger>
              <SelectContent>
                {vpcs?.map((vpc) => (
                  <SelectItem key={vpc.vpcId} value={vpc.vpcId}>
                    {vpc.tags?.Name || vpc.vpcId}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createSecurityGroup.isPending || !vpcId}>
              {createSecurityGroup.isPending ? "Creating..." : "Create Security Group"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
