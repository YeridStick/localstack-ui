import { NextRequest, NextResponse } from 'next/server';
import { AIProviderConfig } from '@/lib/ai/aiProviderService';
import { currentSettings, updateSettings } from '@/lib/ai/aiSettings';

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
    updateSettings(newSettings);

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
