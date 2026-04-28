import { useState, useRef, useEffect } from 'react'
import {
  Search,
  Sparkles,
  X,
  Send,
  Bot,
  User,
  ChevronRight,
  BookOpen,
  AlertCircle,
  CheckCircle2,
  Loader2,
  MessageSquare,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Play,
  Copy,
  Check,
  Command
} from 'lucide-react'
import { sendMessageToAI, checkOllamaStatus, generateInfraGuide, AVAILABLE_MODELS, type InfraGuide, type GuideStep } from '../../services/aiService'
import './AIComponents.css'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface SearchResult {
  path: string
  title: string
  snippet: string
  score: number
}

const infrastructureGuides: Record<string, { title: string; icon: typeof Lightbulb; description: string }> = {
  'eks-cluster': {
    title: 'Crear EKS Cluster',
    icon: Command,
    description: 'Paso a paso para crear un cluster Kubernetes en AWS'
  },
  'serverless-api': {
    title: 'API Serverless',
    icon: MessageSquare,
    description: 'Lambda + API Gateway + DynamoDB'
  },
  'three-tier': {
    title: 'Arquitectura 3 Capas',
    icon: Command,
    description: 'EC2 + ALB + RDS completo'
  },
  'event-driven': {
    title: 'Event-Driven',
    icon: MessageSquare,
    description: 'SQS + SNS + Lambda'
  },
  'data-pipeline': {
    title: 'Data Pipeline',
    icon: Command,
    description: 'Kinesis + S3 + Glue + Athena'
  },
  'vpc-networking': {
    title: 'VPC Networking',
    icon: Command,
    description: 'VPC, subnets, gateways, peering'
  }
}

const searchAliases: Record<string, string> = {
  'vpc': '/vpc-networking',
  'subnet': '/vpc-networking',
  'internet gateway': '/vpc-networking',
  'nat gateway': '/vpc-networking',
  'route table': '/vpc-networking',
  'eks': '/eks',
  'kubernetes': '/eks',
  'lambda': '/serverless',
  'api gateway': '/serverless',
  'dynamodb': '/serverless',
  'serverless': '/serverless',
  'ec2': '/three-tier',
  'alb': '/three-tier',
  'rds': '/three-tier',
  'autoscaling': '/three-tier',
  'sqs': '/event-driven',
  'sns': '/event-driven',
  'eventbridge': '/event-driven',
  'kinesis': '/data-pipeline',
  's3': '/data-pipeline',
  'glue': '/data-pipeline',
  'athena': '/data-pipeline',
  'iam': '/security',
  'kms': '/security',
  'cloudtrail': '/security',
  'guardduty': '/security'
}

const documentationIndex: Record<string, { title: string; content: string; keywords: string[] }> = {
  '/eks': {
    title: 'EKS + Kubernetes',
    content: 'Arquitectura de contenedores con Elastic Kubernetes Service, NLB interno y API Gateway.',
    keywords: ['kubernetes', 'containers', 'pods', 'nodes', 'eks', 'fargate', 'ecs']
  },
  '/serverless': {
    title: 'Serverless Architecture',
    content: 'Lambda, API Gateway, DynamoDB para aplicaciones sin servidor.',
    keywords: ['lambda', 'api gateway', 'dynamodb', 'serverless', 'functions']
  },
  '/three-tier': {
    title: 'Three-Tier Architecture',
    content: 'EC2, ALB, RDS para arquitectura web tradicional de 3 capas.',
    keywords: ['ec2', 'alb', 'rds', 'autoscaling', 'ec2', 'virtual machines']
  },
  '/event-driven': {
    title: 'Event-Driven Architecture',
    content: 'SQS, SNS, Lambda para procesamiento asíncrono.',
    keywords: ['sqs', 'sns', 'eventbridge', 'events', 'queues', 'topics']
  },
  '/data-pipeline': {
    title: 'Data Pipeline Architecture',
    content: 'Kinesis, S3, Glue, Athena para procesamiento de datos.',
    keywords: ['kinesis', 's3', 'glue', 'athena', 'data lake', 'analytics']
  },
  '/vpc-networking': {
    title: 'VPC Networking',
    content: 'VPC, subnets, route tables, NAT gateways, VPC peering.',
    keywords: ['vpc', 'subnet', 'networking', 'nat gateway', 'internet gateway', 'route table']
  },
  '/security': {
    title: 'Security Best Practices',
    content: 'IAM, KMS, CloudTrail, GuardDuty, AWS Config, Security Groups.',
    keywords: ['iam', 'kms', 'cloudtrail', 'guardduty', 'security', 'compliance']
  }
}

interface SearchAssistantProps {
  isOpen: boolean
  onClose: () => void
}

export function SearchAssistant({ isOpen, onClose }: SearchAssistantProps) {
  const [query, setQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'search' | 'chat' | 'guide'>('search')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedModel, setSelectedModel] = useState('gemma4:e4b')
  const [ollamaStatus, setOllamaStatus] = useState(false)
  const [activeGuide, setActiveGuide] = useState<InfraGuide | null>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [expandedStep, setExpandedStep] = useState<number | null>(null)
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      checkOllamaStatus().then(setOllamaStatus)
    }
  }, [isOpen])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Búsqueda en documentación
  const handleSearch = (searchQuery: string) => {
    setQuery(searchQuery)
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }

    // Buscar en aliases primero
    const aliasMatch = Object.entries(searchAliases).find(([key]) =>
      searchQuery.toLowerCase().includes(key)
    )

    if (aliasMatch) {
      const path = aliasMatch[1]
      const doc = documentationIndex[path]
      setSearchResults([{ path, title: doc.title, snippet: doc.content, score: 100 }])
      return
    }

    // Búsqueda por palabras clave
    const results = Object.entries(documentationIndex).map(([path, doc]) => {
      const queryLower = searchQuery.toLowerCase()
      let score = 0

      if (doc.title.toLowerCase().includes(queryLower)) score += 10
      if (doc.content.toLowerCase().includes(queryLower)) score += 5

      doc.keywords.forEach(kw => {
        if (queryLower.includes(kw) || kw.includes(queryLower)) score += 3
      })

      const words = queryLower.split(' ')
      words.forEach(word => {
        if (doc.content.toLowerCase().includes(word)) score += 1
      })

      return { path, title: doc.title, snippet: doc.content.substring(0, 150) + '...', score }
    }).filter(r => r.score > 0).sort((a, b) => b.score - a.score)

    setSearchResults(results.slice(0, 5))
  }

  // Enviar mensaje al IA
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return

    const userMessage: Message = { role: 'user', content: inputMessage }
    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)

    const history = messages.slice(-10)
    const response = await sendMessageToAI(inputMessage, selectedModel, history)

    if (response.success) {
      setMessages(prev => [...prev, { role: 'assistant', content: response.content || '' }])
    } else {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '❌ Error: No se pudo conectar con el modelo IA. Verifica que Ollama esté corriendo (ollama serve).'
      }])
    }

    setIsLoading(false)
  }

  // Generar guía de infraestructura
  const handleGenerateGuide = async (guideKey: string) => {
    const guide = infrastructureGuides[guideKey]
    if (!guide) return

    setActiveTab('guide')
    setActiveGuide({ title: guide.title, steps: [], prerequisites: [] })
    setCurrentStep(0)
    setExpandedStep(null)

    const generated = await generateInfraGuide(guide.title, selectedModel)

    if (generated && generated.steps) {
      setActiveGuide(generated)
    } else {
      setActiveGuide({
        title: guide.title,
        steps: [
          { number: 1, title: 'Prerrequisitos', description: 'Verificar acceso a AWS CLI y permisos necesarios', commands: ['aws sts get-caller-identity'] }
        ],
        prerequisites: ['AWS CLI instalado', 'Credenciales configuradas']
      })
    }
  }

  const handleCopyCommand = (cmd: string) => {
    navigator.clipboard.writeText(cmd)
    setCopiedCommand(cmd)
    setTimeout(() => setCopiedCommand(null), 2000)
  }

  const navigateToSection = (path: string) => {
    window.location.href = path
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="ai-modal-overlay">
      <div className="ai-modal">
        {/* Header */}
        <div className="ai-modal-header">
          <div className="ai-modal-title">
            <div className="ai-icon">
              <Sparkles size={22} />
            </div>
            <div>
              <h2>Asistente AWS IA</h2>
              <p>Búsqueda + Chat Local (Ollama)</p>
            </div>
          </div>

          <div className="ai-modal-controls">
            {/* Selector de modelo */}
            {activeTab === 'chat' && (
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="ai-model-selector"
              >
                {AVAILABLE_MODELS.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            )}

            {/* Status Ollama */}
            <div className={`ai-status ${ollamaStatus ? 'online' : 'offline'}`}>
              <div className="ai-status-dot" />
              {ollamaStatus ? 'IA Online' : 'IA Offline'}
            </div>

            <button onClick={onClose} className="ai-close-btn">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="ai-tabs">
          {[
            { id: 'search', label: 'Buscar', icon: Search },
            { id: 'chat', label: 'Chat IA', icon: MessageSquare },
            { id: 'guide', label: 'Guías', icon: Lightbulb }
          ].map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`ai-tab ${activeTab === tab.id ? 'active' : ''}`}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div className="ai-modal-content">
          {/* SEARCH TAB */}
          {activeTab === 'search' && (
            <div className="ai-search-tab">
              <div className="ai-search-input-wrapper">
                <Search size={20} className="ai-search-icon" />
                <input
                  type="text"
                  placeholder="¿Qué quieres aprender? Ej: 'como crear vpc', 'eks tutorial'..."
                  value={query}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="ai-search-input"
                />
              </div>

              {searchResults.length > 0 ? (
                <div className="ai-search-results">
                  {searchResults.map((result, idx) => (
                    <div
                      key={idx}
                      onClick={() => navigateToSection(result.path)}
                      className="ai-search-result"
                    >
                      <BookOpen size={18} />
                      <div className="ai-search-result-content">
                        <div className="ai-search-result-title">{result.title}</div>
                        <div className="ai-search-result-snippet">{result.snippet}</div>
                      </div>
                      <ChevronRight size={16} />
                    </div>
                  ))}
                </div>
              ) : query ? (
                <div className="ai-search-empty">
                  <AlertCircle size={48} />
                  <p>No se encontraron resultados para &quot;{query}&quot;</p>
                  <span>Prueba con términos como: VPC, EKS, Lambda, S3...</span>
                </div>
              ) : (
                <div className="ai-search-suggestions">
                  <h3>Búsquedas populares</h3>
                  <div className="ai-search-tags">
                    {Object.keys(searchAliases).slice(0, 12).map(term => (
                      <button
                        key={term}
                        onClick={() => handleSearch(term)}
                        className="ai-search-tag"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CHAT TAB */}
          {activeTab === 'chat' && (
            <div className="ai-chat-tab">
              <div className="ai-chat-messages">
                {messages.length === 0 ? (
                  <div className="ai-chat-welcome">
                    <Bot size={48} />
                    <h3>¿En qué puedo ayudarte?</h3>
                    <p>Pregúntame sobre AWS, arquitectura cloud, o mejores prácticas.</p>
                    <div className="ai-chat-examples">
                      {[
                        '¿Cómo diseño una VPC multi-AZ?',
                        'Explica IAM roles vs policies',
                        '¿Cuándo usar ECS vs EKS?',
                        'Mejores prácticas para Lambda'
                      ].map((ex, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            setInputMessage(ex)
                            setTimeout(() => handleSendMessage(), 0)
                          }}
                          className="ai-chat-example"
                        >
                          {ex}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    {messages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`ai-chat-message ${msg.role}`}
                      >
                        <div className="ai-chat-avatar">
                          {msg.role === 'user' ? <User size={18} /> : <Bot size={18} />}
                        </div>
                        <div className="ai-chat-content">
                          <div className="ai-chat-text">{msg.content}</div>
                        </div>
                      </div>
                    ))}
                    {isLoading && (
                      <div className="ai-chat-message assistant">
                        <div className="ai-chat-avatar">
                          <Bot size={18} />
                        </div>
                        <div className="ai-chat-content">
                          <Loader2 size={20} className="ai-chat-loading" />
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              <div className="ai-chat-input-wrapper">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder={ollamaStatus ? 'Escribe tu pregunta...' : 'Ollama no disponible'}
                  disabled={!ollamaStatus || isLoading}
                  className="ai-chat-input"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || !ollamaStatus || isLoading}
                  className="ai-chat-send"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          )}

          {/* GUIDE TAB */}
          {activeTab === 'guide' && (
            <div className="ai-guide-tab">
              {!activeGuide ? (
                <div className="ai-guide-grid">
                  {Object.entries(infrastructureGuides).map(([key, guide]) => {
                    const Icon = guide.icon
                    return (
                      <button
                        key={key}
                        onClick={() => handleGenerateGuide(key)}
                        className="ai-guide-card"
                      >
                        <Icon size={28} />
                        <h4>{guide.title}</h4>
                        <p>{guide.description}</p>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div className="ai-guide-content">
                  <div className="ai-guide-header">
                    <button
                      onClick={() => setActiveGuide(null)}
                      className="ai-guide-back"
                    >
                      <ChevronLeft size={16} /> Volver
                    </button>
                    <h3>{activeGuide.title}</h3>
                    {activeGuide.estimatedTime && (
                      <span className="ai-guide-time">
                        ⏱ {activeGuide.estimatedTime}
                      </span>
                    )}
                  </div>

                  {activeGuide.prerequisites && activeGuide.prerequisites.length > 0 && (
                    <div className="ai-guide-prerequisites">
                      <h4>Prerrequisitos</h4>
                      <ul>
                        {activeGuide.prerequisites.map((pre, i) => (
                          <li key={i}>{pre}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="ai-guide-steps">
                    {activeGuide.steps.length === 0 ? (
                      <div className="ai-guide-loading">
                        <Loader2 size={32} className="spin" />
                        <p>Generando guía con IA...</p>
                      </div>
                    ) : (
                      activeGuide.steps.map((step: GuideStep) => (
                        <div
                          key={step.number}
                          className={`ai-guide-step ${expandedStep === step.number ? 'expanded' : ''}`}
                        >
                          <div
                            className="ai-guide-step-header"
                            onClick={() => setExpandedStep(expandedStep === step.number ? null : step.number)}
                          >
                            <div className="ai-guide-step-number">{step.number}</div>
                            <div className="ai-guide-step-title">{step.title}</div>
                            {expandedStep === step.number ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </div>

                          {expandedStep === step.number && (
                            <div className="ai-guide-step-content">
                              <p>{step.description}</p>

                              {step.commands && step.commands.length > 0 && (
                                <div className="ai-guide-commands">
                                  {step.commands.map((cmd, i) => (
                                    <div key={i} className="ai-guide-command">
                                      <code>{cmd}</code>
                                      <button
                                        onClick={() => handleCopyCommand(cmd)}
                                        className="ai-guide-copy"
                                      >
                                        {copiedCommand === cmd ? <Check size={14} /> : <Copy size={14} />}
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {step.commonIssues && step.commonIssues.length > 0 && (
                                <div className="ai-guide-issues">
                                  <h5>⚠️ Problemas comunes</h5>
                                  <ul>
                                    {step.commonIssues.map((issue, i) => (
                                      <li key={i}>{issue}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Componente ChevronLeft para la guía
function ChevronLeft({ size }: { size: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  )
}
