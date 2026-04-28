import { NextResponse } from 'next/server';
import { checkProviderStatus, getConfigFromEnv, AIProvider } from '@/lib/ai/aiProviderService';

export async function GET() {
  try {
    const config = getConfigFromEnv();
    const status = await checkProviderStatus(config.provider);

    return NextResponse.json({
      success: true,
      provider: config.provider,
      model: config.model,
      ...status,
      config: {
        baseUrl: config.baseUrl,
        timeoutMs: config.timeoutMs,
        apiKeyConfigured: !!config.apiKey,
      }
    });
  } catch (error) {
    console.error('[AI Status] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: (error as Error).message,
        provider: process.env.AI_PROVIDER || 'unknown',
        available: false 
      },
      { status: 500 }
    );
  }
}
