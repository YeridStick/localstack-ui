// Servicio de IA usando OpenRouter API
// Alternativa a Ollama con modelos gratuitos de OpenRouter

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const DEFAULT_FREE_MODEL = 'google/gemini-2.0-flash-exp:free';

// Lista de modelos gratuitos recomendados
export const FREE_MODELS = [
  { id: 'google/gemini-2.0-flash-exp:free', name: 'Gemini 2.0 Flash', provider: 'Google', description: 'Rápido y versátil' },
  { id: 'meta-llama/llama-3.1-8b-instruct:free', name: 'Llama 3.1 8B', provider: 'Meta', description: 'Buen balance calidad/velocidad' },
  { id: 'mistralai/mistral-7b-instruct:free', name: 'Mistral 7B', provider: 'Mistral', description: 'Especializado en instrucciones' },
  { id: 'qwen/qwen-2.5-7b-instruct:free', name: 'Qwen 2.5 7B', provider: 'Alibaba', description: 'Excelente para código' },
  { id: 'huggingfaceh4/zephyr-7b-beta:free', name: 'Zephyr 7B', provider: 'HuggingFace', description: 'Optimizado para chat' },
];

export interface OpenRouterConfig {
  apiKey: string;
  model?: string;
  httpReferer?: string;
  siteTitle?: string;
  timeoutMs?: number;
}

function getConfig(): OpenRouterConfig {
  return {
    apiKey: process.env.OPENROUTER_API_KEY || '',
    model: process.env.OPENROUTER_MODEL || DEFAULT_FREE_MODEL,
    httpReferer: process.env.OPENROUTER_HTTP_REFERER || 'http://localhost:4563',
    siteTitle: process.env.OPENROUTER_SITE_TITLE || 'LocalStack UI',
    timeoutMs: parseInt(process.env.OPENROUTER_TIMEOUT_MS || '60000', 10),
  };
}

/**
 * Verificar si OpenRouter está configurado y disponible
 */
export async function checkOpenRouterStatus(): Promise<{ available: boolean; error?: string; model?: string }> {
  const config = getConfig();

  if (!config.apiKey) {
    return { available: false, error: 'OPENROUTER_API_KEY no configurada' };
  }

  try {
    const response = await fetch(`${OPENROUTER_BASE_URL}/models`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'HTTP-Referer': config.httpReferer || '',
        'X-OpenRouter-Title': config.siteTitle || '',
      },
    });

    if (!response.ok) {
      return { available: false, error: `Error ${response.status}: ${response.statusText}` };
    }

    return { available: true, model: config.model };
  } catch (error) {
    return { available: false, error: (error as Error).message };
  }
}

/**
 * Enviar mensaje a OpenRouter
 */
export async function sendMessageToOpenRouter(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    responseFormat?: { type: 'json_object' };
  }
): Promise<{ success: boolean; content?: string; error?: string; usage?: unknown }> {
  const config = getConfig();

  if (!config.apiKey) {
    return { success: false, error: 'OPENROUTER_API_KEY no configurada. Obtén una en https://openrouter.ai/keys' };
  }

  const model = options?.model || config.model || DEFAULT_FREE_MODEL;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs || 60000);

    const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
        'HTTP-Referer': config.httpReferer || '',
        'X-OpenRouter-Title': config.siteTitle || '',
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 4096,
        ...(options?.responseFormat && { response_format: options.responseFormat }),
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData.error?.message || errorData.message || `Error ${response.status}: ${response.statusText}`;
      return { success: false, error: errorMsg };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    return {
      success: true,
      content: content,
      usage: data.usage,
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { success: false, error: 'Timeout: OpenRouter no respondió a tiempo' };
    }
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Generar JSON estructurado usando OpenRouter
 */
export async function generateJSONWithOpenRouter<T>(
  systemPrompt: string,
  userPrompt: string,
  options?: { model?: string; temperature?: number }
): Promise<{ success: boolean; data?: T; error?: string }> {
  const result = await sendMessageToOpenRouter(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    {
      ...options,
      responseFormat: { type: 'json_object' },
      temperature: options?.temperature ?? 0.3,
    }
  );

  if (!result.success || !result.content) {
    return { success: false, error: result.error };
  }

  try {
    // Intentar extraer JSON si está envuelto en markdown
    let jsonStr = result.content.trim();
    const jsonMatch = jsonStr.match(/```json\s*([\s\S]*?)```/) ||
                      jsonStr.match(/```\s*([\s\S]*?)```/) ||
                      jsonStr.match(/(\{[\s\S]*\})/);

    if (jsonMatch) {
      jsonStr = jsonMatch[1] || jsonMatch[0];
    }

    const data = JSON.parse(jsonStr) as T;
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: `Error parseando JSON: ${(error as Error).message}. Content: ${result.content?.substring(0, 200)}`,
    };
  }
}

/**
 * Wrapper compatible con la interfaz de aiService.ts
 */
export async function sendMessage(
  message: string,
  context?: string,
  options?: { model?: string; temperature?: number }
): Promise<{ success: boolean; response?: string; error?: string }> {
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];

  if (context) {
    messages.push({ role: 'system', content: context });
  }

  messages.push({ role: 'user', content: message });

  const result = await sendMessageToOpenRouter(messages, options);

  return {
    success: result.success,
    response: result.content,
    error: result.error,
  };
}
