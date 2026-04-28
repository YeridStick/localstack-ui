"use client";

import { useState } from "react";
import {
  GitBranch,
  Check,
  Loader2,
  Copy,
  Download,
  Cloud,
  Github,
  Gitlab,
  ChevronRight,
  ChevronDown,
  RotateCcw,
  FileCode,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { generateCodePipelineTemplate, generateGitHubActionsWorkflow, type PipelineConfig, type PipelineResult, PIPELINE_TEMPLATES } from "@/lib/ai/pipelineService";

const REPO_TYPES = [
  { id: "github", label: "GitHub", icon: Github, description: "GitHub Actions + Webhooks" },
  { id: "gitlab", label: "GitLab", icon: Gitlab, description: "GitLab CI/CD nativo" },
  { id: "codecommit", label: "AWS CodeCommit", icon: Cloud, description: "CodePipeline nativo" },
  { id: "bitbucket", label: "Bitbucket", icon: GitBranch, description: "Bitbucket Pipelines" },
];

const TECH_STACKS = [
  { id: "nodejs", label: "Node.js", description: "npm, jest, esbuild" },
  { id: "python", label: "Python", description: "pip, pytest, docker" },
  { id: "java-maven", label: "Java / Maven", description: "maven, junit, jib" },
  { id: "java-gradle", label: "Java / Gradle", description: "gradle, junit, jib" },
  { id: "dotnet", label: ".NET Core", description: "nuget, xunit, dotnet cli" },
  { id: "go", label: "Go", description: "go modules, testing, ko" },
  { id: "docker", label: "Docker Multi-stage", description: "Container-first approach" },
];

const DEPLOYMENT_STRATEGIES = [
  { id: "rolling", label: "Rolling Update", description: "Reemplazo gradual de instancias" },
  { id: "bluegreen", label: "Blue/Green", description: "Despliegue paralelo con switch" },
  { id: "canary", label: "Canary", description: "Tráfico gradual al nuevo deploy" },
  { id: "recreate", label: "Recreate", description: "Detener y recrear (downtime)" },
];

const TOOLS = {
  build: [
    { id: "codebuild", label: "AWS CodeBuild", provider: "aws" },
    { id: "github_actions", label: "GitHub Actions", provider: "github" },
    { id: "gitlab_ci", label: "GitLab CI", provider: "gitlab" },
    { id: "jenkins", label: "Jenkins", provider: "selfhosted" },
  ],
  deploy: [
    { id: "codedeploy", label: "AWS CodeDeploy", provider: "aws" },
    { id: "ecs_deploy", label: "ECS Rolling Update", provider: "aws" },
    { id: "lambda_deploy", label: "Lambda Update", provider: "aws" },
    { id: "argocd", label: "ArgoCD (GitOps)", provider: "kubernetes" },
  ],
  security: [
    { id: "codeguru", label: "CodeGuru Reviewer", provider: "aws" },
    { id: "secrets_manager", label: "Secrets Manager", provider: "aws" },
    { id: "snyk", label: "Snyk", provider: "thirdparty" },
    { id: "semgrep", label: "Semgrep", provider: "opensource" },
  ],
};

const ENVIRONMENTS = [
  { id: "dev", label: "Development", autoDeploy: true },
  { id: "staging", label: "Staging", autoDeploy: true },
  { id: "prod", label: "Production", autoDeploy: false, needsApproval: true },
];

export default function PipelineDesignerPage() {
  const [step, setStep] = useState(0);
  const [isDesigning, setIsDesigning] = useState(false);
  const [pipelineConfig, setPipelineConfig] = useState<PipelineResult | null>(null);
  const [activeTab, setActiveTab] = useState<"visual" | "yaml">("visual");
  const [expandedStage, setExpandedStage] = useState<string | null>(null);

  const [config, setConfig] = useState<PipelineConfig>({
    projectName: "my-app",
    repoType: "github",
    techStack: "java-gradle",
    deploymentStrategy: "rolling",
    environments: ["dev", "staging", "prod"],
    needsApprovals: true,
    needsFeatureFlags: false,
    selectedTools: {
      build: "github_actions",
      deploy: "ecs_deploy",
      security: "semgrep",
    },
    runTests: true,
    runSecurityScan: true,
    useECR: true,
    ecrRepository: "my-app-repo",
    jarPath: "build/libs/*.jar",
    dockerfilePath: "Dockerfile",
    envVariables: { "SPRING_PROFILES_ACTIVE": "production" },
    additionalBuildArgs: ["--no-daemon"],
    notifyOnFailure: true,
    enableRollback: true,
  });

  const updateConfig = (key: keyof PipelineConfig, value: unknown) => {
    setConfig((prev) => {
      const newConfig = { ...prev, [key]: value };

      // Auto-actualizar valores por defecto cuando cambia el tech stack
      if (key === "techStack") {
        const template = PIPELINE_TEMPLATES[value as string] || PIPELINE_TEMPLATES.java;
        if (template) {
          newConfig.jarPath = template.jarPath || "";
          newConfig.dockerfilePath = template.dockerfilePath || "Dockerfile";
          newConfig.additionalBuildArgs = template.defaultBuildArgs || [];
          newConfig.needsDocker = template.needsDocker || false;
        }
      }

      // Auto-actualizar ecrRepository cuando cambia projectName
      if (key === "projectName" && !newConfig.ecrRepository?.trim()) {
        newConfig.ecrRepository = `${value}-repo`;
      }

      return newConfig;
    });
  };

  const updateTool = (category: "build" | "deploy" | "security", toolId: string) => {
    setConfig((prev) => ({
      ...prev,
      selectedTools: { ...prev.selectedTools, [category]: toolId },
    }));
  };

  const generatePipeline = async () => {
    setIsDesigning(true);

    try {
      // Call API endpoint instead of direct function (to run on server with env vars)
      const response = await fetch('/api/ai/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          infrastructure: { nodes: [], connections: [] },
          projectConfig: config,
          model: 'gemma4:e4b'
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to generate pipeline');
      }

      const parsed = parsePipelineAnalysis(result.analysis || "", config);
      setPipelineConfig(parsed);
      setStep(3);
    } catch (error) {
      console.error('Pipeline generation error:', error);
      alert('Error: ' + (error as Error).message);
    } finally {
      setIsDesigning(false);
    }
  };

  const parsePipelineAnalysis = (analysis: string, userConfig: PipelineConfig): PipelineResult => {
    const stages: PipelineResult["stages"] = [];
    const lines = analysis.split("\n");
    let currentStage: PipelineResult["stages"][0] | null = null;

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (trimmed.match(/^\d+\./) || trimmed.startsWith("Stage")) {
        if (currentStage) stages.push(currentStage);
        currentStage = {
          name: trimmed.replace(/^\d+\.\s*/, "").replace(/:$/, ""),
          steps: [],
          tools: [],
        };
      } else if (currentStage && trimmed.startsWith("-")) {
        currentStage.steps.push(trimmed.replace(/^-\s*/, ""));
      }
    });

    if (currentStage) stages.push(currentStage);

    let template: string | object | null = null;
    if (userConfig.selectedTools.build === "github_actions") {
      template = generateGitHubActionsWorkflow({
        projectName: userConfig.projectName,
        deploymentType: "ecs",
        needsDocker: true,
        region: "us-east-1",
        ecrRepository: `${userConfig.projectName}-repo`,
      });
    } else if (userConfig.selectedTools.build === "codebuild") {
      template = generateCodePipelineTemplate({
        projectName: userConfig.projectName,
        repoType: userConfig.repoType,
        deploymentType: "ecs",
        needsDocker: true,
      });
    }

    return {
      stages: stages.length > 0 ? stages : generateDefaultStages(userConfig),
      analysis: analysis,
      template: template,
      config: userConfig,
    };
  };

  const getBuildCommands = (techStack: string): { install: string; lint: string; test: string; build: string } => {
    if (techStack === "java-gradle") {
      return {
        install: "./gradlew dependencies",
        lint: "./gradlew checkstyleMain checkstyleTest",
        test: "./gradlew test",
        build: "./gradlew build -x test",
      };
    }
    if (techStack === "java-maven" || techStack === "java") {
      return {
        install: "mvn dependency:resolve",
        lint: "mvn checkstyle:check",
        test: "mvn test",
        build: "mvn package -DskipTests",
      };
    }
    if (techStack === "nodejs") {
      return {
        install: "npm ci",
        lint: "npm run lint",
        test: "npm test",
        build: "npm run build",
      };
    }
    if (techStack === "python") {
      return {
        install: "pip install -r requirements.txt",
        lint: "flake8",
        test: "pytest",
        build: "docker build -t app .",
      };
    }
    return {
      install: "Install dependencies",
      lint: "Run linting",
      test: "Run tests",
      build: "Build application",
    };
  };

  const generateDefaultStages = (cfg: PipelineConfig): PipelineResult["stages"] => {
    const buildCmds = getBuildCommands(cfg.techStack);

    return [
      {
        name: "Source",
        steps: [`Checkout from ${cfg.repoType}`, "Validate branch protection rules", "Scan for secrets (truffleHog)"],
        tools: [cfg.repoType, "trufflehog"],
      },
      {
        name: "Build",
        steps: [
          buildCmds.install,
          buildCmds.lint,
          buildCmds.build,
          ...(cfg.runTests ? [buildCmds.test] : []),
          "Build Docker image",
          "Push to ECR registry",
        ],
        tools: [cfg.selectedTools.build, "docker", cfg.techStack.includes("gradle") ? "gradle" : "maven"],
      },
    {
      name: "Security",
      steps: [
        ...(cfg.runSecurityScan ? ["SAST scan"] : []),
        "Dependency vulnerability check",
        "Container image scan (Trivy)",
        "Generate SBOM",
      ],
      tools: [cfg.selectedTools.security, "trivy"],
    },
    {
      name: "Deploy Dev",
      steps: ["Update task definition", `Deploy to ECS (${cfg.deploymentStrategy})`, "Run smoke tests", "Notify team"],
      tools: [cfg.selectedTools.deploy, "aws"],
    },
    {
      name: "Deploy Staging",
      steps: ["Integration tests", "Performance tests", "E2E tests (Cypress)"],
      tools: ["cypress", "k6"],
    },
    {
      name: "Deploy Production",
      steps: [
        ...(cfg.needsApprovals ? ["Manual approval required"] : []),
        "Blue/Green deployment",
        "Traffic shift (10% → 50% → 100%)",
        "Rollback on failure",
      ],
      tools: [cfg.selectedTools.deploy, "cloudwatch"],
    },
  ];
  };

  const copyTemplate = () => {
    if (!pipelineConfig?.template) return;
    const content = typeof pipelineConfig.template === "string" ? pipelineConfig.template : JSON.stringify(pipelineConfig.template, null, 2);
    navigator.clipboard.writeText(content);
  };

  const downloadTemplate = () => {
    if (!pipelineConfig?.template) return;

    const content = typeof pipelineConfig.template === "string" ? pipelineConfig.template : JSON.stringify(pipelineConfig.template, null, 2);

    const isYaml = typeof pipelineConfig.template === "string" || config.selectedTools.build === "github_actions";
    const extension = isYaml ? "yml" : "json";
    const filename = `pipeline-${config.selectedTools.build}.${extension}`;

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-bold">
              <Sparkles className="h-7 w-7 text-primary" />
              Pipeline Designer AI
            </h1>
            <p className="mt-1 text-muted-foreground">
              Diseña pipelines CI/CD completos con asistencia de IA. Genera templates para GitHub Actions, CodePipeline, GitLab CI, y más.
            </p>
          </div>
          <Badge variant="outline" className="px-3 py-1">
            Modelo: gemma4:e4b
          </Badge>
        </div>

        <Alert>
          <Sparkles className="h-4 w-4" />
          <AlertDescription>
            Usa esta herramienta para generar pipelines CI/CD: configura etapas, herramientas y obtén templates listos para usar.
          </AlertDescription>
        </Alert>

        {step === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Configuración del Pipeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nombre del proyecto</label>
                <input
                  type="text"
                  value={config.projectName}
                  onChange={(e) => updateConfig("projectName", e.target.value)}
                  placeholder="my-awesome-app"
                  className="w-full p-2 rounded-md border bg-background"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo de repositorio</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {REPO_TYPES.map((repo) => {
                    const Icon = repo.icon;
                    const isSelected = config.repoType === repo.id;
                    return (
                      <button
                        key={repo.id}
                        onClick={() => updateConfig("repoType", repo.id)}
                        className={cn(
                          "p-4 rounded-lg border text-center transition-all",
                          isSelected ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                        )}
                      >
                        <Icon className="h-6 w-6 mx-auto mb-2" />
                        <div className="font-medium">{repo.label}</div>
                        <div className="text-xs text-muted-foreground">{repo.description}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Stack tecnológico</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {TECH_STACKS.map((stack) => {
                    const isSelected = config.techStack === stack.id;
                    return (
                      <button
                        key={stack.id}
                        onClick={() => updateConfig("techStack", stack.id)}
                        className={cn(
                          "p-4 rounded-lg border text-center transition-all",
                          isSelected ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                        )}
                      >
                        <div className="font-medium">{stack.label}</div>
                        <div className="text-xs text-muted-foreground">{stack.description}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => setStep(1)}>
                  Siguiente
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Herramientas y Etapas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                {["build", "deploy", "security"].map((category) => (
                  <div key={category} className="p-4 rounded-lg bg-muted">
                    <h4 className="font-medium mb-3 capitalize">{category === "build" ? "Build" : category === "deploy" ? "Deploy" : "Security"}</h4>
                    <div className="flex flex-wrap gap-2">
                      {TOOLS[category as keyof typeof TOOLS].map((tool) => {
                        const isSelected = config.selectedTools[category as keyof typeof config.selectedTools] === tool.id;
                        return (
                          <button
                            key={tool.id}
                            onClick={() => updateTool(category as "build" | "deploy" | "security", tool.id)}
                            className={cn(
                              "px-3 py-2 rounded-md border text-sm transition-all",
                              isSelected ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                            )}
                          >
                            <span className={cn("inline-block w-2 h-2 rounded-full mr-2", `bg-${tool.provider === "aws" ? "orange" : tool.provider === "github" ? "gray" : tool.provider === "gitlab" ? "orange" : "blue"}-500`)} />
                            {tool.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Estrategia de despliegue</label>
                <div className="grid grid-cols-2 gap-4">
                  {DEPLOYMENT_STRATEGIES.map((strategy) => {
                    const isSelected = config.deploymentStrategy === strategy.id;
                    return (
                      <button
                        key={strategy.id}
                        onClick={() => updateConfig("deploymentStrategy", strategy.id)}
                        className={cn(
                          "p-4 rounded-lg border text-left transition-all",
                          isSelected ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                        )}
                      >
                        <div className="font-medium">{strategy.label}</div>
                        <div className="text-xs text-muted-foreground">{strategy.description}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(0)}>
                  Anterior
                </Button>
                <Button onClick={() => setStep(2)}>
                  Siguiente
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Configuración Avanzada</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                  <input
                    type="checkbox"
                    id="useECR"
                    checked={config.useECR}
                    onChange={(e) => updateConfig("useECR", e.target.checked)}
                    className="w-4 h-4"
                  />
                  <label htmlFor="useECR" className="font-medium cursor-pointer">
                    Usar Amazon ECR para imágenes Docker
                  </label>
                </div>

                {config.useECR && (
                  <div className="space-y-2 pl-7">
                    <label className="text-sm font-medium">Nombre del repositorio ECR</label>
                    <input
                      type="text"
                      value={config.ecrRepository}
                      onChange={(e) => updateConfig("ecrRepository", e.target.value)}
                      placeholder="my-app-repo"
                      className="w-full px-3 py-2 rounded-md border bg-background"
                    />
                    <p className="text-xs text-muted-foreground">Dejar vacío para usar: {config.projectName}-repo</p>
                  </div>
                )}

                {(config.techStack?.includes("java") || config.needsDocker) && (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Ubicación del JAR</label>
                      <input
                        type="text"
                        value={config.jarPath}
                        onChange={(e) => updateConfig("jarPath", e.target.value)}
                        placeholder="build/libs/*.jar o target/*.jar"
                        className="w-full px-3 py-2 rounded-md border bg-background"
                      />
                      <p className="text-xs text-muted-foreground">Ruta al archivo JAR generado (default: build/libs/*.jar para Gradle, target/*.jar para Maven)</p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Ubicación del Dockerfile</label>
                      <input
                        type="text"
                        value={config.dockerfilePath}
                        onChange={(e) => updateConfig("dockerfilePath", e.target.value)}
                        placeholder="Dockerfile"
                        className="w-full px-3 py-2 rounded-md border bg-background"
                      />
                      <p className="text-xs text-muted-foreground">Ruta al Dockerfile (default: Dockerfile en raíz)</p>
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium">Variables de Entorno</label>
                  <div className="p-3 rounded-lg bg-muted space-y-2">
                    {Object.entries(config.envVariables || {}).map(([key, value], idx) => (
                      <div key={idx} className="flex gap-2">
                        <input
                          type="text"
                          value={key}
                          readOnly
                          className="flex-1 px-2 py-1 rounded border bg-background text-sm"
                        />
                        <input
                          type="text"
                          value={value}
                          onChange={(e) => {
                            const newEnv = { ...config.envVariables, [key]: e.target.value };
                            updateConfig("envVariables", newEnv);
                          }}
                          className="flex-1 px-2 py-1 rounded border bg-background text-sm"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newEnv = { ...config.envVariables };
                            delete newEnv[key];
                            updateConfig("envVariables", newEnv);
                          }}
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        id="newEnvKey"
                        placeholder="NOMBRE_VARIABLE"
                        className="flex-1 px-2 py-1 rounded border bg-background text-sm"
                      />
                      <input
                        type="text"
                        id="newEnvValue"
                        placeholder="valor"
                        className="flex-1 px-2 py-1 rounded border bg-background text-sm"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const keyInput = document.getElementById("newEnvKey") as HTMLInputElement;
                          const valueInput = document.getElementById("newEnvValue") as HTMLInputElement;
                          if (keyInput.value) {
                            updateConfig("envVariables", {
                              ...config.envVariables,
                              [keyInput.value]: valueInput.value
                            });
                            keyInput.value = "";
                            valueInput.value = "";
                          }
                        }}
                      >
                        +
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Argumentos adicionales de build</label>
                  <input
                    type="text"
                    value={config.additionalBuildArgs?.join(" ") || ""}
                    onChange={(e) => updateConfig("additionalBuildArgs", e.target.value.split(" ").filter(Boolean))}
                    placeholder="--no-daemon -x test"
                    className="w-full px-3 py-2 rounded-md border bg-background"
                  />
                  <p className="text-xs text-muted-foreground">Argumentos adicionales separados por espacio (ej: --no-daemon para Gradle)</p>
                </div>
              </div>

              <Alert>
                <AlertDescription>
                  Los campos vacíos usarán valores por defecto que podrás editar fácilmente en el pipeline generado.
                </AlertDescription>
              </Alert>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Anterior
                </Button>
                <Button onClick={generatePipeline} disabled={isDesigning}>
                  {isDesigning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                  Generar Pipeline
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && pipelineConfig && (
          <Card>
            <CardHeader>
              <CardTitle>Pipeline Generado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex gap-2">
                <Button variant={activeTab === "visual" ? "default" : "outline"} onClick={() => setActiveTab("visual")}>
                  <GitBranch className="mr-2 h-4 w-4" />
                  Visual
                </Button>
                <Button variant={activeTab === "yaml" ? "default" : "outline"} onClick={() => setActiveTab("yaml")}>
                  <FileCode className="mr-2 h-4 w-4" />
                  {config.selectedTools.build === "github_actions" ? "YAML" : "JSON"}
                </Button>
              </div>

              {activeTab === "visual" && (
                <div className="space-y-4">
                  {pipelineConfig.stages.map((stage, idx) => (
                    <div key={stage.name} className="border rounded-lg overflow-hidden">
                      <button
                        onClick={() => setExpandedStage(expandedStage === stage.name ? null : stage.name)}
                        className="w-full p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                          {idx + 1}
                        </div>
                        <span className="font-medium">{stage.name}</span>
                        <div className="ml-auto flex gap-1">
                          {stage.tools.slice(0, 3).map((tool, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {tool}
                            </Badge>
                          ))}
                        </div>
                        {expandedStage === stage.name ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                      {expandedStage === stage.name && (
                        <div className="px-4 pb-4 space-y-2">
                          {stage.steps.map((step, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm">
                              <Check className="h-4 w-4 text-green-500" />
                              {step}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {activeTab === "yaml" && (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={copyTemplate}>
                      <Copy className="mr-2 h-4 w-4" />
                      Copiar
                    </Button>
                    <Button variant="outline" size="sm" onClick={downloadTemplate}>
                      <Download className="mr-2 h-4 w-4" />
                      Descargar
                    </Button>
                  </div>
                  <pre className="p-4 rounded-lg bg-muted overflow-x-auto text-sm">
                    {typeof pipelineConfig.template === "string" ? pipelineConfig.template : JSON.stringify(pipelineConfig.template, null, 2)}
                  </pre>
                </div>
              )}

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(2)}>
                  <ArrowRight className="mr-2 h-4 w-4 rotate-180" />
                  Anterior
                </Button>
                <Button onClick={() => setStep(0)}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Nuevo Pipeline
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
