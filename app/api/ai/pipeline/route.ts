import { NextRequest, NextResponse } from 'next/server';
import { designPipeline, generateCodePipelineTemplate, type PipelineConfig } from '@/lib/ai/pipelineService';
import { currentSettings } from '@/app/api/ai/settings/route';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { infrastructure, projectConfig, model } = body;

    console.log('[API Pipeline] Received request:', {
      projectName: projectConfig?.projectName,
      techStack: projectConfig?.techStack,
      AI_PROVIDER: currentSettings.provider,
      AI_MODEL: currentSettings.model,
      API_KEY_EXISTS: !!currentSettings.apiKey
    });

    // Ignorar modelo del frontend, usar el configurado en el servidor
    const result = await designPipeline(infrastructure, projectConfig, currentSettings);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to design pipeline' },
        { status: 500 }
      );
    }

    // Generate template if needed
    let template = null;
    if (projectConfig?.repoType === 'codecommit') {
      template = generateCodePipelineTemplate(projectConfig);
    }

    return NextResponse.json({
      success: true,
      analysis: result.analysis,
      template,
      config: projectConfig
    });
  } catch (error) {
    console.error('[API Pipeline] Error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
