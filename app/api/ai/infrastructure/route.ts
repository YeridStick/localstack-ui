import { NextRequest, NextResponse } from 'next/server';
import { analyzeInfrastructure, type Diagram } from '@/lib/ai/infraDesignerService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { requirements, model } = body;

    console.log('[API Infrastructure] Received request:', {
      requirementsLength: requirements?.length,
      AI_PROVIDER: process.env.AI_PROVIDER,
      OPENROUTER_API_KEY_EXISTS: !!process.env.OPENROUTER_API_KEY
    });

    const result = await analyzeInfrastructure(requirements, model);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to analyze infrastructure' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      analysis: result.analysis,
      diagram: result.diagram,
    });
  } catch (error) {
    console.error('[API Infrastructure] Error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
