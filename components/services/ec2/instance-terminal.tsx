"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEC2Connect } from "@/hooks/use-ec2-connect";
import { Terminal, Logs, RefreshCw, X, Copy, Check } from "lucide-react";
import { EC2Instance } from "@/types";
import { cn } from "@/lib/utils";

interface ExtendedInstance extends EC2Instance {
  containerId?: string;
  name?: string;
}

interface InstanceTerminalProps {
  instance: ExtendedInstance | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InstanceTerminal({
  instance,
  open,
  onOpenChange,
}: InstanceTerminalProps) {
  const { fetchLogs, logs, setLogs } = useEC2Connect();
  const [copied, setCopied] = useState(false);

  // Generate docker exec command
  const dockerCommand = instance?.containerId
    ? `docker exec -it ${instance.containerId} sh`
    : "";

  // Detect package manager based on image
  const getPackageManager = (image?: string) => {
    if (!image) return null;
    const img = image.toLowerCase();
    if (img.includes("alpine")) return { name: "apk", install: "apk add", update: "apk update" };
    if (img.includes("ubuntu") || img.includes("debian")) return { name: "apt", install: "apt-get install -y", update: "apt-get update" };
    if (img.includes("centos") || img.includes("rhel") || img.includes("fedora") || img.includes("amazonlinux")) return { name: "yum", install: "yum install -y", update: "yum update" };
    if (img.includes("arch")) return { name: "pacman", install: "pacman -S", update: "pacman -Sy" };
    return null;
  };

  const packageManager = getPackageManager(instance?.image);
  const installExample = packageManager 
    ? `# Update packages\n${packageManager.update}\n\n# Install a package (example: curl)\n${packageManager.install} curl`
    : null;

  // Fetch logs when dialog opens
  useEffect(() => {
    if (open && instance?.containerId) {
      fetchLogs(instance.containerId, 100);
    }
  }, [open, instance, fetchLogs]);

  const handleCopyCommand = () => {
    if (dockerCommand) {
      navigator.clipboard.writeText(dockerCommand);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRefreshLogs = () => {
    if (instance?.containerId) {
      fetchLogs(instance.containerId, 100);
    }
  };

  const handleClose = () => {
    setLogs("");
    onOpenChange(false);
  };

  if (!instance) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden">
        <DialogHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-black border border-green-500/30">
              <Terminal className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">
                Connect to {instance.name || instance.instanceId}
              </DialogTitle>
              <DialogDescription className="text-xs font-mono">
                {instance.containerId?.slice(0, 12)} • {instance.instanceType} • {instance.state} • {instance.image}
              </DialogDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Docker Command Section */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Docker Connect Command</h3>
            <p className="text-sm text-muted-foreground">
              Copy and run this command in your terminal to connect to the container:
            </p>
            <div className="relative">
              <pre className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                {dockerCommand || "Container ID not available"}
              </pre>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyCommand}
                disabled={!dockerCommand}
                className="absolute top-2 right-2 h-8 bg-black/50 hover:bg-black/70"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-1 text-green-400" />
                    <span className="text-green-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-1" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Installation Commands Section */}
          {packageManager && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">
                Package Manager: <span className="text-green-600">{packageManager.name}</span>
              </h3>
              <p className="text-sm text-muted-foreground">
                Example commands to install packages in this container:
              </p>
              <div className="relative">
                <pre className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                  {installExample}
                </pre>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(installExample || "");
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="absolute top-2 right-2 h-8 bg-black/50 hover:bg-black/70"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 mr-1 text-green-400" />
                      <span className="text-green-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Container Logs Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Container Logs</h3>
              <Button variant="ghost" size="sm" onClick={handleRefreshLogs}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
            <ScrollArea className="h-48 bg-black rounded-lg border">
              <div className="p-4 font-mono text-sm text-gray-300 whitespace-pre-wrap">
                {logs || "No logs available. Start the container to see logs."}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
