// Servicio unificado de IA - Soporta Ollama (local) y OpenRouter (API)

import {
  sendMessageToOpenRouter,
  generateJSONWithOpenRouter,
  checkOpenRouterStatus,
  FREE_MODELS,
} from './openRouterService';

const OLLAMA_BASE_URL = process.env.NEXT_PUBLIC_OLLAMA_BASE_URL || 'http://localhost:11434';
const AI_PROVIDER = process.env.AI_PROVIDER || 'hybrid'; // 'ollama', 'openrouter', o 'hybrid'
const HYBRID_TIMEOUT_MS = parseInt(process.env.HYBRID_TIMEOUT_MS || '8000', 10); // Timeout para fallback

// Debug: Log configuration on module load
console.log('[AI Service] Configuration:', {
  AI_PROVIDER,
  HYBRID_TIMEOUT_MS,
  OLLAMA_BASE_URL,
  OPENROUTER_API_KEY_EXISTS: !!process.env.OPENROUTER_API_KEY,
  OPENROUTER_MODEL: process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-exp:free'
});

export const AVAILABLE_MODELS = [
  { id: 'gemma4:e4b', name: 'Gemma 4B (Ollama)', description: 'Modelo balanceado local' },
  { id: 'gemma4:e2b', name: 'Gemma 2B (Ollama)', description: 'Modelo ligero local' },
  { id: 'google/gemini-2.0-flash-exp:free', name: 'Gemini 2.0 Flash (OpenRouter)', description: 'Modelo gratuito de Google' },
  { id: 'meta-llama/llama-3.1-8b-instruct:free', name: 'Llama 3.1 8B (OpenRouter)', description: 'Modelo gratuito de Meta' },
  { id: 'mistralai/mistral-7b-instruct:free', name: 'Mistral 7B (OpenRouter)', description: 'Modelo gratuito de Mistral' },
];

// Contexto de AWS para enriquecer las preguntas
const AWS_CONTEXT = `
Eres un asistente experto en AWS (Amazon Web Services) y arquitectura cloud.
Tienes acceso a documentación sobre: VPC, EC2, S3, RDS, Lambda, EKS, IAM, CloudFormation, 
Networking, Seguridad, y mejores prácticas de infraestructura.

Reglas:
1. Responde de manera concisa y profesional
2. Incluye comandos AWS CLI cuando sea relevante
3. Proporciona pasos numerados para guías
4. Si detectas un problema específico, ofrece soluciones paso a paso
5. Sugiere recursos relacionados de la documentación

Formato de respuesta:
- Respuesta directa
- Comandos/ejemplos (si aplica)
- Pasos siguientes recomendados
- Recursos relacionados en la documentación
`;

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIResponse {
  success: boolean;
  content: string | null;
  error?: string;
  model?: string;
}

/**
 * Determinar estrategia de IA basada en configuración
 */
function getAIProvider(model?: string): 'openrouter' | 'ollama' | 'hybrid' {
  // Si el provider está configurado explícitamente
  if (AI_PROVIDER === 'openrouter') return 'openrouter';
  if (AI_PROVIDER === 'ollama') return 'ollama';
  // Si el modelo contiene '/' (formato de OpenRouter), usar OpenRouter
  if (model?.includes('/')) return 'openrouter';
  // Por defecto en modo híbrido: intentar OpenRouter primero, fallback a Ollama
  return 'hybrid';
}

/**
 * Enviar mensaje usando Ollama local
 */
async function sendWithOllama(
  message: string,
  model: string,
  conversationHistory: AIMessage[]
): Promise<AIResponse> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout para Ollama

    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: AWS_CONTEXT },
          ...conversationHistory,
          { role: 'user', content: message }
        ],
        stream: false,
        options: {
          temperature: 0.7,
          num_predict: 2048
        }
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      content: data.message?.content || 'No response from model',
      model: model,
      error: undefined,
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        success: false,
        error: 'Timeout: Ollama no respondió a tiempo',
        content: null,
        model: model,
      };
    }
    return {
      success: false,
      error: (error as Error).message,
      content: null,
      model: model,
    };
  }
}

/**
 * Enviar mensaje usando OpenRouter API
 */
async function sendWithOpenRouter(
  message: string,
  model: string,
  conversationHistory: AIMessage[]
): Promise<AIResponse> {
  // Check if API key is configured
  if (!process.env.OPENROUTER_API_KEY) {
    console.error('[AI OpenRouter] ERROR: OPENROUTER_API_KEY not configured');
    return {
      success: false,
      error: 'OpenRouter API key not configured. Please set OPENROUTER_API_KEY in your environment.',
      content: null,
      model: 'openrouter',
    };
  }

  const messages = [
    { role: 'system' as const, content: AWS_CONTEXT },
    ...conversationHistory.map(m => ({ role: m.role as 'user' | 'assistant' | 'system', content: m.content })),
    { role: 'user' as const, content: message }
  ];

  const openRouterModel = model.includes('/') ? model : 'google/gemini-2.0-flash-exp:free';

  console.log(`[AI OpenRouter] Sending request with model: ${openRouterModel}`);
  
  const result = await sendMessageToOpenRouter(messages, {
    model: openRouterModel,
    temperature: 0.7,
    maxTokens: 4096,
  });

  console.log(`[AI OpenRouter] Result: success=${result.success}, error=${result.error || 'none'}`);

  return {
    success: result.success,
    content: result.content || null,
    error: result.error,
    model: openRouterModel,
  };
}

/**
 * Enviar mensaje al modelo IA (unificado: Ollama o OpenRouter)
 * Modo híbrido: intenta OpenRouter primero (rápido), fallback a Ollama si falla
 */
export async function sendMessageToAI(
  message: string,
  model: string = 'gemma4:e4b',
  conversationHistory: AIMessage[] = []
): Promise<AIResponse> {
  const provider = getAIProvider(model);

  // Modo OpenRouter exclusivo
  if (provider === 'openrouter') {
    return sendWithOpenRouter(message, model, conversationHistory);
  }

  // Modo Ollama exclusivo
  if (provider === 'ollama') {
    return sendWithOllama(message, model, conversationHistory);
  }

  // Modo híbrido: OpenRouter primero con timeout corto, fallback a Ollama
  console.log(`[AI Hybrid] Starting hybrid mode with timeout ${HYBRID_TIMEOUT_MS}ms`);
  console.log(`[AI Hybrid] AI_PROVIDER=${AI_PROVIDER}, will try OpenRouter first`);

  const openRouterPromise = sendWithOpenRouter(message, model, conversationHistory);
  const timeoutPromise = new Promise<AIResponse>((resolve) => {
    setTimeout(() => {
      resolve({
        success: false,
        error: 'timeout',
        content: null,
        model: model,
      });
    }, HYBRID_TIMEOUT_MS);
  });

  // Carrera entre OpenRouter y timeout
  console.log('[AI Hybrid] Racing OpenRouter vs timeout...');
  const openRouterResult = await Promise.race([openRouterPromise, timeoutPromise]);
  console.log(`[AI Hybrid] Race result: success=${openRouterResult.success}, error=${openRouterResult.error || 'none'}`);

  // Si OpenRouter tuvo éxito, retornar resultado
  if (openRouterResult.success) {
    console.log('[AI Hybrid] ✅ OpenRouter responded successfully');
    return openRouterResult;
  }

  // Si OpenRouter falló o timeout, intentar con Ollama SOLO si no es error de API key
  if (openRouterResult.error?.includes('API key not configured')) {
    console.log('[AI Hybrid] ❌ OpenRouter API key not configured, not falling back to Ollama');
    return openRouterResult;
  }

  console.log('[AI Hybrid] ⚠️ OpenRouter failed or timeout, falling back to Ollama...');
  return sendWithOllama(message, model, conversationHistory);
}

/**
 * Verificar si el servicio de IA está disponible
 */
export async function checkAIStatus(): Promise<{ available: boolean; provider: string; error?: string }> {
  const useOpenRouter = AI_PROVIDER === 'openrouter';

  if (useOpenRouter) {
    const status = await checkOpenRouterStatus();
    return {
      available: status.available,
      provider: 'openrouter',
      error: status.error,
    };
  }

  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, { method: 'GET' });
    return {
      available: response.ok,
      provider: 'ollama',
    };
  } catch (error) {
    return {
      available: false,
      provider: 'ollama',
      error: (error as Error).message,
    };
  }
}

/**
 * @deprecated Use checkAIStatus instead
 */
export async function checkOllamaStatus(): Promise<boolean> {
  const status = await checkAIStatus();
  return status.available;
}

/**
 * Obtener lista de modelos disponibles en Ollama
 */
export async function getAvailableModels(): Promise<string[]> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
    if (!response.ok) return [];

    const data = await response.json();
    return data.models?.map((m: { name: string }) => m.name) || [];
  } catch {
    return [];
  }
}

/**
 * Generar guía paso a paso para infraestructura
 */
export interface GuideStep {
  number: number;
  title: string;
  description: string;
  commands: string[];
  commonIssues?: string[];
  estimatedTime?: string;
}

export interface InfraGuide {
  title: string;
  estimatedTime?: string;
  prerequisites?: string[];
  steps: GuideStep[];
}

export async function generateInfraGuide(
  goal: string,
  model: string = 'gemma4:e4b'
): Promise<InfraGuide | null> {
  const prompt = `Genera una guía paso a paso detallada para: "${goal}"

Estructura requerida:
1. Prerrequisitos (comandos AWS CLI necesarios)
2. Paso 1: [Título] - Comando(s) específicos
3. Paso 2: [Título] - Comando(s) específicos
...
N. Verificación - Cómo confirmar que todo funciona

Para cada paso incluye:
- Descripción breve
- Comando AWS CLI completo
- Posibles errores comunes y cómo evitarlos
- Tiempo estimado

Formato JSON:
{
  "title": "...",
  "estimatedTime": "...",
  "prerequisites": [...],
  "steps": [
    {
      "number": 1,
      "title": "...",
      "description": "...",
      "commands": [...],
      "commonIssues": [...],
      "estimatedTime": "..."
    }
  ]
}`;

  const response = await sendMessageToAI(prompt, model);

  if (!response.success) return null;

  try {
    const jsonMatch = response.content?.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return { title: goal, steps: [{ number: 1, title: 'Guía', description: response.content || '', commands: [] }] };
  } catch {
    return { title: goal, steps: [{ number: 1, title: 'Guía', description: response.content || '', commands: [] }] };
  }
}
