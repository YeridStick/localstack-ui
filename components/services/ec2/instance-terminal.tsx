"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEC2Connect } from "@/hooks/use-ec2-connect";
import { Terminal as TerminalIcon, Logs, RefreshCw, X, Copy, Check, Maximize2, Minimize2 } from "lucide-react";
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

// Terminal component using individual command execution (no SSE, works on Windows)
function TerminalXterm({ containerId, isActive }: { containerId: string; isActive: boolean }) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<any>(null);
  const fitAddonRef = useRef<any>(null);
  const commandBufferRef = useRef<string>("");
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isActive || !terminalRef.current) return;
    if (xtermRef.current) return;

    const containerElement = terminalRef.current;
    let isMounted = true;

    const initTerminal = async () => {
      try {
        const [{ Terminal }, { FitAddon }] = await Promise.all([
          import("xterm"),
          import("xterm-addon-fit"),
        ]);
        await import("xterm/css/xterm.css");
        
        if (!isMounted) return;

        const term = new Terminal({
          cursorBlink: true,
          fontSize: 14,
          fontFamily: 'Consolas, "Courier New", monospace',
          theme: {
            background: "#0d1117",
            foreground: "#e6edf3",
            cursor: "#e6edf3",
            selectionBackground: "#238636",
          },
          convertEol: true,
          scrollback: 1000,
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        fitAddonRef.current = fitAddon;

        term.open(containerElement);
        xtermRef.current = term;

        // Welcome message and initial prompt
        term.writeln("\x1b[32m✓ Terminal ready\x1b[0m");
        term.writeln("Type commands and press Enter to execute.");
        term.writeln("Examples: ls, pwd, whoami, cat /etc/os-release\r\n");
        writePrompt(term);
        setIsReady(true);

        // Handle user input
        term.onData(async (data: string) => {
          const code = data.charCodeAt(0);
          
          // Enter key (13 or 10 depending on OS)
          if (data === "\r" || data === "\n") {
            const cmd = commandBufferRef.current.trim();
            term.write("\r\n");
            
            if (cmd) {
              await executeCommand(term, containerId, cmd);
            }
            
            commandBufferRef.current = "";
            writePrompt(term);
          }
          // Backspace (127 or 8)
          else if (code === 127 || code === 8) {
            if (commandBufferRef.current.length > 0) {
              commandBufferRef.current = commandBufferRef.current.slice(0, -1);
              term.write("\b \b");
            }
          }
          // Ctrl+C - cancel current command
          else if (data === "\x03") {
            commandBufferRef.current = "";
            term.write("^C\r\n");
            writePrompt(term);
          }
          // Ctrl+L - clear screen
          else if (data === "\x0C") {
            term.clear();
            writePrompt(term);
          }
          // Regular character
          else if (code >= 32 && code < 127) {
            commandBufferRef.current += data;
            term.write(data);
          }
        });

        setTimeout(() => {
          fitAddon.fit();
          term.focus();
        }, 100);

      } catch (err) {
        console.error("[Terminal] Init failed:", err);
        setError(err instanceof Error ? err.message : "Failed to initialize");
      }
    };

    const writePrompt = (term: any) => {
      term.write("\x1b[90m$\x1b[0m ");
    };

    const executeCommand = async (term: any, cid: string, cmd: string) => {
      term.writeln(`\x1b[90m[Executing: ${cmd}]\x1b[0m`);
      
      try {
        const response = await fetch("/api/ec2/docker/exec-command", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ containerId: cid, command: cmd }),
        });

        const result = await response.json();

        if (!result.success) {
          term.writeln(`\x1b[31mError: ${result.error || result.stderr || "Command failed"}\x1b[0m`);
        } else {
          if (result.stdout) {
            term.writeln(result.stdout);
          }
          if (result.stderr) {
            term.writeln(`\x1b[33m${result.stderr}\x1b[0m`);
          }
          if (!result.stdout && !result.stderr) {
            term.writeln("\x1b[90m(no output)\x1b[0m");
          }
        }
      } catch (err) {
        term.writeln(`\x1b[31mFailed to execute: ${err instanceof Error ? err.message : "Unknown error"}\x1b[0m`);
      }
    };

    initTerminal();

    return () => {
      isMounted = false;
      xtermRef.current?.dispose();
      xtermRef.current = null;
    };
  }, [isActive, containerId]);

  // Handle resize
  useEffect(() => {
    if (!isActive) return;
    const handleResize = () => {
      setTimeout(() => fitAddonRef.current?.fit(), 100);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isActive]);

  if (error) {
    return (
      <div className="flex-1 bg-[#0d1117] p-4 flex items-center justify-center">
        <div className="text-red-400 text-sm">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div 
        className="flex-1 bg-[#0d1117] p-2 overflow-hidden relative"
        style={{ minHeight: "300px" }}
        onClick={() => xtermRef.current?.focus()}
      >
        <div ref={terminalRef} className="h-full w-full" />
      </div>
      <div className="px-4 py-2 bg-muted/30 border-t text-xs text-muted-foreground shrink-0">
        <span className={isReady ? "text-green-400" : "text-yellow-400"}>
          {isReady ? "● Ready" : "● Initializing..."}
        </span>
        {" • Click terminal to focus • Enter to execute • Ctrl+C to cancel • Ctrl+L to clear"}
      </div>
    </div>
  );
}

export function InstanceTerminal({
  instance,
  open,
  onOpenChange,
}: InstanceTerminalProps) {
  const { fetchLogs, logs, setLogs } = useEC2Connect();
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("commands");
  const [isFullscreen, setIsFullscreen] = useState(false);

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

  const packageManager = getPackageManager(instance?.imageId);
  const installExample = packageManager 
    ? `# Update packages\n${packageManager.update}\n\n# Install a package (example: curl)\n${packageManager.install} curl`
    : null;

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
      <DialogContent 
        className={cn(
          "flex flex-col p-0 gap-0 overflow-hidden border-0 !max-w-none",
          isFullscreen 
            ? "!w-[100vw] !h-[100vh] max-h-[100vh] rounded-none" 
            : "!w-[98vw] !h-[90vh] max-h-[90vh]"
        )}
      >
        <DialogHeader className="px-6 py-4 border-b bg-muted/50 flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-black border border-green-500/30">
              <TerminalIcon className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">
                {instance.name || instance.instanceId}
              </DialogTitle>
              <DialogDescription className="text-xs font-mono">
                {instance.containerId?.slice(0, 12)} • {instance.instanceType} • {instance.state}
              </DialogDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="h-8 w-8"
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsContent value="commands" className="flex-1 flex flex-col m-0 p-6 data-[state=active]:flex overflow-auto">
            <div className="space-y-6 max-w-3xl mx-auto w-full">
              {/* Docker Command Section */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Docker Connect Command</h3>
                <p className="text-sm text-muted-foreground">
                  Run this in your local terminal:
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
                    Install packages in this container:
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
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
