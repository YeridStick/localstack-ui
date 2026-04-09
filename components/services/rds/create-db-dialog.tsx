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
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface CreateDBDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ENGINES = [
  { value: "mysql", label: "MySQL" },
  { value: "postgres", label: "PostgreSQL" },
  { value: "mariadb", label: "MariaDB" },
];

const INSTANCE_CLASSES = [
  "db.t3.micro",
  "db.t3.small",
  "db.t3.medium",
  "db.m5.large",
];

export function CreateDBDialog({ open, onOpenChange }: CreateDBDialogProps) {
  const queryClient = useQueryClient();
  const [dbInstanceIdentifier, setDbInstanceIdentifier] = useState("");
  const [engine, setEngine] = useState("mysql");
  const [dbInstanceClass, setDbInstanceClass] = useState("db.t3.micro");
  const [masterUsername, setMasterUsername] = useState("admin");
  const [masterUserPassword, setMasterUserPassword] = useState("");
  const [allocatedStorage, setAllocatedStorage] = useState(20);
  const [dbName, setDbName] = useState("");
  const [multiAZ, setMultiAZ] = useState(false);
  const [publiclyAccessible, setPubliclyAccessible] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/rds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dbInstanceIdentifier,
          engine,
          dbInstanceClass,
          masterUsername,
          masterUserPassword,
          allocatedStorage,
          dbName: dbName || undefined,
          multiAZ,
          publiclyAccessible,
          storageEncrypted: false,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create database");
      }

      toast.success("RDS instance created successfully");
      queryClient.invalidateQueries({ queryKey: ["rds-instances"] });
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      toast.error(error.message || "Failed to create database");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setDbInstanceIdentifier("");
    setEngine("mysql");
    setDbInstanceClass("db.t3.micro");
    setMasterUsername("admin");
    setMasterUserPassword("");
    setAllocatedStorage(20);
    setDbName("");
    setMultiAZ(false);
    setPubliclyAccessible(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create RDS Instance</DialogTitle>
          <DialogDescription>
            Launch a new database instance
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dbInstanceIdentifier">DB Instance Identifier *</Label>
            <Input
              id="dbInstanceIdentifier"
              value={dbInstanceIdentifier}
              onChange={(e) => setDbInstanceIdentifier(e.target.value)}
              placeholder="my-database-1"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="engine">Engine</Label>
              <Select value={engine} onValueChange={setEngine} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select engine" />
                </SelectTrigger>
                <SelectContent>
                  {ENGINES.map((e) => (
                    <SelectItem key={e.value} value={e.value}>
                      {e.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dbInstanceClass">Instance Class</Label>
              <Select value={dbInstanceClass} onValueChange={setDbInstanceClass} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {INSTANCE_CLASSES.map((cls) => (
                    <SelectItem key={cls} value={cls}>
                      {cls}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="masterUsername">Master Username</Label>
              <Input
                id="masterUsername"
                value={masterUsername}
                onChange={(e) => setMasterUsername(e.target.value)}
                placeholder="admin"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="masterUserPassword">Master Password *</Label>
              <Input
                id="masterUserPassword"
                type="password"
                value={masterUserPassword}
                onChange={(e) => setMasterUserPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="allocatedStorage">Allocated Storage (GB)</Label>
              <Input
                id="allocatedStorage"
                type="number"
                value={allocatedStorage}
                onChange={(e) => setAllocatedStorage(parseInt(e.target.value))}
                min={20}
                max={65536}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dbName">Initial Database Name</Label>
              <Input
                id="dbName"
                value={dbName}
                onChange={(e) => setDbName(e.target.value)}
                placeholder="mydb"
              />
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="multiAZ">Multi-AZ Deployment</Label>
                <p className="text-sm text-muted-foreground">
                  Create standby instance in different AZ
                </p>
              </div>
              <Switch
                id="multiAZ"
                checked={multiAZ}
                onCheckedChange={setMultiAZ}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="publiclyAccessible">Publicly Accessible</Label>
                <p className="text-sm text-muted-foreground">
                  Assign public IP address
                </p>
              </div>
              <Switch
                id="publiclyAccessible"
                checked={publiclyAccessible}
                onCheckedChange={setPubliclyAccessible}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !dbInstanceIdentifier || !masterUserPassword}
            >
              {isSubmitting ? "Creating..." : "Create Database"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
