"use client";

import "xterm/css/xterm.css";

import { useEffect, useRef, useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useEC2Connect } from "@/hooks/use-ec2-connect";
import {
  Terminal as TerminalIcon,
  RefreshCw,
  X,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  FileText,
  PlugZap,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ExtendedInstance {
  instanceId: string;
  instanceType?: string;
  imageId?: string;
  state?: string;
  containerId?: string;
  name?: string;
}

interface InstanceTerminalProps {
  instance: ExtendedInstance | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function TerminalXterm({
  containerId,
  isActive,
}: {
  containerId: string;
  isActive: boolean;
}) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<any>(null);
  const fitAddonRef = useRef<any>(null);
  const commandBufferRef = useRef<string>("");
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isActive || !terminalRef.current || xtermRef.current) {
      return;
    }

    let mounted = true;
    const currentRef = terminalRef.current;

    const writePrompt = (term: any) => {
      term.write("\x1b[90mlocalstack\x1b[0m:\x1b[36m~\x1b[0m$ ");
    };

    const executeCommand = async (term: any, command: string) => {
      term.writeln(`\x1b[90mRunning: ${command}\x1b[0m`);

      try {
        const response = await fetch("/api/ec2/docker/exec-command", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ containerId, command }),
        });

        const result = await response.json();

        if (!result.success) {
          term.writeln(
            `\x1b[31m${result.error || result.stderr || "Command failed"}\x1b[0m`,
          );
          return;
        }

        if (result.stdout) {
          term.writeln(result.stdout);
        }
        if (result.stderr) {
          term.writeln(`\x1b[33m${result.stderr}\x1b[0m`);
        }
        if (!result.stdout && !result.stderr) {
          term.writeln("\x1b[90m(no output)\x1b[0m");
        }
      } catch (fetchError: any) {
        term.writeln(
          `\x1b[31mExecution error: ${fetchError?.message || "Unknown"}\x1b[0m`,
        );
      }
    };

    const initialize = async () => {
      try {
        const [{ Terminal }, { FitAddon }] = await Promise.all([
          import("xterm"),
          import("xterm-addon-fit"),
        ]);

        if (!mounted) {
          return;
        }

        const term = new Terminal({
          cursorBlink: true,
          fontSize: 13,
          fontFamily: 'Consolas, "Courier New", monospace',
          theme: {
            background: "#16191f",
            foreground: "#d5dbdb",
            cursor: "#f9f9f9",
            selectionBackground: "#2b4f80",
          },
          convertEol: true,
          scrollback: 3000,
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        term.open(currentRef);
        fitAddon.fit();

        xtermRef.current = term;
        fitAddonRef.current = fitAddon;

        term.writeln("\x1b[32mSession Manager channel ready\x1b[0m");
        term.writeln(`Container: ${containerId.slice(0, 12)}`);
        term.writeln("Use Enter to run commands. Ctrl+C cancels input.\r\n");
        writePrompt(term);

        term.onData(async (data: string) => {
          const code = data.charCodeAt(0);

          if (data === "\r" || data === "\n") {
            const command = commandBufferRef.current.trim();
            term.write("\r\n");

            if (command) {
              await executeCommand(term, command);
            }

            commandBufferRef.current = "";
            writePrompt(term);
            return;
          }

          if (code === 127 || code === 8) {
            if (commandBufferRef.current.length > 0) {
              commandBufferRef.current = commandBufferRef.current.slice(0, -1);
              term.write("\b \b");
            }
            return;
          }

          if (data === "\x03") {
            commandBufferRef.current = "";
            term.write("^C\r\n");
            writePrompt(term);
            return;
          }

          if (data === "\x0C") {
            term.clear();
            writePrompt(term);
            return;
          }

          if (code >= 32 && code < 127) {
            commandBufferRef.current += data;
            term.write(data);
          }
        });

        setIsReady(true);
        setTimeout(() => {
          fitAddon.fit();
          term.focus();
        }, 80);
      } catch (initError: any) {
        setError(initError?.message || "Failed to initialize terminal");
      }
    };

    initialize();

    return () => {
      mounted = false;
      xtermRef.current?.dispose();
      xtermRef.current = null;
      fitAddonRef.current = null;
      commandBufferRef.current = "";
      setIsReady(false);
      setError(null);
    };
  }, [containerId, isActive]);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const onResize = () => {
      setTimeout(() => fitAddonRef.current?.fit(), 120);
    };

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [isActive]);

  if (error) {
    return (
      <div className="flex h-full items-center justify-center bg-[#16191f]">
        <p className="text-sm text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div
        className="relative flex-1 overflow-hidden bg-[#16191f] p-2"
        onClick={() => xtermRef.current?.focus()}
      >
        <div ref={terminalRef} className="h-full w-full" />
      </div>
      <div className="flex items-center justify-between border-t bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        <span className={isReady ? "text-emerald-500" : "text-amber-500"}>
          {isReady ? "READY" : "INITIALIZING"}
        </span>
        <span>Enter to execute, Ctrl+C to cancel, Ctrl+L to clear</span>
      </div>
    </div>
  );
}

function getPackageManager(image?: string) {
  if (!image) {
    return null;
  }

  const lowered = image.toLowerCase();
  if (lowered.includes("alpine")) {
    return { name: "apk", install: "apk add", update: "apk update" };
  }
  if (lowered.includes("ubuntu") || lowered.includes("debian")) {
    return {
      name: "apt",
      install: "apt-get install -y",
      update: "apt-get update",
    };
  }
  if (
    lowered.includes("centos") ||
    lowered.includes("rhel") ||
    lowered.includes("fedora") ||
    lowered.includes("amazonlinux")
  ) {
    return { name: "yum", install: "yum install -y", update: "yum update -y" };
  }
  return null;
}

export function InstanceTerminal({
  instance,
  open,
  onOpenChange,
}: InstanceTerminalProps) {
  const { fetchLogs, logs, setLogs } = useEC2Connect();
  const [activeTab, setActiveTab] = useState("session");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copiedDocker, setCopiedDocker] = useState(false);
  const [copiedInstall, setCopiedInstall] = useState(false);
  const [autoRefreshLogs, setAutoRefreshLogs] = useState(false);

  const dockerCommand = instance?.containerId
    ? `docker exec -it ${instance.containerId} sh`
    : "";

  const packageManager = getPackageManager(instance?.imageId);
  const installExample = packageManager
    ? `${packageManager.update}\n${packageManager.install} curl`
    : "";

  useEffect(() => {
    if (open && instance?.containerId) {
      fetchLogs(instance.containerId, 120);
    }
  }, [fetchLogs, instance?.containerId, open]);

  useEffect(() => {
    if (!open || activeTab !== "logs" || !autoRefreshLogs || !instance?.containerId) {
      return;
    }

    const intervalId = window.setInterval(() => {
      fetchLogs(instance.containerId!, 120);
    }, 2500);

    return () => window.clearInterval(intervalId);
  }, [activeTab, autoRefreshLogs, fetchLogs, instance?.containerId, open]);

  const handleCopy = async (
    value: string,
    onCopied: (value: boolean) => void,
  ) => {
    if (!value) {
      return;
    }
    await navigator.clipboard.writeText(value);
    onCopied(true);
    window.setTimeout(() => onCopied(false), 1800);
  };

  const handleClose = () => {
    setLogs("");
    setActiveTab("session");
    onOpenChange(false);
  };

  if (!instance) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className={cn(
          "flex flex-col gap-0 overflow-hidden border-0 p-0 !max-w-none",
          isFullscreen
            ? "!h-[100vh] !w-[100vw] max-h-[100vh] rounded-none"
            : "!h-[90vh] !w-[95vw] max-h-[90vh]",
        )}
      >
        <DialogHeader className="border-b bg-muted/50 px-5 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-sky-500/30 bg-[#16191f]">
                <TerminalIcon className="h-5 w-5 text-sky-400" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold">
                  {instance.name || instance.instanceId}
                </DialogTitle>
                <DialogDescription className="mt-1 flex items-center gap-2 text-xs">
                  <Badge variant="outline" className="font-mono">
                    {instance.instanceId}
                  </Badge>
                  <Badge variant="secondary">{instance.state || "unknown"}</Badge>
                  <Badge variant="outline">
                    {instance.instanceType || "instance-type-n/a"}
                  </Badge>
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsFullscreen((current) => !current)}
                className="h-8 w-8"
              >
                {isFullscreen ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
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
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex h-full flex-col">
          <div className="border-b px-4 py-2">
            <TabsList>
              <TabsTrigger value="session">
                <TerminalIcon className="mr-2 h-4 w-4" />
                Session
              </TabsTrigger>
              <TabsTrigger value="connection">
                <PlugZap className="mr-2 h-4 w-4" />
                Connection
              </TabsTrigger>
              <TabsTrigger value="logs">
                <FileText className="mr-2 h-4 w-4" />
                Logs
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent
            value="session"
            className="m-0 flex min-h-0 flex-1 flex-col data-[state=active]:flex"
          >
            {instance.containerId ? (
              <TerminalXterm
                containerId={instance.containerId}
                isActive={activeTab === "session" && open}
              />
            ) : (
              <div className="flex flex-1 items-center justify-center bg-muted/30 text-sm text-muted-foreground">
                Container ID is not available for this instance.
              </div>
            )}
          </TabsContent>

          <TabsContent
            value="connection"
            className="m-0 flex min-h-0 flex-1 flex-col overflow-auto p-6"
          >
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Docker command</h3>
                <p className="text-sm text-muted-foreground">
                  Run this on your local terminal to access the same container:
                </p>
                <div className="relative">
                  <pre className="overflow-x-auto rounded-md bg-[#16191f] p-4 font-mono text-xs text-emerald-300">
                    {dockerCommand || "Container ID not available"}
                  </pre>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!dockerCommand}
                    className="absolute right-2 top-2 h-7 bg-black/30 hover:bg-black/40"
                    onClick={() => handleCopy(dockerCommand, setCopiedDocker)}
                  >
                    {copiedDocker ? (
                      <>
                        <Check className="mr-1 h-4 w-4 text-emerald-400" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="mr-1 h-4 w-4" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
              </section>

              {packageManager && (
                <section className="space-y-2">
                  <h3 className="text-sm font-semibold">
                    Package manager detected: {packageManager.name}
                  </h3>
                  <div className="relative">
                    <pre className="overflow-x-auto rounded-md bg-[#16191f] p-4 font-mono text-xs text-emerald-300">
                      {installExample}
                    </pre>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-2 h-7 bg-black/30 hover:bg-black/40"
                      onClick={() => handleCopy(installExample, setCopiedInstall)}
                    >
                      {copiedInstall ? (
                        <>
                          <Check className="mr-1 h-4 w-4 text-emerald-400" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="mr-1 h-4 w-4" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                </section>
              )}
            </div>
          </TabsContent>

          <TabsContent
            value="logs"
            className="m-0 flex min-h-0 flex-1 flex-col overflow-hidden p-4"
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold">Container logs</h3>
                <Badge variant="outline">tail 120</Badge>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Switch
                    checked={autoRefreshLogs}
                    onCheckedChange={setAutoRefreshLogs}
                  />
                  Auto refresh
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    instance.containerId && fetchLogs(instance.containerId, 120)
                  }
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1 rounded-md border bg-[#111217]">
              <div className="p-4 font-mono text-xs text-slate-300 whitespace-pre-wrap">
                {logs || "No logs available for this container yet."}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
