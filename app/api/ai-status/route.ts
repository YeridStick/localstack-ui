import { NextResponse } from 'next/server';

export async function GET() {
  const config = {
    AI_PROVIDER: process.env.AI_PROVIDER || 'hybrid',
    HYBRID_TIMEOUT_MS: process.env.HYBRID_TIMEOUT_MS || '8000',
    OPENROUTER_API_KEY_EXISTS: !!process.env.OPENROUTER_API_KEY,
    OPENROUTER_MODEL: process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-exp:free',
    OPENROUTER_TIMEOUT_MS: process.env.OPENROUTER_TIMEOUT_MS || '60000',
    OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL || 'http://host.docker.internal:11434',
    OLLAMA_MODEL: process.env.OLLAMA_MODEL || 'gemma4:e4b',
  };

  return NextResponse.json({
    success: true,
    config,
    message: config.OPENROUTER_API_KEY_EXISTS 
      ? '✅ OpenRouter API key configurada' 
      : '❌ OpenRouter API key NO configurada. Agrega OPENROUTER_API_KEY a tu ecr-real.env'
  });
}
