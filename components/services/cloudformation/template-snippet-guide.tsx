"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ExternalLink, Copy, FileCode2, BookOpen } from "lucide-react";
import {
  CLOUDFORMATION_TEMPLATE_SNIPPETS,
  CloudFormationTemplateSnippet,
} from "@/lib/cloudformation/template-snippets";

export function TemplateSnippetGuide() {
  const [selectedId, setSelectedId] = useState(
    CLOUDFORMATION_TEMPLATE_SNIPPETS[0]?.id || "",
  );

  const selectedSnippet = useMemo<CloudFormationTemplateSnippet | null>(() => {
    return (
      CLOUDFORMATION_TEMPLATE_SNIPPETS.find((item) => item.id === selectedId) ||
      CLOUDFORMATION_TEMPLATE_SNIPPETS[0] ||
      null
    );
  }, [selectedId]);

  const copySnippet = async () => {
    if (!selectedSnippet) return;

    try {
      await navigator.clipboard.writeText(selectedSnippet.template);
      toast.success("Snippet copiado al portapapeles.");
    } catch {
      toast.error("No se pudo copiar el snippet.");
    }
  };

  if (!selectedSnippet) {
    return null;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Documentacion oficial + snippets CloudFormation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p className="text-muted-foreground">
            Esta guia te permite estudiar construccion de plantillas usando
            referencias oficiales de AWS, con ejemplos listos para adaptar.
          </p>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {CLOUDFORMATION_TEMPLATE_SNIPPETS.map((snippet) => (
              <button
                key={snippet.id}
                type="button"
                onClick={() => setSelectedId(snippet.id)}
                className={`rounded-md border px-3 py-2 text-left transition-colors ${
                  selectedId === snippet.id
                    ? "border-primary bg-primary/10"
                    : "hover:bg-muted/40"
                }`}
              >
                <p className="font-medium">{snippet.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {snippet.resourceType} - {snippet.level}
                </p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCode2 className="h-5 w-5" />
            {selectedSnippet.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{selectedSnippet.level}</Badge>
            <Badge variant="secondary">{selectedSnippet.resourceType}</Badge>
            <a
              href={selectedSnippet.officialDocs.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              {selectedSnippet.officialDocs.title}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>

          <p className="text-sm text-muted-foreground">
            {selectedSnippet.description}
          </p>

          <div className="rounded-md border bg-muted/30 p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">
                Snippet de referencia
              </p>
              <Button size="sm" variant="outline" onClick={copySnippet}>
                <Copy className="mr-2 h-3.5 w-3.5" />
                Copiar
              </Button>
            </div>
            <pre className="max-h-[420px] overflow-auto text-xs leading-relaxed">
              <code>{selectedSnippet.template}</code>
            </pre>
          </div>

          <Separator />

          <div className="space-y-2">
            <p className="text-sm font-medium">Puntos clave para estudiar</p>
            {selectedSnippet.keyPoints.map((point) => (
              <div key={point} className="rounded-md border p-2 text-sm">
                {point}
              </div>
            ))}
          </div>

          {selectedSnippet.relatedDocs.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Lecturas oficiales relacionadas</p>
              {selectedSnippet.relatedDocs.map((doc) => (
                <a
                  key={doc.url}
                  href={doc.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between rounded-md border p-3 text-sm hover:bg-muted/40"
                >
                  <span>{doc.title}</span>
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </a>
              ))}
            </div>
          )}

          <div className="rounded-md border p-3 text-xs text-muted-foreground">
            Valida cada plantilla en AWS real con{" "}
            <code>aws cloudformation validate-template</code> y usa cambios por
            etapas para reducir riesgos.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

