"use client";

import { useState } from "react";
import { Terminal, Copy, Check } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface CliCommand {
  label: string;
  command: string;
  description?: string;
}

interface CliCommandsPanelProps {
  title?: string;
  description?: string;
  commands: CliCommand[];
  endpoint?: string;
}

export function CliCommandsPanel({
  title = "Comandos AWS CLI",
  description = "Ejemplos de comandos para usar con AWS CLI y MiniStack/LocalStack",
  commands,
  endpoint = "http://localhost:4566",
}: CliCommandsPanelProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = async (command: string, index: number) => {
    await navigator.clipboard.writeText(command);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Terminal className="h-5 w-5" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Endpoint: <code>{endpoint}</code>
        </p>
        {commands.map((cmd, index) => (
          <div key={index} className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">{cmd.label}</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopy(cmd.command, index)}
                className="h-6 px-2"
              >
                {copiedIndex === index ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            {cmd.description && (
              <p className="text-xs text-muted-foreground">{cmd.description}</p>
            )}
            <pre className="overflow-auto rounded-md border bg-slate-950 p-3 text-xs text-slate-100">
              <code>{cmd.command}</code>
            </pre>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
