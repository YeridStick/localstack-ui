"use client";

import { useEffect, useRef, useState } from "react";
import { Terminal as XTerm } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";
import { Button } from "@/components/ui/button";
import { Maximize2, Minimize2, X } from "lucide-react";

interface TerminalXtermProps {
  containerId: string;
  onClose: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

export function TerminalXterm({ containerId, onClose, isFullscreen, onToggleFullscreen }: TerminalXtermProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const sessionIdRef = useRef<string>("");
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!terminalRef.current || !containerId) return;

    // Create terminal
    const term = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Consolas, "Courier New", monospace',
      theme: {
        background: "#0d1117",
        foreground: "#e6edf3",
        cursor: "#e6edf3",
        selectionBackground: "#238636",
        black: "#010409",
        red: "#ff7b72",
        green: "#7ee787",
        yellow: "#ffa657",
        blue: "#79c0ff",
        magenta: "#d2a8ff",
        cyan: "#56d4dd",
        white: "#e6edf3",
        brightBlack: "#6e7681",
        brightRed: "#ff7b72",
        brightGreen: "#7ee787",
        brightYellow: "#ffa657",
        brightBlue: "#79c0ff",
        brightMagenta: "#d2a8ff",
        brightCyan: "#56d4dd",
        brightWhite: "#ffffff",
      },
      convertEol: true,
      scrollback: 1000,
      rows: 30,
    });

    // Add fit addon
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    fitAddonRef.current = fitAddon;

    // Open terminal
    term.open(terminalRef.current);
    xtermRef.current = term;

    // Connect using Server-Sent Events
    const eventSource = new EventSource(`/api/terminal?containerId=${containerId}`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
    };

    eventSource.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      if (message.type === "connected") {
        sessionIdRef.current = message.sessionId;
        term.writeln("\r\n\x1b[32m✓ Connected to container\x1b[0m");
        term.writeln("\x1b[90mContainer ID: " + containerId.slice(0, 12) + "\x1b[0m");
        term.writeln("\x1b[90mType commands below...\x1b[0m\r\n");
        fitAddon.fit();
      } else if (message.type === "output") {
        term.write(message.data);
      }
    };

    eventSource.onerror = () => {
      setError("Connection failed");
      setIsConnected(false);
      term.writeln("\r\n\x1b[31m✗ Connection error\x1b[0m");
    };

    // Handle terminal input
    term.onData(async (data) => {
      if (!sessionIdRef.current) return;
      
      try {
        await fetch("/api/terminal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: sessionIdRef.current, input: data }),
        });
      } catch (err) {
        term.writeln("\r\n\x1b[31mFailed to send input\x1b[0m");
      }
    });

    // Initial fit
    setTimeout(() => fitAddon.fit(), 100);

    return () => {
      eventSource.close();
      term.dispose();
    };
  }, [containerId]);

  // Handle resize
  useEffect(() => {
    if (fitAddonRef.current) {
      setTimeout(() => {
        fitAddonRef.current?.fit();
        xtermRef.current?.focus();
      }, 100);
    }
  }, [isFullscreen]);

  return (
    <div className="flex flex-col h-full bg-[#0d1117] rounded-lg overflow-hidden">
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-[#30363d]">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`} />
          <span className="text-sm text-gray-300 font-mono">
            {isConnected ? "Connected" : "Disconnected"}
          </span>
          <span className="text-xs text-gray-500 font-mono">
            {containerId.slice(0, 12)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleFullscreen}
            className="h-8 w-8 text-gray-400 hover:text-white hover:bg-[#30363d]"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 text-gray-400 hover:text-white hover:bg-[#30363d]"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Terminal Area */}
      <div className="flex-1 p-2 overflow-hidden">
        {error ? (
          <div className="h-full flex items-center justify-center text-red-400">
            {error}
          </div>
        ) : (
          <div 
            ref={terminalRef} 
            className="h-full w-full"
            style={{ backgroundColor: "#0d1117" }}
          />
        )}
      </div>
    </div>
  );
}
