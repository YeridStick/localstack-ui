"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Container,
  ImageIcon,
  RefreshCw,
  Shield,
} from "lucide-react";
import { ServicePageLayout } from "@/components/layout/service-page-layout";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useCreateEcrRepository,
  useDeleteEcrImages,
  useDeleteEcrRepository,
  useEcrImages,
  useEcrRepositories,
  useEcrRuntime,
  useSwitchEcrRuntimeToBase,
  useSwitchEcrRuntimeToReal,
} from "@/hooks/use-ecr";

function formatBytes(value?: number): string {
  if (!value || Number.isNaN(value)) return "-";
  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(size >= 100 ? 0 : 1)} ${units[unitIndex]}`;
}

function shortDigest(digest?: string): string {
  if (!digest) return "-";
  if (digest.length <= 24) return digest;
  return `${digest.slice(0, 16)}...${digest.slice(-6)}`;
}

export default function EcrPage() {
  const queryClient = useQueryClient();
  const { data: repositories = [], isLoading: loadingRepositories } = useEcrRepositories();
  const createRepository = useCreateEcrRepository();
  const deleteRepository = useDeleteEcrRepository();
  const deleteImages = useDeleteEcrImages();
  const { data: runtime, isLoading: loadingRuntime } = useEcrRuntime();
  const switchToRealRuntime = useSwitchEcrRuntimeToReal();
  const switchToBaseRuntime = useSwitchEcrRuntimeToBase();

  const [repositoryName, setRepositoryName] = useState("");
  const [scanOnPush, setScanOnPush] = useState(false);
  const [immutableTags, setImmutableTags] = useState(false);
  const [selectedRepositoryName, setSelectedRepositoryName] = useState<string>("");
  const [runtimeToken, setRuntimeToken] = useState("");
  const [runtimeEndpointStrategy, setRuntimeEndpointStrategy] = useState<
    "off" | "domain"
  >("off");

  useEffect(() => {
    if (!repositories.length) {
      setSelectedRepositoryName("");
      return;
    }

    const selectedStillExists = repositories.some(
      (repository) => repository.repositoryName === selectedRepositoryName,
    );
    if (!selectedStillExists) {
      setSelectedRepositoryName(repositories[0].repositoryName);
    }
  }, [repositories, selectedRepositoryName]);

  const { data: images = [], isLoading: loadingImages } = useEcrImages(
    selectedRepositoryName,
  );

  const stats = useMemo(() => {
    const immutableRepos = repositories.filter((repository) =>
      String(repository.imageTagMutability || "").startsWith("IMMUTABLE"),
    ).length;
    const scanningRepos = repositories.filter((repository) => repository.scanOnPush)
      .length;

    return {
      totalRepositories: repositories.length,
      immutableRepos,
      scanningRepos,
      imagesInSelectedRepo: images.length,
    };
  }, [repositories, images]);

  const selectedRepository = repositories.find(
    (repository) => repository.repositoryName === selectedRepositoryName,
  );
  const repositoryUriFromBackend =
    selectedRepository?.pushUri || selectedRepository?.repositoryUri || "";
  const loginServerFromBackend =
    selectedRepository?.loginServer ||
    (repositoryUriFromBackend ? repositoryUriFromBackend.split("/")[0] : "");
  const localstackEndpoint =
    process.env.NEXT_PUBLIC_LOCALSTACK_ENDPOINT || "http://localhost:4566";
  const backendMode = runtime?.mode || "unknown";
  const backendLabel =
    backendMode === "real"
      ? "LocalStack (ECR real)"
      : backendMode === "metadata"
        ? "MiniStack (solo metadata)"
        : "Desconocido";
  const backendBadgeVariant = backendMode === "real" ? "default" : "secondary";
  const runtimeUsesOffRegistry =
    backendMode === "real" && runtime?.ecrRealEnv?.endpointStrategy === "off";
  const loginServer = runtimeUsesOffRegistry ? "localhost:4510" : loginServerFromBackend;
  const hasLocalRegistry =
    loginServer.includes("localhost.localstack.cloud") ||
    loginServer.includes("localstack:") ||
    loginServer.startsWith("localhost:") ||
    loginServer.startsWith("127.0.0.1:");
  const repositoryUriForPush =
    runtimeUsesOffRegistry && selectedRepositoryName
      ? `localhost:4510/${selectedRepositoryName}`
      : repositoryUriFromBackend;
  const hasUsableLocalRegistry =
    hasLocalRegistry || (backendMode === "real" && loginServer.startsWith("localhost:"));
  const pushTag = selectedRepositoryName || "mi-proyecto";
  const loginCommand = loginServer
    ? `aws --endpoint-url=${localstackEndpoint} ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ${loginServer}`
    : "";
  const tagCommand =
    repositoryUriForPush && pushTag
      ? `docker tag ${pushTag}:dev ${repositoryUriForPush}:dev`
      : "";
  const pushCommand =
    repositoryUriForPush && pushTag
      ? `docker push ${repositoryUriForPush}:dev`
      : "";
  const createCommand = selectedRepositoryName
    ? `aws --endpoint-url=${localstackEndpoint} ecr create-repository --repository-name ${selectedRepositoryName}`
    : "";

  useEffect(() => {
    const strategy = runtime?.ecrRealEnv?.endpointStrategy;
    if (strategy === "off" || strategy === "domain") {
      setRuntimeEndpointStrategy(strategy);
    }
  }, [runtime?.ecrRealEnv?.endpointStrategy]);

  const handleCreateRepository = async (event: FormEvent) => {
    event.preventDefault();
    const repo = repositoryName.trim();
    if (!repo) return;

    const response = await createRepository.mutateAsync({
      repositoryName: repo,
      scanOnPush,
      imageTagMutability: immutableTags ? "IMMUTABLE" : "MUTABLE",
    });

    setRepositoryName("");
    setSelectedRepositoryName(response?.repository?.repositoryName || repo);
  };

  const handleSwitchToRealRuntime = async () => {
    await switchToRealRuntime.mutateAsync({
      authToken: runtimeToken.trim() || undefined,
      endpointStrategy: runtimeEndpointStrategy,
    });
    setRuntimeToken("");
  };

  const handleSwitchToBaseRuntime = async () => {
    await switchToBaseRuntime.mutateAsync();
  };

  return (
    <ServicePageLayout
      title="ECR"
      description="Simulacion de repositorios e imagenes de contenedores"
      icon={Container}
      secondaryAction={{
        label: "Refresh",
        icon: RefreshCw,
        onClick: () => {
          queryClient.invalidateQueries({ queryKey: ["ecr-repositories"] });
          queryClient.invalidateQueries({ queryKey: ["ecr-runtime"] });
          queryClient.invalidateQueries({ queryKey: ["localstack-health"] });
          if (selectedRepositoryName) {
            queryClient.invalidateQueries({
              queryKey: ["ecr-images", selectedRepositoryName],
            });
          }
        },
      }}
      stats={[
        {
          title: "Repositorios",
          value: stats.totalRepositories,
          description: "Total ECR",
          icon: Container,
        },
        {
          title: "Inmutables",
          value: stats.immutableRepos,
          description: "Tag mutability IMMUTABLE",
          icon: Shield,
        },
        {
          title: "Scan on push",
          value: stats.scanningRepos,
          description: "Repositorios con escaneo",
          icon: AlertTriangle,
        },
        {
          title: "Imagenes",
          value: stats.imagesInSelectedRepo,
          description: selectedRepositoryName
            ? `En ${selectedRepositoryName}`
            : "Selecciona un repo",
          icon: ImageIcon,
        },
      ]}
      alert={{
        icon: Container,
        description:
          "Para push/pull ECR real usa docker-compose.ecr-real.yml (LocalStack + token gratis). El compose base con MiniStack mantiene metadata ECR y laboratorio general.",
      }}
    >
      <Card>
        <CardHeader>
          <CardTitle>Runtime ECR</CardTitle>
          <CardDescription>
            Cambia entre modo metadata (MiniStack) y modo ECR real (LocalStack)
            sin salir de la UI.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={backendBadgeVariant}>{backendLabel}</Badge>
            <Badge variant="outline">
              Strategy: {runtime?.ecrRealEnv?.endpointStrategy || runtimeEndpointStrategy}
            </Badge>
            {!loadingRuntime && runtime && (
              <Badge variant={runtime.dockerReady ? "default" : "destructive"}>
                Docker {runtime.dockerReady ? "OK" : "Error"}
              </Badge>
            )}
            {!loadingRuntime && runtime && (
              <Badge variant={runtime.composeReady ? "default" : "destructive"}>
                Compose {runtime.composeReady ? "OK" : "Error"}
              </Badge>
            )}
          </div>

          {runtime && !runtime.dockerReady && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Docker no esta disponible desde la API.
                {runtime.dockerError ? ` ${runtime.dockerError}` : ""}
              </AlertDescription>
            </Alert>
          )}
          {runtime && runtime.dockerReady && !runtime.composeReady && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Docker Compose no esta disponible en este runtime. Se usara fallback
                con `docker run/rm` para cambiar entre MiniStack y LocalStack.
              </AlertDescription>
            </Alert>
          )}

          {backendMode !== "real" ? (
            <div className="grid gap-3 md:grid-cols-5">
              <div className="space-y-2 md:col-span-3">
                <Label htmlFor="runtime-token">LocalStack Auth Token</Label>
                <Input
                  id="runtime-token"
                  type="password"
                  placeholder={
                    runtime?.ecrRealEnv?.hasToken
                      ? "Token guardado (opcional reemplazar)"
                      : "Pega tu token gratuito de LocalStack"
                  }
                  value={runtimeToken}
                  onChange={(event) => setRuntimeToken(event.target.value)}
                />
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <Label htmlFor="runtime-path-strategy" className="text-sm">
                  Registry local (4510)
                </Label>
                <Switch
                  id="runtime-path-strategy"
                  checked={runtimeEndpointStrategy === "off"}
                  onCheckedChange={(checked) =>
                    setRuntimeEndpointStrategy(checked ? "off" : "domain")
                  }
                />
              </div>
              <Button
                onClick={handleSwitchToRealRuntime}
                disabled={
                  switchToRealRuntime.isPending ||
                  (runtime && !runtime.dockerReady)
                }
              >
                {switchToRealRuntime.isPending
                  ? "Activando..."
                  : "Activar ECR real"}
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                onClick={handleSwitchToBaseRuntime}
                disabled={switchToBaseRuntime.isPending || (runtime && !runtime.dockerReady)}
              >
                {switchToBaseRuntime.isPending
                  ? "Cambiando..."
                  : "Volver a modo base"}
              </Button>
              <p className="text-xs text-muted-foreground">
                Para practica real usa modo ECR real y luego `docker login`, `docker
                tag`, `docker push`.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Crear repositorio</CardTitle>
          <CardDescription>
            Configura nombre y politicas basicas del repositorio ECR.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-5" onSubmit={handleCreateRepository}>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="repository-name">Repository name</Label>
              <Input
                id="repository-name"
                value={repositoryName}
                onChange={(event) => setRepositoryName(event.target.value)}
                placeholder="my-app"
                required
              />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <Label htmlFor="scan-on-push" className="text-sm">
                Scan on push
              </Label>
              <Switch
                id="scan-on-push"
                checked={scanOnPush}
                onCheckedChange={(checked) => setScanOnPush(Boolean(checked))}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <Label htmlFor="immutable-tags" className="text-sm">
                Tags inmutables
              </Label>
              <Switch
                id="immutable-tags"
                checked={immutableTags}
                onCheckedChange={(checked) => setImmutableTags(Boolean(checked))}
              />
            </div>
            <Button type="submit" disabled={createRepository.isPending}>
              {createRepository.isPending ? "Creando..." : "Crear repositorio"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Push Commands</CardTitle>
          <CardDescription>
            Flujo real local para autenticar, tagear y subir imagenes al registro ECR.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!selectedRepositoryName ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Selecciona un repositorio para generar comandos de push.
              </AlertDescription>
            </Alert>
          ) : !hasUsableLocalRegistry ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Este backend no expone registry Docker ECR completo. Activa el modo
                ECR real arriba y reintenta el push.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                Endpoint ECR API: <code>{localstackEndpoint}</code>
              </p>
              <p className="text-xs text-muted-foreground">
                Registry: <code>{loginServer || "-"}</code>
              </p>
              <div className="space-y-2">
                <Label>Paso 1 - Crear repositorio (si no existe)</Label>
                <pre className="overflow-auto rounded-md border bg-slate-950 p-3 text-xs text-slate-100">
                  {createCommand}
                </pre>
              </div>
              <div className="space-y-2">
                <Label>Paso 2 - Login al registry</Label>
                <pre className="overflow-auto rounded-md border bg-slate-950 p-3 text-xs text-slate-100">
                  {loginCommand}
                </pre>
              </div>
              <div className="space-y-2">
                <Label>Paso 3 - Build, tag y push</Label>
                <pre className="overflow-auto rounded-md border bg-slate-950 p-3 text-xs text-slate-100">
                  {`docker build -t ${pushTag}:dev .
${tagCommand}
${pushCommand}`}
                </pre>
              </div>
              <div className="space-y-2">
                <Label>Paso 4 - Verificar imagenes en ECR</Label>
                <pre className="overflow-auto rounded-md border bg-slate-950 p-3 text-xs text-slate-100">
                  {`aws --endpoint-url=${localstackEndpoint} ecr list-images --repository-name ${selectedRepositoryName}
aws --endpoint-url=${localstackEndpoint} ecr describe-images --repository-name ${selectedRepositoryName}`}
                </pre>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Repositorios</CardTitle>
          <CardDescription>
            Selecciona un repositorio para ver sus imagenes o eliminelo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>URI</TableHead>
                <TableHead>Mutability</TableHead>
                <TableHead>Scan</TableHead>
                <TableHead>Creado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingRepositories ? (
                <TableRow>
                  <TableCell colSpan={6}>Cargando repositorios...</TableCell>
                </TableRow>
              ) : repositories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}>No hay repositorios ECR.</TableCell>
                </TableRow>
              ) : (
                repositories.map((repository) => {
                  const active =
                    repository.repositoryName === selectedRepositoryName;
                  return (
                    <TableRow key={repository.repositoryName}>
                      <TableCell className="font-medium">
                        {repository.repositoryName}
                      </TableCell>
                      <TableCell className="max-w-[320px] truncate">
                        {repository.repositoryUri || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {repository.imageTagMutability || "MUTABLE"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {repository.scanOnPush ? "Enabled" : "Disabled"}
                      </TableCell>
                      <TableCell>
                        {repository.createdAt
                          ? new Date(repository.createdAt).toLocaleString()
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant={active ? "default" : "outline"}
                            size="sm"
                            onClick={() =>
                              setSelectedRepositoryName(repository.repositoryName)
                            }
                          >
                            {active ? "Seleccionado" : "Ver imagenes"}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={deleteRepository.isPending}
                            onClick={() =>
                              deleteRepository.mutate({
                                repositoryName: repository.repositoryName,
                                force: true,
                              })
                            }
                          >
                            Eliminar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Imagenes</CardTitle>
          <CardDescription>
            {selectedRepositoryName
              ? `Repositorio seleccionado: ${selectedRepositoryName}`
              : "Selecciona un repositorio para listar imagenes"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tags</TableHead>
                <TableHead>Digest</TableHead>
                <TableHead>Tamano</TableHead>
                <TableHead>Pushed at</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!selectedRepositoryName ? (
                <TableRow>
                  <TableCell colSpan={5}>
                    Debes seleccionar un repositorio.
                  </TableCell>
                </TableRow>
              ) : loadingImages ? (
                <TableRow>
                  <TableCell colSpan={5}>Cargando imagenes...</TableCell>
                </TableRow>
              ) : images.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5}>
                    El repositorio no tiene imagenes.
                  </TableCell>
                </TableRow>
              ) : (
                images.map((image) => (
                  <TableRow key={`${image.imageDigest}-${image.imageTags?.join(",")}`}>
                    <TableCell>{image.imageTags?.join(", ") || "-"}</TableCell>
                    <TableCell>{shortDigest(image.imageDigest)}</TableCell>
                    <TableCell>{formatBytes(image.imageSizeInBytes)}</TableCell>
                    <TableCell>
                      {image.imagePushedAt
                        ? new Date(image.imagePushedAt).toLocaleString()
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={deleteImages.isPending}
                        onClick={() =>
                          deleteImages.mutate({
                            repositoryName: selectedRepositoryName,
                            imageIds: [
                              {
                                imageDigest: image.imageDigest,
                                imageTag: image.imageTags?.[0],
                              },
                            ],
                          })
                        }
                      >
                        Eliminar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {runtime?.ecrRealEnv?.endpointStrategy === "domain" ? (
                <>
                  Si no aparecen imagenes, valida DNS local de{" "}
                  <code>localhost.localstack.cloud</code>, ejecuta nuevamente
                  login y repite el push.
                </>
              ) : (
                <>
                  Si no aparecen imagenes, valida el login al registry{" "}
                  <code>localhost:4510</code>, y repite el push.
                </>
              )}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </ServicePageLayout>
  );
}
