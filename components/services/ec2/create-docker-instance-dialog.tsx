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
import { useCreateDockerInstance } from "@/hooks/use-ec2-docker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

interface CreateDockerInstanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DOCKER_IMAGES = [
  { value: "ubuntu:22.04", label: "Ubuntu 22.04 LTS", os: "linux" },
  { value: "ubuntu:20.04", label: "Ubuntu 20.04 LTS", os: "linux" },
  { value: "alpine:latest", label: "Alpine Linux (lightweight)", os: "linux" },
  { value: "debian:bookworm", label: "Debian 12 (Bookworm)", os: "linux" },
  { value: "centos:stream9", label: "CentOS Stream 9", os: "linux" },
  { value: "nginx:latest", label: "Nginx Web Server", os: "linux" },
  { value: "httpd:latest", label: "Apache HTTP Server", os: "linux" },
  { value: "redis:latest", label: "Redis Server", os: "linux" },
  { value: "mysql:8.0", label: "MySQL 8.0", os: "linux" },
  { value: "postgres:15", label: "PostgreSQL 15", os: "linux" },
  { value: "node:18", label: "Node.js 18", os: "linux" },
  { value: "python:3.11", label: "Python 3.11", os: "linux" },
  { value: "openjdk:17", label: "OpenJDK 17", os: "linux" },
];

const INSTANCE_TYPES = [
  { value: "t2.nano", label: "t2.nano (1 vCPU, 0.5GB)", cpu: "1", memory: "0.5g" },
  { value: "t2.micro", label: "t2.micro (1 vCPU, 1GB)", cpu: "1", memory: "1g" },
  { value: "t2.small", label: "t2.small (1 vCPU, 2GB)", cpu: "1", memory: "2g" },
  { value: "t2.medium", label: "t2.medium (2 vCPU, 4GB)", cpu: "2", memory: "4g" },
  { value: "t2.large", label: "t2.large (2 vCPU, 8GB)", cpu: "2", memory: "8g" },
];

export function CreateDockerInstanceDialog({
  open,
  onOpenChange,
}: CreateDockerInstanceDialogProps) {
  const createInstance = useCreateDockerInstance();
  const [activeTab, setActiveTab] = useState("basic");
  
  // Basic settings
  const [image, setImage] = useState("ubuntu:22.04");
  const [instanceType, setInstanceType] = useState("t2.micro");
  const [name, setName] = useState("");
  const [volumeSize, setVolumeSize] = useState(8);
  
  // Advanced settings
  const [ports, setPorts] = useState("");
  const [envVars, setEnvVars] = useState("");
  const [autoStart, setAutoStart] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const portList = ports
      .split("\n")
      .map((p) => p.trim())
      .filter((p) => p);

    const envList = envVars
      .split("\n")
      .map((e) => e.trim())
      .filter((e) => e);

    await createInstance.mutateAsync({
      image,
      instanceType,
      name: name || undefined,
      ports: portList,
      env: envList,
      volumeSize,
    });

    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setImage("ubuntu:22.04");
    setInstanceType("t2.micro");
    setName("");
    setVolumeSize(8);
    setPorts("");
    setEnvVars("");
    setAutoStart(true);
    setActiveTab("basic");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create EC2 Instance (Docker Container)</DialogTitle>
          <DialogDescription>
            Launch a real Docker container as an EC2 instance. Each instance runs as an isolated container.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic">Basic Settings</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="image">Operating System / Image *</Label>
                <Select value={image} onValueChange={setImage} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Docker image" />
                  </SelectTrigger>
                  <SelectContent className="max-h-80">
                    {DOCKER_IMAGES.map((img) => (
                      <SelectItem key={img.value} value={img.value}>
                        {img.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Docker image to use as the EC2 instance AMI
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="instanceType">Instance Type *</Label>
                <Select value={instanceType} onValueChange={setInstanceType} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select instance type" />
                  </SelectTrigger>
                  <SelectContent>
                    {INSTANCE_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Instance Name (optional)</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="my-web-server"
                />
                <p className="text-xs text-muted-foreground">
                  If not specified, a name will be generated automatically
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="volumeSize">Root Volume Size (GB) *</Label>
                <Input
                  id="volumeSize"
                  type="number"
                  min={1}
                  max={1000}
                  value={volumeSize}
                  onChange={(e) => setVolumeSize(parseInt(e.target.value) || 8)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Creates a named Docker volume mounted at /data
                </p>
              </div>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="ports">Port Mappings (one per line)</Label>
                <Textarea
                  id="ports"
                  value={ports}
                  onChange={(e) => setPorts(e.target.value)}
                  placeholder={`8080:80
443:443
3000:3000`}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  Format: hostPort:containerPort (e.g., 8080:80)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="env">Environment Variables (one per line)</Label>
                <Textarea
                  id="env"
                  value={envVars}
                  onChange={(e) => setEnvVars(e.target.value)}
                  placeholder={`NODE_ENV=production
DB_HOST=localhost
API_KEY=secret`}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  Format: KEY=value
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="autoStart">Auto-start Container</Label>
                  <p className="text-xs text-muted-foreground">
                    Start the container immediately after creation
                  </p>
                </div>
                <Switch
                  id="autoStart"
                  checked={autoStart}
                  onCheckedChange={setAutoStart}
                />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createInstance.isPending || !image}>
              {createInstance.isPending ? "Creating..." : "Launch Instance"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
