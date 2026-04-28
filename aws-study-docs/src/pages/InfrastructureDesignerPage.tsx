import { useState, useRef } from 'react'
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
  Server,
  Database,
  Cloud,
  Network,
  Shield,
  Layers,
  Zap,
  Globe,
  Cpu,
  HardDrive,
  MessageSquare,
  Download,
  Copy,
  FileCode,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  X
} from 'lucide-react'
import { analyzeInfrastructure, refineInfrastructure, estimateCost, type Requirements, type Diagram } from '../services/infraDesignerService'
import { generateCodePipelineTemplate } from '../services/pipelineService'
import './InfrastructureDesigner.css'

const WIZARD_STEPS = [
  { id: 'basics', title: 'Básico', description: 'Tipo y descripción' },
  { id: 'scale', title: 'Escala', description: 'Usuarios y tráfico' },
  { id: 'tech', title: 'Tecnología', description: 'DB, caché, colas' },
  { id: 'constraints', title: 'Restricciones', description: 'Presupuesto y requisitos' }
]

const APP_TYPES = [
  { id: 'web', label: 'Web Application', icon: Globe, description: 'Frontend + Backend tradicional' },
  { id: 'api', label: 'API/Backend', icon: Server, description: 'Servicios REST/GraphQL' },
  { id: 'ecommerce', label: 'E-commerce', icon: DollarSign, description: 'Tienda online con pagos' },
  { id: 'saas', label: 'SaaS Multi-tenant', icon: Layers, description: 'Software as a Service' },
  { id: 'mobile', label: 'Mobile Backend', icon: Zap, description: 'Backend para apps móviles' },
  { id: 'data', label: 'Data/Analytics', icon: Database, description: 'Procesamiento de datos' },
  { id: 'streaming', label: 'Streaming/Media', icon: Cloud, description: 'Video/audio streaming' },
  { id: 'iot', label: 'IoT', icon: Cpu, description: 'Internet of Things' }
]

const DEPLOYMENT_TYPES = [
  { id: 'containers', label: 'Containers (ECS/EKS)', description: 'Docker/Kubernetes' },
  { id: 'serverless', label: 'Serverless', description: 'Lambda + API Gateway' },
  { id: 'vms', label: 'Virtual Machines', description: 'EC2 tradicional' },
  { id: 'hybrid', label: 'Híbrido', description: 'Mix de tecnologías' }
]

const CONCURRENT_USERS = [
  { value: '10-100', label: '10-100', description: 'PoC/Startup temprana' },
  { value: '100-1k', label: '100-1,000', description: 'Startup en crecimiento' },
  { value: '1k-10k', label: '1K-10K', description: 'Producto establecido' },
  { value: '10k-100k', label: '10K-100K', description: 'Escala media' },
  { value: '100k+', label: '100K+', description: 'Alta escala' }
]

const BUDGETS = [
  { value: 'low', label: '< $50/mes', description: 'Personal/side project' },
  { value: 'medium', label: '$50-200/mes', description: 'Startup bootstrapped' },
  { value: 'standard', label: '$200-500/mes', description: 'Startup con funding' },
  { value: 'high', label: '$500-2K/mes', description: 'Empresa pequeña' },
  { value: 'enterprise', label: '$2K+/mes', description: 'Empresa/Enterprise' }
]

const NODE_ICONS: Record<string, typeof Server> = {
  user: Globe,
  cdn: Cloud,
  dns: Globe,
  alb: Network,
  nlb: Network,
  api: Server,
  ec2: Server,
  asg: Layers,
  ecs: Layers,
  eks: Layers,
  fargate: Zap,
  lambda: Zap,
  rds: Database,
  dynamo: Database,
  elasticache: HardDrive,
  s3: HardDrive,
  sns: MessageSquare,
  sqs: MessageSquare,
  eventbridge: Zap,
  cognito: Shield,
  secrets: Shield,
  cloudwatch: Server,
  waf: Shield,
  default: Server
}

const NODE_COLORS: Record<string, string> = {
  user: '#f2994a',
  cdn: '#e67e22',
  alb: '#3498db',
  nlb: '#2980b9',
  api: '#9b59b6',
  ec2: '#2ecc71',
  asg: '#27ae60',
  ecs: '#1abc9c',
  eks: '#16a085',
  fargate: '#f1c40f',
  lambda: '#f39c12',
  rds: '#e74c3c',
  dynamo: '#c0392b',
  elasticache: '#e67e22',
  s3: '#d35400',
  sns: '#8e44ad',
  sqs: '#9b59b6',
  cognito: '#34495e',
  secrets: '#2c3e50',
  default: '#95a5a6'
}

export function InfrastructureDesignerPage() {
  const [step, setStep] = useState(0)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<string | null>(null)
  const [diagram, setDiagram] = useState<Diagram | null>(null)
  const [view, setView] = useState<'wizard' | 'analysis' | 'diagram'>('wizard')
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [refinementPrompt, setRefinementPrompt] = useState('')
  const [isRefining, setIsRefining] = useState(false)
  const [showCost, setShowCost] = useState(false)
  const [costEstimate, setCostEstimate] = useState<ReturnType<typeof estimateCost> | null>(null)
  const [showCloudFormation, setShowCloudFormation] = useState(false)
  const [cloudFormationTemplate, setCloudFormationTemplate] = useState<Record<string, unknown> | null>(null)
  const [cfFormat, setCfFormat] = useState<'yaml' | 'json'>('yaml')
  const svgRef = useRef<SVGSVGElement>(null)

  const [requirements, setRequirements] = useState<Requirements>({
    appType: '',
    description: '',
    concurrentUsers: '',
    trafficPeak: '',
    budget: '',
    region: 'us-east-1',
    latency: 'normal',
    compliance: 'none',
    needsDatabase: false,
    databaseType: 'postgresql',
    needsCache: false,
    needsQueue: false,
    deploymentType: 'containers',
    opsTeam: 'small'
  })

  const updateRequirement = (key: keyof Requirements, value: unknown) => {
    setRequirements(prev => ({ ...prev, [key]: value }))
  }

  const handleNext = () => {
    if (step < WIZARD_STEPS.length - 1) {
      setStep(step + 1)
    } else {
      generateInfrastructure()
    }
  }

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1)
    }
  }

  const generateInfrastructure = async () => {
    setIsAnalyzing(true)
    setView('analysis')

    const result = await analyzeInfrastructure(requirements)

    if (result.success) {
      const finalDiagram = result.diagram || generateDefaultDiagram()
      setAnalysis(result.analysis)
      setDiagram(finalDiagram)
      setCostEstimate(estimateCost(finalDiagram.nodes))

      const cfTemplate = generateCodePipelineTemplate({
        projectName: requirements.appType || 'myapp',
        repoType: 'github',
        deploymentType: requirements.deploymentType === 'serverless' ? 'lambda' : 'ecs',
        needsDocker: requirements.deploymentType === 'containers'
      })
      setCloudFormationTemplate(cfTemplate)
    }

    setIsAnalyzing(false)
  }

  const generateDefaultDiagram = (): Diagram => {
    const nodes: Diagram['nodes'] = [
      { id: 'users', type: 'user', label: 'Users', x: 50, y: 200, tier: 'frontend' },
      { id: 'cdn', type: 'cdn', label: 'CloudFront', x: 150, y: 200, tier: 'frontend' }
    ]

    if (requirements.deploymentType === 'serverless') {
      nodes.push(
        { id: 'api', type: 'api', label: 'API Gateway', x: 250, y: 200, tier: 'backend' },
        { id: 'lambda', type: 'lambda', label: 'Lambda', x: 350, y: 200, tier: 'backend' }
      )
    } else {
      nodes.push(
        { id: 'alb', type: 'alb', label: 'ALB', x: 250, y: 200, tier: 'backend' },
        { id: 'app', type: requirements.deploymentType === 'containers' ? 'ecs' : 'ec2', label: 'App Servers', x: 350, y: 200, tier: 'backend' }
      )
    }

    if (requirements.needsDatabase) {
      nodes.push({ id: 'db', type: 'rds', label: 'Database', x: 450, y: 200, tier: 'data' })
    }

    if (requirements.needsCache) {
      nodes.push({ id: 'cache', type: 'elasticache', label: 'Cache', x: 450, y: 100, tier: 'data' })
    }

    const connections: Diagram['connections'] = []
    for (let i = 0; i < nodes.length - 1; i++) {
      connections.push({
        from: nodes[i].id,
        to: nodes[i + 1].id,
        label: 'HTTPS',
        type: 'https'
      })
    }

    return { nodes, connections }
  }

  const handleRefine = async () => {
    if (!refinementPrompt.trim() || !diagram) return

    setIsRefining(true)
    const result = await refineInfrastructure(diagram, refinementPrompt)

    if (result.success && result.diagram) {
      setDiagram(result.diagram)
      setCostEstimate(estimateCost(result.diagram.nodes))
    }

    setIsRefining(false)
    setRefinementPrompt('')
  }

  const handleDeleteNode = (nodeId: string) => {
    if (!diagram) return

    setDiagram(prev => prev ? ({
      nodes: prev.nodes.filter(n => n.id !== nodeId),
      connections: prev.connections.filter(c => c.from !== nodeId && c.to !== nodeId)
    }) : null)
    setSelectedNode(null)
  }

  const exportDiagram = () => {
    if (!diagram) return
    const dataStr = JSON.stringify(diagram, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr)
    const exportFileDefaultName = `infrastructure-${requirements.appType}-${Date.now()}.json`

    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
  }

  const copyTerraform = () => {
    if (!diagram) return

    const terraform = diagram.nodes.map(node => {
      switch (node.type) {
        case 'ec2':
          return `# ${node.label}
resource "aws_instance" "${node.id}" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.medium"
  tags = { Name = "${node.label}" }
}`
        case 'rds':
          return `# ${node.label}
resource "aws_db_instance" "${node.id}" {
  identifier = "${node.id}"
  engine     = "postgres"
  instance_class = "db.t3.micro"
  allocated_storage = 20
}`
        case 'alb':
          return `# ${node.label}
resource "aws_lb" "${node.id}" {
  name               = "${node.id}"
  internal           = false
  load_balancer_type = "application"
}`
        default:
          return `# ${node.type}: ${node.label}`
      }
    }).join('\n\n')

    navigator.clipboard.writeText(terraform)
    alert('Terraform copiado al portapapeles')
  }

  const buttonStyle: React.CSSProperties = {
    padding: '10px 16px',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.2)',
    background: 'rgba(255,255,255,0.05)',
    color: 'white',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '0.9rem'
  }

  return (
    <div className="architecture-page infrastructure-designer animate-fade-in">
      <header className="page-header">
        <div className="page-title-row">
          <h1><Sparkles size={28} /> Infrastructure Designer AI</h1>
        </div>
        <p className="page-subtitle">
          Diseña arquitecturas AWS óptimas con asistencia de IA local (Ollama).
          Genera diagramas interactivos, estimaciones de costos y templates CloudFormation.
        </p>
        <div className="page-badges">
          <span className="badge r">[REUTILIZABLE] Templates CloudFormation/Terraform</span>
          <span className="badge c">[CRITICO] Requiere Ollama corriendo localmente</span>
        </div>
      </header>

      {view === 'wizard' && (
        <section className="page-section">
          {/* Progress Bar */}
          <div className="wizard-progress">
            {WIZARD_STEPS.map((s, idx) => (
              <div
                key={s.id}
                onClick={() => idx <= step && setStep(idx)}
                className={`wizard-step ${idx === step ? 'active' : idx < step ? 'completed' : ''}`}
              >
                <div className="wizard-step-number">{idx < step ? '✓' : idx + 1}</div>
                <div className="wizard-step-info">
                  <div className="wizard-step-title">{s.title}</div>
                  <div className="wizard-step-desc">{s.description}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Wizard Content */}
          <div className="wizard-content">
            {renderWizardStep()}
          </div>

          {/* Footer */}
          <div className="wizard-footer">
            <button
              onClick={handleBack}
              disabled={step === 0}
              className="btn btn-secondary"
            >
              <ArrowLeft size={18} /> Anterior
            </button>
            <button
              onClick={handleNext}
              className="btn btn-primary"
            >
              {step === WIZARD_STEPS.length - 1 ? (
                <><Sparkles size={18} /> Generar Infraestructura</>
              ) : (
                <>Siguiente <ArrowRight size={18} /></>
              )}
            </button>
          </div>
        </section>
      )}

      {view === 'analysis' && (
        <section className="page-section">
          {isAnalyzing ? (
            <div className="analysis-loading">
              <Loader2 size={60} className="spin" />
              <h3>La IA está analizando tus requerimientos...</h3>
              <p>Esto puede tomar 10-30 segundos</p>
            </div>
          ) : (
            <>
              <div className="analysis-success">
                <div className="success-icon"><Check size={32} /></div>
                <h3>¡Análisis completo!</h3>
                <p>Tu infraestructura recomendada está lista</p>
              </div>

              {costEstimate && (
                <div className="cost-estimate">
                  <div className="cost-header">
                    <div>
                      <div className="cost-label">Estimación mensual</div>
                      <div className="cost-range">${costEstimate.range.min} - ${costEstimate.range.max}</div>
                    </div>
                    <button onClick={() => setView('diagram')} className="btn btn-primary">
                      <Network size={18} /> Ver Diagrama
                    </button>
                  </div>
                  <button onClick={() => setShowCost(!showCost)} className="btn btn-secondary btn-sm">
                    {showCost ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    {showCost ? 'Ocultar' : 'Ver'} desglose
                  </button>

                  {showCost && (
                    <div className="cost-breakdown">
                      {costEstimate.breakdown.map((item, i) => (
                        <div key={i} className="cost-item">
                          <span>{item.service}</span>
                          <span>${item.cost}/mes</span>
                          <span className="cost-details">{item.details}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {analysis && (
                <div className="analysis-content">
                  <h4>Análisis de la IA</h4>
                  <pre className="code-block">{analysis}</pre>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {view === 'diagram' && diagram && (
        <section className="page-section">
          <div className="diagram-toolbar">
            <button onClick={() => setShowCost(!showCost)} style={buttonStyle}>
              <DollarSign size={16} /> {showCost ? 'Ocultar costos' : 'Ver costos'}
            </button>
            <button onClick={() => setShowCloudFormation(!showCloudFormation)} style={buttonStyle}>
              <FileCode size={16} /> {showCloudFormation ? 'Ocultar CF' : 'CloudFormation'}
            </button>
            <button onClick={exportDiagram} style={buttonStyle}>
              <Download size={16} /> Exportar
            </button>
            <button onClick={copyTerraform} style={buttonStyle}>
              <Copy size={16} /> Terraform
            </button>
            <button onClick={() => setView('wizard')} style={buttonStyle}>
              <ArrowLeft size={16} /> Volver
            </button>
          </div>

          {showCost && costEstimate && (
            <div className="cost-estimate-inline">
              <h4>Desglose de costos</h4>
              <div className="cost-breakdown">
                {costEstimate.breakdown.map((item, i) => (
                  <div key={i} className="cost-item">
                    <span>{item.service}</span>
                    <span>${item.cost}/mes</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {showCloudFormation && cloudFormationTemplate && (
            <div className="cf-template">
              <div className="cf-header">
                <h4>CloudFormation Template</h4>
                <div className="cf-format-toggle">
                  <button onClick={() => setCfFormat('yaml')} className={cfFormat === 'yaml' ? 'active' : ''}>YAML</button>
                  <button onClick={() => setCfFormat('json')} className={cfFormat === 'json' ? 'active' : ''}>JSON</button>
                </div>
              </div>
              <pre className="code-block">
                {cfFormat === 'yaml'
                  ? JSON.stringify(cloudFormationTemplate, null, 2)
                  : JSON.stringify(cloudFormationTemplate, null, 2)}
              </pre>
            </div>
          )}

          {/* SVG Diagram */}
          <div className="diagram-canvas">
            <svg ref={svgRef} viewBox="0 0 600 400" className="diagram-svg">
              {/* Connections */}
              {diagram.connections.map((conn, i) => {
                const fromNode = diagram.nodes.find(n => n.id === conn.from)
                const toNode = diagram.nodes.find(n => n.id === conn.to)
                if (!fromNode || !toNode) return null
                return (
                  <g key={i}>
                    <line
                      x1={fromNode.x + 40}
                      y1={fromNode.y + 20}
                      x2={toNode.x}
                      y2={toNode.y + 20}
                      stroke="#8892a0"
                      strokeWidth="2"
                      markerEnd="url(#arrowhead)"
                    />
                    <text
                      x={(fromNode.x + toNode.x) / 2 + 20}
                      y={(fromNode.y + toNode.y) / 2 + 15}
                      fill="#8892a0"
                      fontSize="10"
                    >{conn.label}</text>
                  </g>
                )
              })}

              {/* Arrow marker */}
              <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="#8892a0" />
                </marker>
              </defs>

              {/* Nodes */}
              {diagram.nodes.map(node => {
                const Icon = NODE_ICONS[node.type] || NODE_ICONS.default
                const color = NODE_COLORS[node.type] || NODE_COLORS.default
                const isSelected = selectedNode === node.id

                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x}, ${node.y})`}
                    onClick={() => setSelectedNode(node.id)}
                    className={`diagram-node ${isSelected ? 'selected' : ''}`}
                    style={{ cursor: 'pointer' }}
                  >
                    <rect
                      width="80"
                      height="40"
                      rx="8"
                      fill={`${color}20`}
                      stroke={isSelected ? '#2f80ed' : color}
                      strokeWidth={isSelected ? 3 : 2}
                    />
                    <foreignObject x="4" y="4" width="20" height="20">
                      <div style={{ color }}><Icon size={16} /></div>
                    </foreignObject>
                    <text x="40" y="25" textAnchor="middle" fill="white" fontSize="10">
                      {node.label}
                    </text>
                  </g>
                )
              })}
            </svg>
          </div>

          {/* Refinement */}
          <div className="diagram-refinement">
            <h4>Refinar arquitectura</h4>
            <div className="refinement-input-row">
              <input
                type="text"
                value={refinementPrompt}
                onChange={(e) => setRefinementPrompt(e.target.value)}
                placeholder="Ej: 'Agregar autoscaling', 'Cambiar a serverless', 'Añadir CDN'..."
                className="refinement-input"
              />
              <button onClick={handleRefine} disabled={isRefining} className="btn btn-primary">
                {isRefining ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
                Refinar
              </button>
            </div>
          </div>

          {/* Selected Node Details */}
          {selectedNode && (
            <div className="node-details">
              <div className="node-details-header">
                <h4>Detalles del nodo</h4>
                <button onClick={() => setSelectedNode(null)} className="btn-close">
                  <X size={16} />
                </button>
              </div>
              {(() => {
                const node = diagram.nodes.find(n => n.id === selectedNode)
                if (!node) return null
                return (
                  <div className="node-info">
                    <p><strong>Tipo:</strong> {node.type}</p>
                    <p><strong>Label:</strong> {node.label}</p>
                    <p><strong>Tier:</strong> {node.tier}</p>
                    {node.details && <p><strong>Detalles:</strong> {node.details}</p>}
                    <button onClick={() => handleDeleteNode(node.id)} className="btn btn-danger btn-sm">
                      Eliminar nodo
                    </button>
                  </div>
                )
              })()}
            </div>
          )}
        </section>
      )}
    </div>
  )

  function renderWizardStep() {
    const currentStep = WIZARD_STEPS[step]

    switch (currentStep.id) {
      case 'basics':
        return (
          <div className="wizard-step-content">
            <h3>¿Qué tipo de aplicación vas a construir?</h3>
            <div className="app-types-grid">
              {APP_TYPES.map(type => {
                const Icon = type.icon
                const isSelected = requirements.appType === type.id
                return (
                  <button
                    key={type.id}
                    onClick={() => updateRequirement('appType', type.id)}
                    className={`app-type-card ${isSelected ? 'selected' : ''}`}
                  >
                    <Icon size={28} className={isSelected ? 'active' : ''} />
                    <div className="app-type-label">{type.label}</div>
                    <div className="app-type-desc">{type.description}</div>
                  </button>
                )
              })}
            </div>

            <div className="form-group">
              <label>Describe tu aplicación brevemente</label>
              <textarea
                value={requirements.description}
                onChange={(e) => updateRequirement('description', e.target.value)}
                placeholder="Ej: Una aplicación de e-commerce para venta de productos artesanales..."
                rows={4}
              />
            </div>
          </div>
        )

      case 'scale':
        return (
          <div className="wizard-step-content">
            <h3>¿Qué escala esperas?</h3>

            <div className="form-group">
              <label>Usuarios concurrentes</label>
              <div className="options-grid">
                {CONCURRENT_USERS.map(u => {
                  const isSelected = requirements.concurrentUsers === u.value
                  return (
                    <button
                      key={u.value}
                      onClick={() => updateRequirement('concurrentUsers', u.value)}
                      className={`option-card ${isSelected ? 'selected' : ''}`}
                    >
                      <div className="option-label">{u.label}</div>
                      <div className="option-desc">{u.description}</div>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="form-group">
              <label>Picos de tráfico</label>
              <div className="options-row">
                {['Constante', 'Diario', 'Semanal', 'Estacional'].map(peak => {
                  const isSelected = requirements.trafficPeak === peak
                  return (
                    <button
                      key={peak}
                      onClick={() => updateRequirement('trafficPeak', peak)}
                      className={`option-pill ${isSelected ? 'selected' : ''}`}
                    >
                      {peak}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )

      case 'tech':
        return (
          <div className="wizard-step-content">
            <h3>Stack tecnológico</h3>

            <div className="form-group">
              <label>Tipo de despliegue</label>
              <div className="options-grid">
                {DEPLOYMENT_TYPES.map(d => {
                  const isSelected = requirements.deploymentType === d.id
                  return (
                    <button
                      key={d.id}
                      onClick={() => updateRequirement('deploymentType', d.id)}
                      className={`option-card ${isSelected ? 'selected' : ''}`}
                    >
                      <div className="option-label">{d.label}</div>
                      <div className="option-desc">{d.description}</div>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="tech-toggles">
              <div
                className={`tech-toggle ${requirements.needsDatabase ? 'active' : ''}`}
                onClick={() => updateRequirement('needsDatabase', !requirements.needsDatabase)}
              >
                <Database size={24} />
                <div>
                  <div className="tech-toggle-label">Base de datos</div>
                  {requirements.needsDatabase && (
                    <select
                      value={requirements.databaseType}
                      onChange={(e) => updateRequirement('databaseType', e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <option value="postgresql">PostgreSQL</option>
                      <option value="mysql">MySQL</option>
                      <option value="mongodb">DocumentDB</option>
                      <option value="dynamodb">DynamoDB</option>
                    </select>
                  )}
                </div>
              </div>

              <div
                className={`tech-toggle ${requirements.needsCache ? 'active' : ''}`}
                onClick={() => updateRequirement('needsCache', !requirements.needsCache)}
              >
                <HardDrive size={24} />
                <div>
                  <div className="tech-toggle-label">Caché</div>
                  <div className="tech-toggle-desc">ElastiCache Redis/Memcached</div>
                </div>
              </div>

              <div
                className={`tech-toggle ${requirements.needsQueue ? 'active' : ''}`}
                onClick={() => updateRequirement('needsQueue', !requirements.needsQueue)}
              >
                <MessageSquare size={24} />
                <div>
                  <div className="tech-toggle-label">Colas/Mensajería</div>
                  <div className="tech-toggle-desc">SQS, SNS, EventBridge</div>
                </div>
              </div>
            </div>
          </div>
        )

      case 'constraints':
        return (
          <div className="wizard-step-content">
            <h3>Restricciones y presupuesto</h3>

            <div className="form-group">
              <label>Presupuesto mensual estimado</label>
              <div className="options-grid">
                {BUDGETS.map(b => {
                  const isSelected = requirements.budget === b.value
                  return (
                    <button
                      key={b.value}
                      onClick={() => updateRequirement('budget', b.value)}
                      className={`option-card ${isSelected ? 'selected' : ''}`}
                    >
                      <div className="option-label">{b.label}</div>
                      <div className="option-desc">{b.description}</div>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Región AWS</label>
                <select
                  value={requirements.region}
                  onChange={(e) => updateRequirement('region', e.target.value)}
                >
                  <option value="us-east-1">US East (N. Virginia)</option>
                  <option value="us-west-2">US West (Oregon)</option>
                  <option value="eu-west-1">EU (Ireland)</option>
                  <option value="eu-central-1">EU (Frankfurt)</option>
                  <option value="ap-south-1">Asia Pacific (Mumbai)</option>
                  <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
                  <option value="sa-east-1">South America (São Paulo)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Requisitos de latencia</label>
                <select
                  value={requirements.latency}
                  onChange={(e) => updateRequirement('latency', e.target.value)}
                >
                  <option value="normal">Normal (&lt; 500ms)</option>
                  <option value="low">Baja (&lt; 200ms)</option>
                  <option value="critical">Crítica (&lt; 50ms)</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Cumplimiento requerido</label>
              <select
                value={requirements.compliance}
                onChange={(e) => updateRequirement('compliance', e.target.value)}
              >
                <option value="none">Ninguno específico</option>
                <option value="hipaa">HIPAA (Salud)</option>
                <option value="pci">PCI DSS (Pagos)</option>
                <option value="soc2">SOC 2</option>
                <option value="gdpr">GDPR (UE)</option>
              </select>
            </div>
          </div>
        )

      default:
        return null
    }
  }
}

// DollarSign icon component
function DollarSign({ size }: { size: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" x2="12" y1="2" y2="22" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  )
}
