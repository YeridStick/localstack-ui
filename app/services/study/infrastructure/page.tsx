"use client";

import { useState, useRef } from "react";
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
  Server,
  Database,
  Cloud,
  Network,
  Shield,
  Layers,
  Zap,
  Globe,
  Cpu,
  HardDrive,
  MessageSquare,
  Download,
  Copy,
  FileCode,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  X,
} from "lucide-react";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { analyzeInfrastructure, refineInfrastructure, estimateCost, type Requirements, type Diagram } from "@/lib/ai/infraDesignerService";
import { generateCodePipelineTemplate } from "@/lib/ai/pipelineService";

const WIZARD_STEPS = [
  { id: "basics", title: "Básico", description: "Tipo y descripción" },
  { id: "scale", title: "Escala", description: "Usuarios y tráfico" },
  { id: "tech", title: "Tecnología", description: "DB, caché, colas" },
  { id: "constraints", title: "Restricciones", description: "Presupuesto y requisitos" },
];

const APP_TYPES = [
  { id: "web", label: "Web Application", icon: Globe, description: "Frontend + Backend tradicional" },
  { id: "api", label: "API/Backend", icon: Server, description: "Servicios REST/GraphQL" },
  { id: "ecommerce", label: "E-commerce", icon: Zap, description: "Tienda online con pagos" },
  { id: "saas", label: "SaaS Multi-tenant", icon: Layers, description: "Software as a Service" },
  { id: "mobile", label: "Mobile Backend", icon: Zap, description: "Backend para apps móviles" },
  { id: "data", label: "Data/Analytics", icon: Database, description: "Procesamiento de datos" },
  { id: "streaming", label: "Streaming/Media", icon: Cloud, description: "Video/audio streaming" },
  { id: "iot", label: "IoT", icon: Cpu, description: "Internet of Things" },
];

const DEPLOYMENT_TYPES = [
  { id: "containers", label: "Containers (ECS/EKS)", description: "Docker/Kubernetes" },
  { id: "serverless", label: "Serverless", description: "Lambda + API Gateway" },
  { id: "vms", label: "Virtual Machines", description: "EC2 tradicional" },
  { id: "hybrid", label: "Híbrido", description: "Mix de tecnologías" },
];

const CONCURRENT_USERS = [
  { value: "10-100", label: "10-100", description: "PoC/Startup temprana" },
  { value: "100-1k", label: "100-1,000", description: "Startup en crecimiento" },
  { value: "1k-10k", label: "1K-10K", description: "Producto establecido" },
  { value: "10k-100k", label: "10K-100K", description: "Escala media" },
  { value: "100k+", label: "100K+", description: "Alta escala" },
];

const BUDGETS = [
  { value: "low", label: "< $50/mes", description: "Personal/side project" },
  { value: "medium", label: "$50-200/mes", description: "Startup bootstrapped" },
  { value: "standard", label: "$200-500/mes", description: "Startup con funding" },
  { value: "high", label: "$500-2K/mes", description: "Empresa pequeña" },
  { value: "enterprise", label: "$2K+/mes", description: "Empresa/Enterprise" },
];

const NODE_ICONS: Record<string, typeof Server> = {
  user: Globe,
  cdn: Cloud,
  dns: Globe,
  alb: Network,
  nlb: Network,
  api: Server,
  ec2: Server,
  asg: Layers,
  ecs: Layers,
  eks: Layers,
  fargate: Zap,
  lambda: Zap,
  rds: Database,
  dynamo: Database,
  elasticache: HardDrive,
  s3: HardDrive,
  sns: MessageSquare,
  sqs: MessageSquare,
  eventbridge: Zap,
  cognito: Shield,
  secrets: Shield,
  cloudwatch: Server,
  waf: Shield,
  default: Server,
};

const NODE_COLORS: Record<string, string> = {
  user: "#f2994a",
  cdn: "#e67e22",
  alb: "#3498db",
  nlb: "#2980b9",
  api: "#9b59b6",
  ec2: "#2ecc71",
  asg: "#27ae60",
  ecs: "#1abc9c",
  eks: "#16a085",
  fargate: "#f1c40f",
  lambda: "#f39c12",
  rds: "#e74c3c",
  dynamo: "#c0392b",
  elasticache: "#e67e22",
  s3: "#d35400",
  sns: "#8e44ad",
  sqs: "#9b59b6",
  cognito: "#34495e",
  secrets: "#2c3e50",
  default: "#95a5a6",
};

export default function InfrastructureDesignerPage() {
  const [step, setStep] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [diagram, setDiagram] = useState<Diagram | null>(null);
  const [view, setView] = useState<"wizard" | "analysis" | "diagram">("wizard");
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [refinementPrompt, setRefinementPrompt] = useState("");
  const [isRefining, setIsRefining] = useState(false);
  const [showCost, setShowCost] = useState(false);
  const [costEstimate, setCostEstimate] = useState<ReturnType<typeof estimateCost> | null>(null);
  const [showCloudFormation, setShowCloudFormation] = useState(false);
  const [cloudFormationTemplate, setCloudFormationTemplate] = useState<Record<string, unknown> | null>(null);
  const [cfFormat, setCfFormat] = useState<"yaml" | "json">("yaml");
  const svgRef = useRef<SVGSVGElement>(null);

  const [requirements, setRequirements] = useState<Requirements>({
    appType: "",
    description: "",
    concurrentUsers: "",
    trafficPeak: "",
    budget: "",
    region: "us-east-1",
    latency: "normal",
    compliance: "none",
    needsDatabase: false,
    databaseType: "postgresql",
    needsCache: false,
    needsQueue: false,
    deploymentType: "containers",
    opsTeam: "small",
  });

  const updateRequirement = (key: keyof Requirements, value: unknown) => {
    setRequirements((prev) => ({ ...prev, [key]: value }));
  };

  const handleNext = () => {
    if (step < WIZARD_STEPS.length - 1) {
      setStep(step + 1);
    } else {
      generateInfrastructure();
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const generateInfrastructure = async () => {
    setIsAnalyzing(true);
    setView("analysis");

    const result = await analyzeInfrastructure(requirements);

    if (result.success) {
      const finalDiagram = result.diagram || generateDefaultDiagram();
      setAnalysis(result.analysis);
      setDiagram(finalDiagram);
      setCostEstimate(estimateCost(finalDiagram.nodes));

      const cfTemplate = generateCodePipelineTemplate({
        projectName: requirements.appType || "myapp",
        repoType: "github",
        deploymentType: requirements.deploymentType === "serverless" ? "lambda" : "ecs",
        needsDocker: requirements.deploymentType === "containers",
      });
      setCloudFormationTemplate(cfTemplate as Record<string, unknown>);
    }

    setIsAnalyzing(false);
  };

  const generateDefaultDiagram = (): Diagram => {
    const nodes: Diagram["nodes"] = [
      { id: "users", type: "user", label: "Users", x: 50, y: 200, tier: "frontend" },
      { id: "cdn", type: "cdn", label: "CloudFront", x: 150, y: 200, tier: "frontend" },
    ];

    if (requirements.deploymentType === "serverless") {
      nodes.push(
        { id: "api", type: "api", label: "API Gateway", x: 250, y: 200, tier: "backend" },
        { id: "lambda", type: "lambda", label: "Lambda", x: 350, y: 200, tier: "backend" }
      );
    } else {
      nodes.push(
        { id: "alb", type: "alb", label: "ALB", x: 250, y: 200, tier: "backend" },
        { id: "app", type: requirements.deploymentType === "containers" ? "ecs" : "ec2", label: "App Servers", x: 350, y: 200, tier: "backend" }
      );
    }

    if (requirements.needsDatabase) {
      nodes.push({ id: "db", type: "rds", label: "Database", x: 450, y: 200, tier: "data" });
    }

    if (requirements.needsCache) {
      nodes.push({ id: "cache", type: "elasticache", label: "Cache", x: 450, y: 100, tier: "data" });
    }

    const connections: Diagram["connections"] = [];
    for (let i = 0; i < nodes.length - 1; i++) {
      connections.push({
        from: nodes[i].id,
        to: nodes[i + 1].id,
        label: "HTTPS",
        type: "https",
      });
    }

    return { nodes, connections };
  };

  const handleRefine = async () => {
    if (!refinementPrompt.trim() || !diagram) return;

    setIsRefining(true);
    const result = await refineInfrastructure(diagram, refinementPrompt);

    if (result.success && result.diagram) {
      setDiagram(result.diagram);
      setCostEstimate(estimateCost(result.diagram.nodes));
    }

    setIsRefining(false);
    setRefinementPrompt("");
  };

  const handleDeleteNode = (nodeId: string) => {
    if (!diagram) return;

    setDiagram((prev) =>
      prev
        ? {
            nodes: prev.nodes.filter((n) => n.id !== nodeId),
            connections: prev.connections.filter((c) => c.from !== nodeId && c.to !== nodeId),
          }
        : null
    );
    setSelectedNode(null);
  };

  const exportDiagram = () => {
    if (!diagram) return;
    const dataStr = JSON.stringify(diagram, null, 2);
    const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
    const exportFileDefaultName = `infrastructure-${requirements.appType}-${Date.now()}.json`;

    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", exportFileDefaultName);
    linkElement.click();
  };

  const copyTerraform = () => {
    if (!diagram) return;

    const terraform = diagram.nodes
      .map((node) => {
        switch (node.type) {
          case "ec2":
            return `# ${node.label}
resource "aws_instance" "${node.id}" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.medium"
  tags = { Name = "${node.label}" }
}`;
          case "rds":
            return `# ${node.label}
resource "aws_db_instance" "${node.id}" {
  identifier = "${node.id}"
  engine     = "postgres"
  instance_class = "db.t3.micro"
  allocated_storage = 20
}`;
          case "alb":
            return `# ${node.label}
resource "aws_lb" "${node.id}" {
  name               = "${node.id}"
  internal           = false
  load_balancer_type = "application"
}`;
          default:
            return `# ${node.type}: ${node.label}`;
        }
      })
      .join("\n\n");

    navigator.clipboard.writeText(terraform);
  };

  const renderWizardStep = () => {
    const currentStep = WIZARD_STEPS[step];

    switch (currentStep.id) {
      case "basics":
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold">¿Qué tipo de aplicación vas a construir?</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {APP_TYPES.map((type) => {
                const Icon = type.icon;
                const isSelected = requirements.appType === type.id;
                return (
                  <button
                    key={type.id}
                    onClick={() => updateRequirement("appType", type.id)}
                    className={cn(
                      "p-4 rounded-lg border text-left transition-all",
                      isSelected
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <Icon className={cn("h-6 w-6 mb-2", isSelected ? "text-primary" : "text-muted-foreground")} />
                    <div className="font-medium">{type.label}</div>
                    <div className="text-xs text-muted-foreground">{type.description}</div>
                  </button>
                );
              })}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Describe tu aplicación brevemente</label>
              <textarea
                value={requirements.description}
                onChange={(e) => updateRequirement("description", e.target.value)}
                placeholder="Ej: Una aplicación de e-commerce para venta de productos artesanales..."
                className="w-full min-h-[100px] p-3 rounded-md border bg-background"
              />
            </div>
          </div>
        );

      case "scale":
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold">¿Qué escala esperas?</h3>

            <div className="space-y-4">
              <label className="text-sm font-medium">Usuarios concurrentes</label>
              <div className="flex flex-wrap gap-3">
                {CONCURRENT_USERS.map((u) => {
                  const isSelected = requirements.concurrentUsers === u.value;
                  return (
                    <button
                      key={u.value}
                      onClick={() => updateRequirement("concurrentUsers", u.value)}
                      className={cn(
                        "px-4 py-3 rounded-lg border text-center transition-all",
                        isSelected
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <div className="font-semibold">{u.label}</div>
                      <div className="text-xs text-muted-foreground">{u.description}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-sm font-medium">Picos de tráfico</label>
              <div className="flex gap-3">
                {["Constante", "Diario", "Semanal", "Estacional"].map((peak) => {
                  const isSelected = requirements.trafficPeak === peak;
                  return (
                    <button
                      key={peak}
                      onClick={() => updateRequirement("trafficPeak", peak)}
                      className={cn(
                        "flex-1 py-3 rounded-lg border transition-all",
                        isSelected
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      {peak}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        );

      case "tech":
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold">Stack tecnológico</h3>

            <div className="space-y-4">
              <label className="text-sm font-medium">Tipo de despliegue</label>
              <div className="grid grid-cols-2 gap-4">
                {DEPLOYMENT_TYPES.map((d) => {
                  const isSelected = requirements.deploymentType === d.id;
                  return (
                    <button
                      key={d.id}
                      onClick={() => updateRequirement("deploymentType", d.id)}
                      className={cn(
                        "p-4 rounded-lg border text-left transition-all",
                        isSelected
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <div className="font-medium">{d.label}</div>
                      <div className="text-xs text-muted-foreground">{d.description}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <button
                onClick={() => updateRequirement("needsDatabase", !requirements.needsDatabase)}
                className={cn(
                  "p-4 rounded-lg border text-center transition-all",
                  requirements.needsDatabase
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                )}
              >
                <Database className="h-6 w-6 mx-auto mb-2" />
                <div className="font-medium">Base de datos</div>
                {requirements.needsDatabase && (
                  <select
                    value={requirements.databaseType}
                    onChange={(e) => updateRequirement("databaseType", e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-2 w-full text-xs p-1 rounded border"
                  >
                    <option value="postgresql">PostgreSQL</option>
                    <option value="mysql">MySQL</option>
                    <option value="mongodb">DocumentDB</option>
                    <option value="dynamodb">DynamoDB</option>
                  </select>
                )}
              </button>

              <button
                onClick={() => updateRequirement("needsCache", !requirements.needsCache)}
                className={cn(
                  "p-4 rounded-lg border text-center transition-all",
                  requirements.needsCache
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                )}
              >
                <HardDrive className="h-6 w-6 mx-auto mb-2" />
                <div className="font-medium">Caché</div>
                <div className="text-xs text-muted-foreground">ElastiCache</div>
              </button>

              <button
                onClick={() => updateRequirement("needsQueue", !requirements.needsQueue)}
                className={cn(
                  "p-4 rounded-lg border text-center transition-all",
                  requirements.needsQueue
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                )}
              >
                <MessageSquare className="h-6 w-6 mx-auto mb-2" />
                <div className="font-medium">Colas</div>
                <div className="text-xs text-muted-foreground">SQS/SNS</div>
              </button>
            </div>
          </div>
        );

      case "constraints":
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold">Restricciones y presupuesto</h3>

            <div className="space-y-4">
              <label className="text-sm font-medium">Presupuesto mensual estimado</label>
              <div className="flex flex-wrap gap-3">
                {BUDGETS.map((b) => {
                  const isSelected = requirements.budget === b.value;
                  return (
                    <button
                      key={b.value}
                      onClick={() => updateRequirement("budget", b.value)}
                      className={cn(
                        "px-4 py-3 rounded-lg border text-center transition-all",
                        isSelected
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <div className="font-semibold">{b.label}</div>
                      <div className="text-xs text-muted-foreground">{b.description}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Región AWS</label>
                <select
                  value={requirements.region}
                  onChange={(e) => updateRequirement("region", e.target.value)}
                  className="w-full p-2 rounded-md border bg-background"
                >
                  <option value="us-east-1">US East (N. Virginia)</option>
                  <option value="us-west-2">US West (Oregon)</option>
                  <option value="eu-west-1">EU (Ireland)</option>
                  <option value="eu-central-1">EU (Frankfurt)</option>
                  <option value="ap-south-1">Asia Pacific (Mumbai)</option>
                  <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
                  <option value="sa-east-1">South America (São Paulo)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Requisitos de latencia</label>
                <select
                  value={requirements.latency}
                  onChange={(e) => updateRequirement("latency", e.target.value)}
                  className="w-full p-2 rounded-md border bg-background"
                >
                  <option value="normal">Normal (&lt; 500ms)</option>
                  <option value="low">Baja (&lt; 200ms)</option>
                  <option value="critical">Crítica (&lt; 50ms)</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Cumplimiento requerido</label>
              <select
                value={requirements.compliance}
                onChange={(e) => updateRequirement("compliance", e.target.value)}
                className="w-full p-2 rounded-md border bg-background"
              >
                <option value="none">Ninguno específico</option>
                <option value="hipaa">HIPAA (Salud)</option>
                <option value="pci">PCI DSS (Pagos)</option>
                <option value="soc2">SOC 2</option>
                <option value="gdpr">GDPR (UE)</option>
              </select>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-bold">
              <Sparkles className="h-7 w-7 text-primary" />
              Infrastructure Designer AI
            </h1>
            <p className="mt-1 text-muted-foreground">
              Diseña arquitecturas AWS óptimas con asistencia de IA local (Ollama).
            </p>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="px-3 py-1">
              Modelo: gemma4:e4b
            </Badge>
          </div>
        </div>

        <Alert>
          <Sparkles className="h-4 w-4" />
          <AlertDescription>
            Usa esta herramienta para diseñar infraestructura AWS: genera diagramas, estima costos y obtén templates CloudFormation.
          </AlertDescription>
        </Alert>

        {view === "wizard" && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 mb-4">
                {WIZARD_STEPS.map((s, idx) => (
                  <div
                    key={s.id}
                    onClick={() => idx <= step && setStep(idx)}
                    className={cn(
                      "flex-1 p-3 rounded-lg border cursor-pointer transition-all",
                      idx === step
                        ? "border-primary bg-primary/10"
                        : idx < step
                        ? "border-green-500 bg-green-500/10"
                        : "border-border opacity-50"
                    )}
                  >
                    <div className="text-xs font-medium">
                      {idx < step ? "✓" : idx + 1}. {s.title}
                    </div>
                    <div className="text-xs text-muted-foreground">{s.description}</div>
                  </div>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              {renderWizardStep()}

              <div className="flex justify-between mt-8 pt-4 border-t">
                <Button variant="outline" onClick={handleBack} disabled={step === 0}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Anterior
                </Button>
                <Button onClick={handleNext}>
                  {step === WIZARD_STEPS.length - 1 ? (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generar Infraestructura
                    </>
                  ) : (
                    <>
                      Siguiente
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {view === "analysis" && (
          <Card>
            <CardHeader>
              <CardTitle>Análisis de Infraestructura</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {isAnalyzing ? (
                <div className="text-center py-12">
                  <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
                  <h3 className="text-lg font-medium">La IA está analizando tus requerimientos...</h3>
                  <p className="text-muted-foreground">Esto puede tomar 10-30 segundos</p>
                </div>
              ) : (
                <>
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                      <Check className="h-8 w-8 text-green-500" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">¡Análisis completo!</h3>
                    <p className="text-muted-foreground">Tu infraestructura recomendada está lista</p>
                  </div>

                  {costEstimate && (
                    <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
                      <div className="flex justify-between items-center mb-4">
                        <div>
                          <div className="text-sm text-muted-foreground">Estimación mensual</div>
                          <div className="text-3xl font-bold text-primary">
                            ${costEstimate.range.min} - ${costEstimate.range.max}
                          </div>
                        </div>
                        <Button onClick={() => setView("diagram")}>
                          <Network className="mr-2 h-4 w-4" />
                          Ver Diagrama
                        </Button>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowCost(!showCost)}
                      >
                        {showCost ? <ChevronUp className="mr-2 h-4 w-4" /> : <ChevronDown className="mr-2 h-4 w-4" />}
                        {showCost ? "Ocultar" : "Ver"} desglose
                      </Button>

                      {showCost && (
                        <div className="mt-4 space-y-2 pt-4 border-t border-primary/20">
                          {costEstimate.breakdown.map((item, i) => (
                            <div key={i} className="flex justify-between text-sm">
                              <span>{item.service}</span>
                              <span className="font-medium">${item.cost}/mes</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {analysis && (
                    <div className="p-4 rounded-lg bg-muted">
                      <h4 className="font-medium mb-2">Análisis de la IA</h4>
                      <pre className="text-sm whitespace-pre-wrap">{analysis}</pre>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
