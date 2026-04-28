// Servicio de IA para diseño de pipelines CI/CD
// Usa el servicio unificado: Ollama, OpenRouter, Groq, o Custom

import { sendMessageWithProvider, getConfigFromEnv, AIMessage, AIProviderConfig } from './aiProviderService';

export interface PipelineConfig {
  projectName: string;
  repoType: 'github' | 'gitlab' | 'codecommit' | 'bitbucket';
  techStack: string;
  deploymentStrategy: 'rolling' | 'bluegreen' | 'canary' | 'recreate';
  deploymentType?: 'ecs' | 'lambda' | 'ec2';
  environments: string[];
  needsApprovals: boolean;
  needsFeatureFlags: boolean;
  needsDocker?: boolean;
  selectedTools: {
    build: string;
    deploy: string;
    security: string;
  };
  runTests: boolean;
  runSecurityScan: boolean;
  notifyOnFailure: boolean;
  enableRollback: boolean;
  // Campos personalizables adicionales
  useECR?: boolean;
  ecrRepository?: string;
  jarPath?: string;
  dockerfilePath?: string;
  envVariables?: Record<string, string>;
  additionalBuildArgs?: string[];
}

export interface PipelineStage {
  name: string;
  steps: string[];
  tools: string[];
}

export interface PipelineResult {
  stages: PipelineStage[];
  analysis: string;
  template: string | object | null;
  config: PipelineConfig;
}

export interface PipelineAnalysis {
  success: boolean;
  analysis: string | null;
  error?: string;
  infrastructure?: unknown;
  projectConfig?: PipelineConfig;
  stages?: PipelineStage[];
  template?: string | object | null;
  config?: PipelineConfig;
}

const PIPELINE_CONTEXT = `
Eres un experto en DevOps y CI/CD especializado en AWS.
Tu tarea es diseñar pipelines de despliegue completos y optimizados.

Debes generar pipelines que incluyan:
1. Build stage (compilación, tests, linting)
2. Security scans (SAST, DAST, dependency check)
3. Artifact management (ECR, S3)
4. Deploy stages (dev → staging → prod)
5. Rollback mechanisms
6. Notifications y alerting

Herramientas disponibles:
- AWS CodePipeline (nativo)
- AWS CodeBuild (nativo)
- GitHub Actions
- GitLab CI
- Jenkins
- ArgoCD (GitOps)
- AWS CodeDeploy
- AWS CloudFormation / Terraform

Para cada pipeline debes:
- Justificar elección de herramientas
- Incluir templates YAML/JSON listos para usar
- Definir estrategia de despliegue (rolling, blue/green, canary)
- Configurar triggers apropiados
- Incluir aprobaciones manuales para producción
- Definir rollback automático

El pipeline debe integrarse automáticamente con la infraestructura proporcionada.
`;

/**
 * Diseñar pipeline CI/CD basado en infraestructura y requisitos
 */
export async function designPipeline(
  infrastructure: unknown,
  projectConfig: PipelineConfig,
  aiConfig?: AIProviderConfig
): Promise<PipelineAnalysis> {
  const prompt = `Diseña un pipeline CI/CD completo para este proyecto:

INFRAESTRUCTURA ACTUAL:
${JSON.stringify(infrastructure, null, 2)}

CONFIGURACIÓN DEL PROYECTO:
- Tipo de aplicación: ${projectConfig.techStack}
- Stack tecnológico: ${projectConfig.techStack}
- Repositorio: ${projectConfig.repoType}
- Necesita aprobaciones manuales: ${projectConfig.needsApprovals ? 'Sí' : 'No'}
- Estrategia de despliegue preferida: ${projectConfig.deploymentStrategy}
- Entornos requeridos: ${projectConfig.environments.join(', ')}
- Necesita feature flags: ${projectConfig.needsFeatureFlags ? 'Sí' : 'No'}

Genera:
1. PIPELINE_CONFIG: Configuración completa del pipeline
2. STAGES: Lista detallada de etapas
3. TEMPLATES: Archivos YAML/JSON listos para usar
4. INTEGRATION: Cómo integra con la infraestructura existente
5. SECURITY: Medidas de seguridad incluidas
6. ROLLBACK: Estrategia de rollback

Responde en formato estructurado.`;

  try {
    const config = aiConfig || getConfigFromEnv();
    const messages: AIMessage[] = [
      { role: 'system', content: PIPELINE_CONTEXT },
      { role: 'user', content: prompt }
    ];

    // Usar el modelo configurado en el servidor
    const serverModel = config.model || 'llama-3.3-70b-versatile';
    console.log(`[PipelineService] Using provider: ${config.provider}, model: ${serverModel}`);

    const aiResponse = await sendMessageWithProvider(messages, config);

    if (!aiResponse.success) {
      return {
        success: false,
        error: aiResponse.error || 'Error generating pipeline',
        stages: [],
        analysis: null,
        template: null,
        config: projectConfig,
      };
    }

    return {
      success: true,
      stages: [],
      analysis: aiResponse.content || '',
      template: null,
      config: projectConfig,
    };
  } catch (error) {
    console.error('[PipelineService] Error:', error);
    return {
      success: false,
      error: (error as Error).message,
      stages: [],
      analysis: null,
      template: null,
      config: projectConfig,
    };
  }
}

/**
 * Generar plantilla CodePipeline nativo de AWS
 */
export function generateCodePipelineTemplate(config: Partial<PipelineConfig> & { accountId?: string }): object {
  return {
    AWSTemplateFormatVersion: '2010-09-09',
    Description: `Pipeline CI/CD for ${config.projectName}`,
    Resources: {
      CodePipeline: {
        Type: 'AWS::CodePipeline::Pipeline',
        Properties: {
          Name: `${config.projectName}-pipeline`,
          RoleArn: { 'Fn::GetAtt': ['PipelineRole', 'Arn'] },
          ArtifactStore: {
            Type: 'S3',
            Location: { Ref: 'ArtifactBucket' }
          },
          Stages: [
            {
              Name: 'Source',
              Actions: [{
                Name: 'Source',
                ActionTypeId: {
                  Category: 'Source',
                  Owner: 'ThirdParty',
                  Provider: config.repoType === 'github' ? 'GitHub' : 'GitLab',
                  Version: '1'
                },
                Configuration: {
                  Owner: '{{resolve:secretsmanager:repo-owner:SecretString:owner}}',
                  Repo: config.projectName,
                  Branch: 'main',
                  OAuthToken: '{{resolve:secretsmanager:github-token:SecretString:token}}'
                },
                OutputArtifacts: [{ Name: 'SourceCode' }]
              }]
            },
            {
              Name: 'Build',
              Actions: [{
                Name: 'BuildAndTest',
                ActionTypeId: {
                  Category: 'Build',
                  Owner: 'AWS',
                  Provider: 'CodeBuild',
                  Version: '1'
                },
                Configuration: {
                  ProjectName: { Ref: 'CodeBuildProject' }
                },
                InputArtifacts: [{ Name: 'SourceCode' }],
                OutputArtifacts: [{ Name: 'BuildOutput' }]
              }]
            },
            {
              Name: 'Deploy-Dev',
              Actions: [{
                Name: 'DeployToDev',
                ActionTypeId: {
                  Category: 'Deploy',
                  Owner: 'AWS',
                  Provider: config.selectedTools?.deploy === 'ecs_deploy' ? 'ECS' : 'CloudFormation',
                  Version: '1'
                },
                Configuration: {
                  ClusterName: `${config.projectName}-dev`,
                  ServiceName: config.projectName,
                  FileName: 'imagedefinitions.json'
                },
                InputArtifacts: [{ Name: 'BuildOutput' }]
              }]
            },
            ...(config.needsApprovals ? [{
              Name: 'Approval',
              Actions: [{
                Name: 'ManualApproval',
                ActionTypeId: {
                  Category: 'Approval',
                  Owner: 'AWS',
                  Provider: 'Manual',
                  Version: '1'
                },
                Configuration: {
                  CustomData: 'Aprobación para desplegar a producción'
                }
              }]
            }] : []),
            {
              Name: 'Deploy-Prod',
              Actions: [{
                Name: 'DeployToProd',
                ActionTypeId: {
                  Category: 'Deploy',
                  Owner: 'AWS',
                  Provider: config.selectedTools?.deploy === 'ecs_deploy' ? 'ECS' : 'CloudFormation',
                  Version: '1'
                },
                Configuration: {
                  ClusterName: `${config.projectName}-prod`,
                  ServiceName: config.projectName,
                  FileName: 'imagedefinitions.json'
                },
                InputArtifacts: [{ Name: 'BuildOutput' }]
              }]
            }
          ]
        }
      },
      CodeBuildProject: {
        Type: 'AWS::CodeBuild::Project',
        Properties: {
          Name: `${config.projectName}-build`,
          ServiceRole: { 'Fn::GetAtt': ['CodeBuildRole', 'Arn'] },
          Artifacts: { Type: 'CODEPIPELINE' },
          Environment: {
            Type: 'LINUX_CONTAINER',
            ComputeType: 'BUILD_GENERAL1_SMALL',
            Image: 'aws/codebuild/standard:5.0',
            PrivilegedMode: config.needsDocker || false
          },
          Source: { Type: 'CODEPIPELINE' }
        }
      },
      ArtifactBucket: {
        Type: 'AWS::S3::Bucket',
        Properties: {
          BucketName: `${config.projectName}-artifacts-${config.accountId || '123456789'}`,
          VersioningConfiguration: { Status: 'Enabled' },
          LifecycleConfiguration: {
            Rules: [{
              Id: 'DeleteOldArtifacts',
              Status: 'Enabled',
              ExpirationInDays: 30
            }]
          }
        }
      }
    }
  };
}

/**
 * Generar GitHub Actions workflow
 */
export function generateGitHubActionsWorkflow(config: Partial<PipelineConfig> & { region?: string; ecrRepository?: string }): string {
  const workflow = {
    name: `${config.projectName} CI/CD`,
    on: {
      push: { branches: ['main', 'develop'] },
      pull_request: { branches: ['main'] }
    },
    jobs: {
      test: {
        'runs-on': 'ubuntu-latest',
        steps: [
          { uses: 'actions/checkout@v4' },
          {
            name: 'Setup Node.js',
            uses: 'actions/setup-node@v4',
            with: { 'node-version': '20', cache: 'npm' }
          },
          { run: 'npm ci' },
          { run: 'npm run lint' },
          { run: 'npm test' },
          { name: 'Security audit', run: 'npm audit --audit-level=moderate' }
        ]
      },
      build: {
        needs: 'test',
        'runs-on': 'ubuntu-latest',
        steps: [
          { uses: 'actions/checkout@v4' },
          {
            name: 'Configure AWS credentials',
            uses: 'aws-actions/configure-aws-credentials@v4',
            with: {
              'aws-access-key-id': '${{ secrets.AWS_ACCESS_KEY_ID }}',
              'aws-secret-access-key': '${{ secrets.AWS_SECRET_ACCESS_KEY }}',
              'aws-region': config.region || 'us-east-1'
            }
          },
          { name: 'Login to Amazon ECR', uses: 'aws-actions/amazon-ecr-login@v2' },
          {
            name: 'Build, tag, and push image',
            run: `docker build -t ${config.ecrRepository || config.projectName}:\${{ github.sha }} .\ndocker push ${config.ecrRepository || config.projectName}:\${{ github.sha }}`
          }
        ]
      },
      deployDev: {
        needs: 'build',
        if: "github.ref == 'refs/heads/develop'",
        'runs-on': 'ubuntu-latest',
        environment: 'development',
        steps: [
          { uses: 'actions/checkout@v4' },
          {
            name: 'Deploy to Dev',
            run: `aws ecs update-service --cluster ${config.projectName}-dev --service ${config.projectName} --force-new-deployment`
          }
        ]
      },
      deployProd: {
        needs: 'build',
        if: "github.ref == 'refs/heads/main'",
        'runs-on': 'ubuntu-latest',
        environment: 'production',
        steps: [
          { uses: 'actions/checkout@v4' },
          {
            name: 'Deploy to Production',
            run: `aws ecs update-service --cluster ${config.projectName}-prod --service ${config.projectName} --force-new-deployment`
          }
        ]
      }
    }
  };

  return yamlStringify(workflow);
}

/**
 * Generar GitLab CI pipeline
 */
export function generateGitLabCI(config: Partial<PipelineConfig>): string {
  return `stages:
  - test
  - build
  - security
  - deploy

test:
  stage: test
  image: node:20-alpine
  script:
    - npm ci
    - npm run lint
    - npm test
    - npm run coverage
  coverage: '/All files[^|]*|[^|]*\\s*(\\d+\\.\\d+)/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml

build:
  stage: build
  image: docker:latest
  services:
    - docker:dind
  script:
    - docker build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA .
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
  only:
    - main
    - develop

security_scan:
  stage: security
  image: returntocorp/semgrep
  script:
    - semgrep --config=auto --json --output=semgrep-report.json
  artifacts:
    reports:
      sast: semgrep-report.json
  allow_failure: true

deploy_dev:
  stage: deploy
  script:
    - aws ecs update-service --cluster dev --service ${config.projectName} --force-new-deployment
  environment:
    name: development
  only:
    - develop

deploy_prod:
  stage: deploy
  script:
    - aws ecs update-service --cluster prod --service ${config.projectName} --force-new-deployment
  environment:
    name: production
  when: manual
  only:
    - main
`;
}

/**
 * Convertir objeto a YAML string (simplificado)
 */
function yamlStringify(obj: unknown, indent = 0): string {
  const spaces = '  '.repeat(indent);
  let yaml = '';

  if (obj === null || obj === undefined) return '';

  if (Array.isArray(obj)) {
    obj.forEach(item => {
      if (typeof item === 'object' && item !== null) {
        yaml += `${spaces}- ${yamlStringify(item, indent + 1).trimStart()}`;
      } else {
        yaml += `${spaces}- ${item}\n`;
      }
    });
    return yaml;
  }

  if (typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined) continue;

      if (Array.isArray(value)) {
        yaml += `${spaces}${key}:\n`;
        value.forEach(item => {
          if (typeof item === 'object' && item !== null) {
            yaml += `${spaces}- ${yamlStringify(item, indent + 1).trimStart()}`;
          } else {
            yaml += `${spaces}- ${item}\n`;
          }
        });
      } else if (typeof value === 'object') {
        yaml += `${spaces}${key}:\n${yamlStringify(value, indent + 1)}`;
      } else if (typeof value === 'string' && value.includes('\n')) {
        yaml += `${spaces}${key}: |\n${value.split('\n').map(l => spaces + '  ' + l).join('\n')}\n`;
      } else {
        yaml += `${spaces}${key}: ${value}\n`;
      }
    }
  }

  return yaml;
}

// Configuraciones predefinidas por tipo de proyecto
export const PIPELINE_TEMPLATES: Record<string, { buildTool: string; testCommand: string; lintCommand: string; needsDocker: boolean; jarPath: string; dockerfilePath: string; defaultBuildArgs: string[] }> = {
  nodejs: {
    buildTool: 'npm',
    testCommand: 'npm test',
    lintCommand: 'npm run lint',
    needsDocker: false,
    jarPath: '',
    dockerfilePath: 'Dockerfile',
    defaultBuildArgs: []
  },
  python: {
    buildTool: 'pip',
    testCommand: 'pytest',
    lintCommand: 'flake8',
    needsDocker: true,
    jarPath: '',
    dockerfilePath: 'Dockerfile',
    defaultBuildArgs: []
  },
  'java-maven': {
    buildTool: 'maven',
    testCommand: 'mvn test',
    lintCommand: 'mvn checkstyle:check',
    needsDocker: true,
    jarPath: 'target/*.jar',
    dockerfilePath: 'Dockerfile',
    defaultBuildArgs: ['-DskipTests=false']
  },
  'java-gradle': {
    buildTool: 'gradle',
    testCommand: './gradlew test',
    lintCommand: './gradlew check',
    needsDocker: true,
    jarPath: 'build/libs/*.jar',
    dockerfilePath: 'Dockerfile',
    defaultBuildArgs: ['--no-daemon']
  },
  java: {
    buildTool: 'maven',
    testCommand: 'mvn test',
    lintCommand: 'mvn checkstyle:check',
    needsDocker: true,
    jarPath: 'target/*.jar',
    dockerfilePath: 'Dockerfile',
    defaultBuildArgs: ['-DskipTests=false']
  },
  docker: {
    buildTool: 'docker',
    testCommand: 'docker build --target test .',
    lintCommand: 'hadolint Dockerfile',
    needsDocker: true,
    jarPath: '',
    dockerfilePath: 'Dockerfile',
    defaultBuildArgs: []
  }
};
