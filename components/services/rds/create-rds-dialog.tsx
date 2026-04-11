"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateRDSInstance } from "@/hooks/use-rds";
import { useVPCs } from "@/hooks/use-vpc";
import { Plus, Database } from "lucide-react";

const engines = [
  { value: "postgresql", label: "PostgreSQL", version: "15" },
  { value: "mysql", label: "MySQL", version: "8.0" },
  { value: "mariadb", label: "MariaDB", version: "10.11" },
];

export function CreateRDSDialog() {
  const [open, setOpen] = useState(false);
  const [engine, setEngine] = useState("postgresql");
  const [dbName, setDbName] = useState("mydb");
  const [masterUsername, setMasterUsername] = useState("admin");
  const [masterUserPassword, setMasterUserPassword] = useState("");
  const [vpcId, setVpcId] = useState("");
  const [allocatedStorage, setAllocatedStorage] = useState("20");

  const createRDS = useCreateRDSInstance();
  const { data: vpcs } = useVPCs();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createRDS.mutateAsync({
      engine: engine as any,
      dbName,
      masterUsername,
      masterUserPassword,
      vpcId,
      allocatedStorage: parseInt(allocatedStorage),
    });
    setOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setEngine("postgresql");
    setDbName("mydb");
    setMasterUsername("admin");
    setMasterUserPassword("");
    setVpcId("");
    setAllocatedStorage("20");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create RDS
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Create Database Instance
          </DialogTitle>
          <DialogDescription>
            Create a new RDS instance in a VPC. The database will be isolated
            within the selected VPC network.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="engine">Engine</Label>
              <Select value={engine} onValueChange={setEngine}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {engines.map((e) => (
                    <SelectItem key={e.value} value={e.value}>
                      {e.label} {e.version}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="vpc">VPC Network</Label>
              <Select value={vpcId} onValueChange={setVpcId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select VPC" />
                </SelectTrigger>
                <SelectContent>
                  {vpcs?.map((vpc) => (
                    <SelectItem key={vpc.id} value={vpc.id}>
                      {vpc.name} ({vpc.cidrBlock})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="dbname">Database Name</Label>
              <Input
                id="dbname"
                value={dbName}
                onChange={(e) => setDbName(e.target.value)}
                placeholder="mydatabase"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="username">Master Username</Label>
                <Input
                  id="username"
                  value={masterUsername}
                  onChange={(e) => setMasterUsername(e.target.value)}
                  placeholder="admin"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Master Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={masterUserPassword}
                  onChange={(e) => setMasterUserPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="storage">Allocated Storage (GB)</Label>
              <Input
                id="storage"
                type="number"
                min="20"
                max="1000"
                value={allocatedStorage}
                onChange={(e) => setAllocatedStorage(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="submit"
              disabled={createRDS.isPending || !vpcId || !masterUserPassword}
            >
              {createRDS.isPending ? "Creating..." : "Create Database"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
