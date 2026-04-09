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
import { useCreateVPC } from "@/hooks/use-vpc";

interface CreateVPCDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateVPCDialog({ open, onOpenChange }: CreateVPCDialogProps) {
  const [cidrBlock, setCidrBlock] = useState("10.0.0.0/16");
  const [name, setName] = useState("");
  const createVPC = useCreateVPC();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const tags = name ? { Name: name } : undefined;
    await createVPC.mutateAsync({ cidrBlock, tags });
    onOpenChange(false);
    setCidrBlock("10.0.0.0/16");
    setName("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create VPC</DialogTitle>
          <DialogDescription>
            Create a new Virtual Private Cloud
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cidr">CIDR Block</Label>
            <Input
              id="cidr"
              value={cidrBlock}
              onChange={(e) => setCidrBlock(e.target.value)}
              placeholder="10.0.0.0/16"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Name Tag (optional)</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="my-vpc"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createVPC.isPending}>
              {createVPC.isPending ? "Creating..." : "Create VPC"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
