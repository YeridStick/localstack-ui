"use client";

import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Check, AlertCircle, Server, Cloud, Zap, Settings, RefreshCw, Bot, Key, Clock } from "lucide-react";

interface AIProviderStatus {
  provider: string;
  model: string;
  available: boolean;
  error?: string;
}

interface AISettings {
  provider: "ollama" | "openrouter" | "groq" | "custom";
  apiKey?: string;
  baseUrl?: string;
  model: string;
  timeoutMs: number;
}

const PROVIDERS = [
  { id: "ollama", name: "Ollama (Local)", icon: Bot, description: "Modelos locales en tu máquina" },
  { id: "openrouter", name: "OpenRouter", icon: Cloud, description: "API gratuita con múltiples modelos" },
  { id: "groq", name: "Groq", icon: Zap, description: "Respuestas ultrarrápidas" },
  { id: "custom", name: "Endpoint Personalizado", icon: Settings, description: "Cualquier API OpenAI-compatible" },
];

const FREE_MODELS: Record<string, Array<{ id: string; name: string; description: string }>> = {
  ollama: [
    { id: "gemma4:e4b", name: "Gemma 4B", description: "Balanceado para LocalStack" },
    { id: "gemma4:e2b", name: "Gemma 2B", description: "Ligero y rápido" },
  ],
  openrouter: [
    { id: "google/gemini-2.0-flash-exp:free", name: "Gemini 2.0 Flash", description: "Google - Gratuito" },
    { id: "meta-llama/llama-3.1-8b-instruct:free", name: "Llama 3.1 8B", description: "Meta - Gratuito" },
    { id: "mistralai/mistral-7b-instruct:free", name: "Mistral 7B", description: "Mistral - Gratuito" },
  ],
  groq: [
    { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B Instant", description: "Ultra rápido" },
    { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B", description: "Mayor capacidad" },
    { id: "mixtral-8x7b-32768", name: "Mixtral 8x7B", description: "32k contexto" },
  ],
  custom: [
    { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo", description: "Modelo estándar OpenAI" },
    { id: "gpt-4", name: "GPT-4", description: "Alta capacidad" },
  ],
};

const DEFAULT_BASE_URLS: Record<string, string> = {
  ollama: "http://host.docker.internal:11434",
  openrouter: "https://openrouter.ai/api/v1",
  groq: "https://api.groq.com/openai/v1",
  custom: "",
};

const DEFAULT_TIMEOUTS: Record<string, number> = {
  ollama: 35000,
  openrouter: 60000,
  groq: 30000,
  custom: 30000,
};

export default function AISettingsPage() {
  const [status, setStatus] = useState<AIProviderStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [settings, setSettings] = useState<AISettings>({
    provider: "groq",
    apiKey: "",
    baseUrl: "",
    model: "llama-3.1-8b-instant",
    timeoutMs: 30000,
  });

  useEffect(() => {
    loadSettings();
    checkStatus();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch("/api/ai/settings");
      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings);
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  };

  const checkStatus = async () => {
    try {
      const response = await fetch("/api/ai/status");
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      }
    } catch (error) {
      console.error("Error checking status:", error);
    }
  };

  const updateSettings = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/ai/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });

      if (response.ok) {
        setMessage({ type: "success", text: "Configuración guardada correctamente" });
        checkStatus();
      } else {
        const error = await response.json();
        setMessage({ type: "error", text: error.error || "Error guardando configuración" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Error de conexión" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleProviderChange = (provider: AISettings["provider"]) => {
    const models = FREE_MODELS[provider];
    setSettings({
      ...settings,
      provider,
      model: models[0]?.id || "",
      baseUrl: DEFAULT_BASE_URLS[provider],
      timeoutMs: DEFAULT_TIMEOUTS[provider],
      apiKey: provider === "ollama" ? "" : settings.apiKey,
    });
  };

  const Icon = PROVIDERS.find((p) => p.id === settings.provider)?.icon || Bot;

  return (
    <MainLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="h-6 w-6" />
            Configuración de IA
          </h1>
          <p className="text-muted-foreground">
            Selecciona tu proveedor de inteligencia artificial preferido
          </p>
        </div>

        {/* Status Card */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Estado del Proveedor
            </CardTitle>
          </CardHeader>
          <CardContent>
            {status ? (
              <div className="flex items-center gap-3">
                {status.available ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <Check className="h-5 w-5" />
                    <span className="font-medium">
                      {status.provider === "ollama" ? "Ollama local" : status.provider} está activo
                    </span>
                    <span className="text-muted-foreground">- Modelo: {status.model}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-yellow-600">
                    <AlertCircle className="h-5 w-5" />
                    <span className="font-medium">{status.provider} no está disponible</span>
                  </div>
                )}
              </div>
            ) : (
              <span className="text-muted-foreground">Verificando estado...</span>
            )}
          </CardContent>
        </Card>

        {/* Provider Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {PROVIDERS.map((provider) => {
            const ProviderIcon = provider.icon;
            const isSelected = settings.provider === provider.id;
            return (
              <button
                key={provider.id}
                onClick={() => handleProviderChange(provider.id as AISettings["provider"])}
                className={`p-4 rounded-lg border text-left transition-all ${
                  isSelected
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="flex items-start gap-3">
                  <ProviderIcon className="h-5 w-5 mt-0.5" />
                  <div>
                    <h3 className="font-medium">{provider.name}</h3>
                    <p className="text-sm text-muted-foreground">{provider.description}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Configuration Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Icon className="h-5 w-5" />
              Configuración de {PROVIDERS.find((p) => p.id === settings.provider)?.name}
            </CardTitle>
            <CardDescription>
              Configura los parámetros para tu proveedor seleccionado
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {message && (
              <Alert variant={message.type === "error" ? "destructive" : "default"}>
                <AlertDescription>{message.text}</AlertDescription>
              </Alert>
            )}

            {/* Model Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Bot className="h-4 w-4" />
                Modelo
              </label>
              <select
                value={settings.model}
                onChange={(e) => setSettings({ ...settings, model: e.target.value })}
                className="w-full px-3 py-2 rounded-md border bg-background"
              >
                {FREE_MODELS[settings.provider]?.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name} - {model.description}
                  </option>
                ))}
              </select>
            </div>

            {/* API Key (for cloud providers) */}
            {settings.provider !== "ollama" && (
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  API Key
                  {settings.provider === "groq" && (
                    <span className="text-xs text-muted-foreground">(Pre-configurada)</span>
                  )}
                </label>
                <input
                  type="password"
                  value={settings.apiKey}
                  onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
                  placeholder={
                    settings.provider === "openrouter"
                      ? "sk-or-v1-..."
                      : settings.provider === "groq"
                      ? "gsk_..."
                      : "Tu API key..."
                  }
                  className="w-full px-3 py-2 rounded-md border bg-background font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  {settings.provider === "groq"
                    ? "Groq ya está pre-configurado. Solo cambia si tienes tu propia key."
                    : `Ingresa tu API key de ${settings.provider}`}
                </p>
              </div>
            )}

            {/* Base URL */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Server className="h-4 w-4" />
                URL del Endpoint
              </label>
              <input
                type="text"
                value={settings.baseUrl}
                onChange={(e) => setSettings({ ...settings, baseUrl: e.target.value })}
                placeholder="https://..."
                className="w-full px-3 py-2 rounded-md border bg-background font-mono text-sm"
              />
              {settings.provider === "custom" && (
                <p className="text-xs text-muted-foreground">
                  URL de tu endpoint OpenAI-compatible (ej: https://api.openai.com/v1)
                </p>
              )}
            </div>

            {/* Timeout */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Timeout (milisegundos)
              </label>
              <input
                type="number"
                value={settings.timeoutMs}
                onChange={(e) => setSettings({ ...settings, timeoutMs: parseInt(e.target.value) })}
                min="5000"
                max="120000"
                step="1000"
                className="w-full px-3 py-2 rounded-md border bg-background"
              />
              <p className="text-xs text-muted-foreground">
                Tiempo máximo de espera por respuesta
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button onClick={updateSettings} disabled={isLoading} className="flex-1">
                {isLoading ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-2 h-4 w-4" />
                )}
                Guardar y Aplicar
              </Button>
              <Button variant="outline" onClick={checkStatus} disabled={isLoading}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Probar Conexión
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="mt-6 bg-muted/50">
          <CardContent className="pt-6">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Recomendación Rápida
            </h4>
            <p className="text-sm text-muted-foreground">
              Para empezar rápidamente sin configuración:
              <br />
              <strong>Groq</strong> - Respuestas instantáneas, token pre-configurado
              <br />
              <strong>OpenRouter</strong> - API gratuita, solo necesitas crear cuenta
              <br />
              <strong>Ollama</strong> - Totalmente privado, requiere instalación local
            </p>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
