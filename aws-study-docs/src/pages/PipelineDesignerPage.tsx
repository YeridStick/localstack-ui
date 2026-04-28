import { useState } from 'react'
import {
  GitBranch,
  Play,
  Check,
  Loader2,
  Copy,
  Download,
  Cloud,
  Github,
  Gitlab,
  ChevronRight,
  ChevronDown,
  RotateCcw,
  FileCode,
  ArrowRight,
  Sparkles
} from 'lucide-react'
import { designPipeline, generateCodePipelineTemplate, generateGitHubActionsWorkflow, type PipelineConfig, type PipelineResult } from '../services/pipelineService'
import './PipelineDesigner.css'

const REPO_TYPES = [
  { id: 'github', label: 'GitHub', icon: Github, description: 'GitHub Actions + Webhooks' },
  { id: 'gitlab', label: 'GitLab', icon: Gitlab, description: 'GitLab CI/CD nativo' },
  { id: 'codecommit', label: 'AWS CodeCommit', icon: Cloud, description: 'CodePipeline nativo' },
  { id: 'bitbucket', label: 'Bitbucket', icon: GitBranch, description: 'Bitbucket Pipelines' }
]

const TECH_STACKS = [
  { id: 'nodejs', label: 'Node.js', description: 'npm, jest, esbuild' },
  { id: 'python', label: 'Python', description: 'pip, pytest, docker' },
  { id: 'java', label: 'Java / Maven', description: 'maven, junit, jib' },
  { id: 'dotnet', label: '.NET Core', description: 'nuget, xunit, dotnet cli' },
  { id: 'go', label: 'Go', description: 'go modules, testing, ko' },
  { id: 'docker', label: 'Docker Multi-stage', description: 'Container-first approach' }
]

const DEPLOYMENT_STRATEGIES = [
  { id: 'rolling', label: 'Rolling Update', description: 'Reemplazo gradual de instancias' },
  { id: 'bluegreen', label: 'Blue/Green', description: 'Despliegue paralelo con switch' },
  { id: 'canary', label: 'Canary', description: 'Tráfico gradual al nuevo deploy' },
  { id: 'recreate', label: 'Recreate', description: 'Detener y recrear (downtime)' }
]

const TOOLS = {
  build: [
    { id: 'codebuild', label: 'AWS CodeBuild', provider: 'aws' },
    { id: 'github_actions', label: 'GitHub Actions', provider: 'github' },
    { id: 'gitlab_ci', label: 'GitLab CI', provider: 'gitlab' },
    { id: 'jenkins', label: 'Jenkins', provider: 'selfhosted' }
  ],
  deploy: [
    { id: 'codedeploy', label: 'AWS CodeDeploy', provider: 'aws' },
    { id: 'ecs_deploy', label: 'ECS Rolling Update', provider: 'aws' },
    { id: 'lambda_deploy', label: 'Lambda Update', provider: 'aws' },
    { id: 'argocd', label: 'ArgoCD (GitOps)', provider: 'kubernetes' }
  ],
  security: [
    { id: 'codeguru', label: 'CodeGuru Reviewer', provider: 'aws' },
    { id: 'secrets_manager', label: 'Secrets Manager', provider: 'aws' },
    { id: 'snyk', label: 'Snyk', provider: 'thirdparty' },
    { id: 'semgrep', label: 'Semgrep', provider: 'opensource' }
  ]
}

const ENVIRONMENTS = [
  { id: 'dev', label: 'Development', autoDeploy: true },
  { id: 'staging', label: 'Staging', autoDeploy: true },
  { id: 'prod', label: 'Production', autoDeploy: false, needsApproval: true }
]

export function PipelineDesignerPage() {
  const [step, setStep] = useState(0)
  const [isDesigning, setIsDesigning] = useState(false)
  const [pipelineConfig, setPipelineConfig] = useState<PipelineResult | null>(null)
  const [activeTab, setActiveTab] = useState<'visual' | 'yaml'>('visual')
  const [expandedStage, setExpandedStage] = useState<string | null>(null)

  const [config, setConfig] = useState<PipelineConfig>({
    projectName: 'my-app',
    repoType: 'github',
    techStack: 'nodejs',
    deploymentStrategy: 'rolling',
    environments: ['dev', 'staging', 'prod'],
    needsApprovals: true,
    needsFeatureFlags: false,
    selectedTools: {
      build: 'github_actions',
      deploy: 'ecs_deploy',
      security: 'semgrep'
    },
    runTests: true,
    runSecurityScan: true,
    notifyOnFailure: true,
    enableRollback: true
  })

  const updateConfig = (key: keyof PipelineConfig, value: unknown) => {
    setConfig(prev => ({ ...prev, [key]: value }))
  }

  const updateTool = (category: 'build' | 'deploy' | 'security', toolId: string) => {
    setConfig(prev => ({
      ...prev,
      selectedTools: { ...prev.selectedTools, [category]: toolId }
    }))
  }

  const generatePipeline = async () => {
    setIsDesigning(true)

    const result = await designPipeline(
      { nodes: [], connections: [] },
      config
    )

    if (result.success) {
      const parsed = parsePipelineAnalysis(result.analysis || '', config)
      setPipelineConfig(parsed)
    }

    setIsDesigning(false)
    setStep(2)
  }

  const parsePipelineAnalysis = (analysis: string, userConfig: PipelineConfig): PipelineResult => {
    const stages: PipelineResult['stages'] = []
    const lines = analysis.split('\n')
    let currentStage: PipelineResult['stages'][0] | null = null

    lines.forEach(line => {
      const trimmed = line.trim()
      if (trimmed.match(/^\d+\./) || trimmed.startsWith('Stage')) {
        if (currentStage) stages.push(currentStage)
        currentStage = {
          name: trimmed.replace(/^\d+\.\s*/, '').replace(/:$/, ''),
          steps: [],
          tools: []
        }
      } else if (currentStage && trimmed.startsWith('-')) {
        currentStage.steps.push(trimmed.replace(/^-\s*/, ''))
      }
    })

    if (currentStage) stages.push(currentStage)

    let template: string | object | null = null
    if (userConfig.selectedTools.build === 'github_actions') {
      template = generateGitHubActionsWorkflow({
        projectName: userConfig.projectName,
        deploymentType: 'ecs',
        needsDocker: true,
        region: 'us-east-1',
        ecrRepository: `${userConfig.projectName}-repo`
      })
    } else if (userConfig.selectedTools.build === 'codebuild') {
      template = generateCodePipelineTemplate({
        projectName: userConfig.projectName,
        repoType: userConfig.repoType,
        deploymentType: 'ecs',
        needsDocker: true
      })
    }

    return {
      stages: stages.length > 0 ? stages : generateDefaultStages(userConfig),
      analysis: analysis,
      template: template,
      config: userConfig
    }
  }

  const generateDefaultStages = (cfg: PipelineConfig): PipelineResult['stages'] => [
    {
      name: 'Source',
      steps: [
        `Checkout from ${cfg.repoType}`,
        'Validate branch protection rules',
        'Scan for secrets (truffleHog)'
      ],
      tools: [cfg.repoType, 'trufflehog']
    },
    {
      name: 'Build',
      steps: [
        `Install dependencies (${cfg.techStack})`,
        'Run linting',
        'Compile/Bundle',
        ...(cfg.runTests ? ['Run unit tests'] : []),
        'Build Docker image',
        'Push to registry'
      ],
      tools: [cfg.selectedTools.build, 'docker']
    },
    {
      name: 'Security',
      steps: [
        ...(cfg.runSecurityScan ? ['SAST scan'] : []),
        'Dependency vulnerability check',
        'Container image scan (Trivy)',
        'Generate SBOM'
      ],
      tools: [cfg.selectedTools.security, 'trivy']
    },
    {
      name: 'Deploy Dev',
      steps: [
        'Update task definition',
        `Deploy to ECS (${cfg.deploymentStrategy})`,
        'Run smoke tests',
        'Notify team'
      ],
      tools: [cfg.selectedTools.deploy, 'aws']
    },
    {
      name: 'Deploy Staging',
      steps: [
        'Integration tests',
        'Performance tests',
        'E2E tests (Cypress)'
      ],
      tools: ['cypress', 'k6']
    },
    {
      name: 'Deploy Production',
      steps: [
        ...(cfg.needsApprovals ? ['Manual approval required'] : []),
        'Blue/Green deployment',
        'Traffic shift (10% → 50% → 100%)',
        'Rollback on failure'
      ],
      tools: [cfg.selectedTools.deploy, 'cloudwatch']
    }
  ]

  const copyTemplate = () => {
    if (!pipelineConfig?.template) return
    const content = typeof pipelineConfig.template === 'string'
      ? pipelineConfig.template
      : JSON.stringify(pipelineConfig.template, null, 2)
    navigator.clipboard.writeText(content)
  }

  const downloadTemplate = () => {
    if (!pipelineConfig?.template) return

    const content = typeof pipelineConfig.template === 'string'
      ? pipelineConfig.template
      : JSON.stringify(pipelineConfig.template, null, 2)

    const isYaml = typeof pipelineConfig.template === 'string' || config.selectedTools.build === 'github_actions'
    const extension = isYaml ? 'yml' : 'json'
    const filename = `pipeline-${config.selectedTools.build}.${extension}`

    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="architecture-page pipeline-designer animate-fade-in">
      <header className="page-header">
        <div className="page-title-row">
          <h1><Sparkles size={28} /> Pipeline Designer AI</h1>
        </div>
        <p className="page-subtitle">
          Diseña pipelines CI/CD completos con asistencia de IA. 
          Genera templates para GitHub Actions, GitLab CI, CodePipeline, y más.
        </p>
        <div className="page-badges">
          <span className="badge r">[REUTILIZABLE] Templates listos para usar</span>
          <span className="badge c">[CRITICO] Requiere Ollama corriendo localmente</span>
        </div>
      </header>

      {step === 0 && (
        <section className="page-section">
          <h2>Configuración del Pipeline</h2>

          <div className="form-group">
            <label>Nombre del proyecto</label>
            <input
              type="text"
              value={config.projectName}
              onChange={(e) => updateConfig('projectName', e.target.value)}
              placeholder="my-awesome-app"
            />
          </div>

          <div className="form-group">
            <label>Tipo de repositorio</label>
            <div className="repo-types-grid">
              {REPO_TYPES.map(repo => {
                const Icon = repo.icon
                const isSelected = config.repoType === repo.id
                return (
                  <button
                    key={repo.id}
                    onClick={() => updateConfig('repoType', repo.id)}
                    className={`repo-card ${isSelected ? 'selected' : ''}`}
                  >
                    <Icon size={24} />
                    <div className="repo-label">{repo.label}</div>
                    <div className="repo-desc">{repo.description}</div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="form-group">
            <label>Stack tecnológico</label>
            <div className="tech-stack-grid">
              {TECH_STACKS.map(stack => {
                const isSelected = config.techStack === stack.id
                return (
                  <button
                    key={stack.id}
                    onClick={() => updateConfig('techStack', stack.id)}
                    className={`tech-card ${isSelected ? 'selected' : ''}`}
                  >
                    <div className="tech-label">{stack.label}</div>
                    <div className="tech-desc">{stack.description}</div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="wizard-footer">
            <button onClick={() => setStep(1)} className="btn btn-primary">
              Siguiente <ArrowRight size={18} />
            </button>
          </div>
        </section>
      )}

      {step === 1 && (
        <section className="page-section">
          <h2>Herramientas y Etapas</h2>

          <div className="tools-section">
            <div className="tool-category">
              <h4>Build</h4>
              <div className="tool-options">
                {TOOLS.build.map(tool => {
                  const isSelected = config.selectedTools.build === tool.id
                  return (
                    <button
                      key={tool.id}
                      onClick={() => updateTool('build', tool.id)}
                      className={`tool-option ${isSelected ? 'selected' : ''}`}
                    >
                      <span className={`tool-provider ${tool.provider}`} />
                      {tool.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="tool-category">
              <h4>Deploy</h4>
              <div className="tool-options">
                {TOOLS.deploy.map(tool => {
                  const isSelected = config.selectedTools.deploy === tool.id
                  return (
                    <button
                      key={tool.id}
                      onClick={() => updateTool('deploy', tool.id)}
                      className={`tool-option ${isSelected ? 'selected' : ''}`}
                    >
                      <span className={`tool-provider ${tool.provider}`} />
                      {tool.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="tool-category">
              <h4>Security</h4>
              <div className="tool-options">
                {TOOLS.security.map(tool => {
                  const isSelected = config.selectedTools.security === tool.id
                  return (
                    <button
                      key={tool.id}
                      onClick={() => updateTool('security', tool.id)}
                      className={`tool-option ${isSelected ? 'selected' : ''}`}
                    >
                      <span className={`tool-provider ${tool.provider}`} />
                      {tool.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="form-group">
            <label>Estrategia de despliegue</label>
            <div className="strategy-grid">
              {DEPLOYMENT_STRATEGIES.map(strategy => {
                const isSelected = config.deploymentStrategy === strategy.id
                return (
                  <button
                    key={strategy.id}
                    onClick={() => updateConfig('deploymentStrategy', strategy.id)}
                    className={`strategy-card ${isSelected ? 'selected' : ''}`}
                  >
                    <div className="strategy-label">{strategy.label}</div>
                    <div className="strategy-desc">{strategy.description}</div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="form-group">
            <label>Entornos</label>
            <div className="environments-list">
              {ENVIRONMENTS.map(env => {
                const isSelected = config.environments.includes(env.id)
                return (
                  <div key={env.id} className={`environment-item ${isSelected ? 'selected' : ''}`}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        if (e.target.checked) {
                          updateConfig('environments', [...config.environments, env.id])
                        } else {
                          updateConfig('environments', config.environments.filter(e => e !== env.id))
                        }
                      }}
                    />
                    <div className="environment-info">
                      <div className="environment-name">{env.label}</div>
                      {env.needsApproval && <span className="approval-badge">Requiere aprobación</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="wizard-footer">
            <button onClick={() => setStep(0)} className="btn btn-secondary">
              Anterior
            </button>
            <button onClick={generatePipeline} disabled={isDesigning} className="btn btn-primary">
              {isDesigning ? <Loader2 size={18} className="spin" /> : <Sparkles size={18} />}
              Generar Pipeline
            </button>
          </div>
        </section>
      )}

      {step === 2 && pipelineConfig && (
        <section className="page-section">
          <div className="pipeline-tabs">
            <button
              onClick={() => setActiveTab('visual')}
              className={`pipeline-tab ${activeTab === 'visual' ? 'active' : ''}`}
            >
              <Play size={18} /> Visual
            </button>
            <button
              onClick={() => setActiveTab('yaml')}
              className={`pipeline-tab ${activeTab === 'yaml' ? 'active' : ''}`}
            >
              <FileCode size={18} /> {config.selectedTools.build === 'github_actions' ? 'YAML' : 'JSON'}
            </button>
          </div>

          {activeTab === 'visual' && (
            <div className="pipeline-visual">
              <div className="pipeline-stages">
                {pipelineConfig.stages.map((stage, idx) => (
                  <div key={stage.name} className="pipeline-stage">
                    <div
                      className="pipeline-stage-header"
                      onClick={() => setExpandedStage(expandedStage === stage.name ? null : stage.name)}
                    >
                      <div className="stage-number">{idx + 1}</div>
                      <div className="stage-name">{stage.name}</div>
                      <div className="stage-tools">
                        {stage.tools.slice(0, 3).map((tool, i) => (
                          <span key={i} className="stage-tool">{tool}</span>
                        ))}
                      </div>
                      {expandedStage === stage.name ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </div>

                    {expandedStage === stage.name && (
                      <div className="pipeline-stage-steps">
                        {stage.steps.map((step, i) => (
                          <div key={i} className="pipeline-step">
                            <Check size={14} />
                            {step}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'yaml' && (
            <div className="pipeline-yaml">
              <div className="yaml-actions">
                <button onClick={copyTemplate} className="btn btn-secondary btn-sm">
                  <Copy size={16} /> Copiar
                </button>
                <button onClick={downloadTemplate} className="btn btn-secondary btn-sm">
                  <Download size={16} /> Descargar
                </button>
              </div>
              <pre className="code-block yaml">
                {typeof pipelineConfig.template === 'string'
                  ? pipelineConfig.template
                  : JSON.stringify(pipelineConfig.template, null, 2)}
              </pre>
            </div>
          )}

          <div className="wizard-footer">
            <button onClick={() => setStep(1)} className="btn btn-secondary">
              <ArrowLeft size={18} /> Anterior
            </button>
            <button onClick={() => setStep(0)} className="btn btn-primary">
              <RotateCcw size={18} /> Nuevo Pipeline
            </button>
          </div>
        </section>
      )}
    </div>
  )
}

// ArrowLeft icon component
function ArrowLeft({ size }: { size: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 18-6-6 6-6" />
    </svg>
  )
}
