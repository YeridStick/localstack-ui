import { NextRequest, NextResponse } from 'next/server';
import { AIProvider, AIProviderConfig } from '@/lib/ai/aiProviderService';

// Almacenamiento temporal de configuración (en producción usar DB)
export let currentSettings: AIProviderConfig = {
  provider: (process.env.AI_PROVIDER as AIProvider) || 'groq',
  apiKey: getApiKeyFromEnv(),
  baseUrl: process.env.AI_BASE_URL || getDefaultBaseUrl(),
  model: process.env.AI_MODEL || getDefaultModel(),
  timeoutMs: parseInt(process.env.AI_TIMEOUT_MS || '30000', 10),
};

function getApiKeyFromEnv(): string | undefined {
  const provider = process.env.AI_PROVIDER as AIProvider || 'groq';
  return getApiKeyForProvider(provider);
}

function getApiKeyForProvider(provider: AIProvider): string | undefined {
  switch (provider) {
    case 'openrouter':
      return process.env.OPENROUTER_API_KEY;
    case 'groq':
      return process.env.GROQ_API_KEY;
    case 'google':
      return process.env.GOOGLE_AI_API_KEY;
    case 'custom':
      return process.env.CUSTOM_AI_API_KEY;
    default:
      return undefined;
  }
}

function getDefaultBaseUrl(): string {
  const provider = process.env.AI_PROVIDER as AIProvider || 'groq';
  return getBaseUrlForProvider(provider);
}

function getBaseUrlForProvider(provider: AIProvider): string {
  switch (provider) {
    case 'ollama':
      return 'http://host.docker.internal:11434';
    case 'openrouter':
      return 'https://openrouter.ai/api/v1';
    case 'groq':
      return 'https://api.groq.com/openai/v1';
    case 'google':
      return 'https://generativelanguage.googleapis.com/v1beta';
    default:
      return '';
  }
}

function getDefaultModel(): string {
  const provider = process.env.AI_PROVIDER as AIProvider || 'groq';
  return getModelForProvider(provider);
}

function getModelForProvider(provider: AIProvider): string {
  switch (provider) {
    case 'ollama':
      return 'gemma4:e4b';
    case 'openrouter':
      return 'google/gemma-4-31b-it:free';
    case 'groq':
      return 'llama-3.1-8b-instant';
    case 'google':
      return 'gemini-2.5-flash';
    default:
      return 'gpt-3.5-turbo';
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    settings: {
      ...currentSettings,
      apiKey: currentSettings.apiKey ? '***' : '', // No devolver la key completa
    },
    env: {
      AI_PROVIDER: process.env.AI_PROVIDER,
      AI_MODEL: process.env.AI_MODEL,
    }
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const newSettings = body.settings as AIProviderConfig;

    // Validar configuración
    if (!newSettings.provider) {
      return NextResponse.json(
        { success: false, error: 'Proveedor requerido' },
        { status: 400 }
      );
    }

    // Actualizar configuración
    currentSettings = {
      ...newSettings,
      apiKey: newSettings.apiKey || currentSettings.apiKey, // Mantener key actual si no se envió
    };

    // Actualizar variables de entorno en tiempo de ejecución
    process.env.AI_PROVIDER = newSettings.provider;
    process.env.AI_MODEL = newSettings.model;
    process.env.AI_TIMEOUT_MS = String(newSettings.timeoutMs);
    
    if (newSettings.apiKey) {
      switch (newSettings.provider) {
        case 'openrouter':
          process.env.OPENROUTER_API_KEY = newSettings.apiKey;
          break;
        case 'groq':
          process.env.GROQ_API_KEY = newSettings.apiKey;
          break;
        case 'google':
          process.env.GOOGLE_AI_API_KEY = newSettings.apiKey;
          break;
        case 'custom':
          process.env.CUSTOM_AI_API_KEY = newSettings.apiKey;
          break;
      }
    }

    console.log('[AI Settings] Updated to:', newSettings.provider, newSettings.model);

    return NextResponse.json({
      success: true,
      settings: {
        ...currentSettings,
        apiKey: '***',
      },
    });
  } catch (error) {
    console.error('[AI Settings] Error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
