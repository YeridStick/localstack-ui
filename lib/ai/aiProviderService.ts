// Servicio unificado para múltiples proveedores de IA
// Soporta: Ollama, OpenRouter, Groq, y endpoints OpenAI-compatibles

export type AIProvider = 'ollama' | 'openrouter' | 'groq' | 'google' | 'custom';

export interface AIProviderConfig {
  provider: AIProvider;
  apiKey?: string;
  baseUrl?: string;
  model: string;
  timeoutMs: number;
}

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIResponse {
  success: boolean;
  content: string | null;
  error?: string;
  model?: string;
  provider?: AIProvider;
}

// Configuración por defecto de proveedores
export const PROVIDER_DEFAULTS: Record<AIProvider, { baseUrl: string; defaultModel: string; timeoutMs: number }> = {
  ollama: {
    baseUrl: 'http://host.docker.internal:11434',
    defaultModel: 'gemma4:e4b',
    timeoutMs: 35000,
  },
  openrouter: {
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'google/gemma-4-31b-it:free',
    timeoutMs: 60000,
  },
  groq: {
    baseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.1-8b-instant', // Modelo gratuito en Groq
    timeoutMs: 30000,
  },
  google: {
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    defaultModel: 'gemini-2.5-flash',
    timeoutMs: 60000,
  },
  custom: {
    baseUrl: '',
    defaultModel: 'gpt-3.5-turbo',
    timeoutMs: 30000,
  },
};

// Modelos gratuitos por proveedor
export const FREE_MODELS_BY_PROVIDER: Record<AIProvider, Array<{ id: string; name: string; description: string }>> = {
  ollama: [
    { id: 'gemma4:e4b', name: 'Gemma 4B', description: 'Modelo local balanceado' },
    { id: 'gemma4:e2b', name: 'Gemma 2B', description: 'Modelo local ligero' },
  ],
  openrouter: [
    { id: 'google/gemma-4-31b-it:free', name: 'Gemma 4 31B', description: 'Gratuito - Google (Recomendado)' },
    { id: 'google/gemma-4-26b-a4b-it:free', name: 'Gemma 4 26B A4B', description: 'Gratuito - Google' },
    { id: 'meta-llama/llama-3.1-8b-instruct:free', name: 'Llama 3.1 8B', description: 'Gratuito - Meta' },
    { id: 'mistralai/mistral-7b-instruct:free', name: 'Mistral 7B', description: 'Gratuito - Mistral' },
  ],
  groq: [
    { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant', description: 'Gratuito - Respuestas rápidas' },
    { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', description: 'Gratuito - Mayor capacidad' },
    { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', description: 'Gratuito - Buen balance' },
  ],
  google: [
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: 'Google - 1M tokens, ultra rápido' },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', description: 'Google - Ligero y eficiente' },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', description: 'Google - Mayor capacidad' },
  ],
  custom: [
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Modelo estándar' },
  ],
};

export function getConfigFromEnv(): AIProviderConfig {
  const provider = (process.env.AI_PROVIDER as AIProvider) || 'groq';
  const defaults = PROVIDER_DEFAULTS[provider];

  return {
    provider,
    apiKey: getApiKeyForProvider(provider),
    baseUrl: process.env.AI_BASE_URL || defaults.baseUrl,
    model: process.env.AI_MODEL || defaults.defaultModel,
    timeoutMs: Number.parseInt(process.env.AI_TIMEOUT_MS || String(defaults.timeoutMs), 10),
  };
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

/**
 * Enviar mensaje al proveedor de IA configurado
 */
export async function sendMessageWithProvider(
  messages: AIMessage[],
  config?: Partial<AIProviderConfig>
): Promise<AIResponse> {
  const finalConfig = { ...getConfigFromEnv(), ...config };
  const { provider, apiKey, baseUrl, model, timeoutMs } = finalConfig;

  console.log(`[AI Provider] Using ${provider} with model ${model}`);
  console.log(`[AI Provider] API Key present: ${apiKey ? 'YES (length: ' + apiKey.length + ')' : 'NO'}`);

  // Manejar Google AI primero (formato diferente)
  if (provider === 'google') {
    return sendMessageToGoogleAI(messages, model, apiKey, baseUrl, timeoutMs);
  }

  // Validar configuración para otros proveedores
  if (provider !== 'ollama' && !apiKey) {
    return {
      success: false,
      content: null,
      error: `API key no configurada para ${provider}. Configura ${getApiKeyEnvName(provider)}`,
      provider,
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const authHeader = provider === 'ollama' ? '' : `Bearer ${apiKey}`;
    console.log(`[AI Provider] Auth header: ${authHeader ? 'Bearer ***' : 'EMPTY'}`);
    
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
        ...(provider === 'openrouter' ? {
          'HTTP-Referer': process.env.OPENROUTER_HTTP_REFERER || 'http://localhost:4563',
          'X-OpenRouter-Title': process.env.OPENROUTER_SITE_TITLE || 'LocalStack UI',
        } : {}),
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 4096,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API error ${response.status}: ${error}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    return {
      success: true,
      content,
      model,
      provider,
    };
  } catch (error) {
    console.error(`[AI Provider] Error with ${provider}:`, error);
    return {
      success: false,
      content: null,
      error: (error as Error).message,
      provider,
    };
  }
}

/**
 * Enviar mensaje a Google AI (Gemini API)
 * Usa formato de API diferente: /models/{model}:generateContent
 */
async function sendMessageToGoogleAI(
  messages: AIMessage[],
  model: string,
  apiKey: string | undefined,
  baseUrl: string,
  timeoutMs: number
): Promise<AIResponse> {
  if (!apiKey) {
    return {
      success: false,
      content: null,
      error: 'API key no configurada para Google AI',
      provider: 'google',
    };
  }

  try {
    // Convertir mensajes al formato de Gemini
    const contents = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : msg.role,
      parts: [{ text: msg.content }]
    }));

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const url = `${baseUrl}/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4096,
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google AI error ${response.status}: ${error}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return {
      success: true,
      content,
      model,
      provider: 'google',
    };
  } catch (error) {
    console.error(`[AI Provider] Error with google:`, error);
    return {
      success: false,
      content: null,
      error: (error as Error).message,
      provider: 'google',
    };
  }
}

function getApiKeyEnvName(provider: AIProvider): string {
  switch (provider) {
    case 'openrouter': return 'OPENROUTER_API_KEY';
    case 'groq': return 'GROQ_API_KEY';
    case 'custom': return 'CUSTOM_AI_API_KEY';
    default: return '';
  }
}

/**
 * Verificar estado del proveedor de IA
 */
export async function checkProviderStatus(provider: AIProvider): Promise<{ available: boolean; error?: string; model?: string }> {
  const config = getConfigFromEnv();

  if (config.provider !== provider) {
    return { available: false, error: `Proveedor ${provider} no está activo` };
  }

  if (provider !== 'ollama' && !config.apiKey) {
    return { available: false, error: 'API key no configurada' };
  }

  try {
    if (provider === 'ollama') {
      const response = await fetch(`${config.baseUrl}/api/tags`, { method: 'GET' });
      if (!response.ok) throw new Error('Ollama no responde');
      return { available: true, model: config.model };
    } else {
      // Para APIs tipo OpenAI, verificar con una llamada simple
      const response = await fetch(`${config.baseUrl}/models`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${config.apiKey}` },
      });
      if (!response.ok) throw new Error('API no responde');
      return { available: true, model: config.model };
    }
  } catch (error) {
    return { available: false, error: (error as Error).message, model: config.model };
  }
}
