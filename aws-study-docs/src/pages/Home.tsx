import { ArrowRight, BookOpen, Cloud, Server, Zap } from 'lucide-react'
import { Link } from 'react-router-dom'
import './Home.css'

const architectures = [
  {
    title: 'EKS + Kubernetes',
    description: 'Arquitectura de contenedores con Elastic Kubernetes Service, NLB interno y API Gateway.',
    icon: Cloud,
    path: '/eks',
    tags: ['Containers', 'Orchestration', 'Microservices'],
    color: 'var(--k8s)'
  },
  {
    title: 'Serverless',
    description: 'Lambda, API Gateway y DynamoDB para aplicaciones sin servidor con auto-scaling.',
    icon: Zap,
    path: '/serverless',
    tags: ['Lambda', 'API Gateway', 'DynamoDB'],
    color: 'var(--serverless)'
  },
  {
    title: '3 Capas (EC2)',
    description: 'Arquitectura clásica con ALB, EC2 Auto Scaling y RDS para aplicaciones monolíticas.',
    icon: Server,
    path: '/three-tier',
    tags: ['EC2', 'ALB', 'RDS'],
    color: 'var(--compute)'
  },
  {
    title: 'Event-Driven',
    description: 'SQS, SNS y Lambda para procesamiento asíncrono y desacoplamiento de servicios.',
    icon: BookOpen,
    path: '/event-driven',
    tags: ['SQS', 'SNS', 'Async'],
    color: 'var(--messaging)'
  },
  {
    title: 'Data Pipeline',
    description: 'Kinesis, S3, Glue y Athena para ingestión, procesamiento y análisis de datos.',
    icon: BookOpen,
    path: '/data-pipeline',
    tags: ['Kinesis', 'S3', 'Analytics'],
    color: 'var(--storage)'
  },
  {
    title: 'VPC Networking',
    description: 'Diseño de redes, subnets, route tables, NAT Gateway y VPC peering.',
    icon: Server,
    path: '/vpc-networking',
    tags: ['VPC', 'Subnets', 'Peering'],
    color: 'var(--network)'
  }
]

export function Home() {
  return (
    <div className="home-page animate-fade-in">
      <header className="home-header">
        <h1>AWS Arquitectura Cloud Profesional</h1>
        <p className="home-subtitle">
          Documentación técnica completa para aprender a diseñar, implementar y operar 
          infraestructura AWS a nivel enterprise. Incluye diagramas, comandos CLI y mejores prácticas.
        </p>
        <div className="home-badges">
          <span className="badge reutilizable">Reutilizable</span>
          <span className="badge critico">Crítico</span>
          <span className="badge depende">Contextual</span>
        </div>
      </header>

      <section className="architectures-grid">
        <h2>Patrones de Arquitectura</h2>
        <div className="grid">
          {architectures.map((arch) => (
            <Link key={arch.path} to={arch.path} className="arch-card">
              <div className="arch-icon" style={{ '--arch-color': arch.color } as React.CSSProperties}>
                <arch.icon size={28} />
              </div>
              <h3>{arch.title}</h3>
              <p>{arch.description}</p>
              <div className="arch-tags">
                {arch.tags.map((tag) => (
                  <span key={tag} className="arch-tag">{tag}</span>
                ))}
              </div>
              <div className="arch-arrow">
                <ArrowRight size={18} />
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="study-guide">
        <h2>Guía de Estudio Recomendada</h2>
        <div className="guide-steps">
          <div className="guide-step">
            <div className="step-number">1</div>
            <div className="step-content">
              <h4>Fundamentos de Red</h4>
              <p>Comienza con VPC Networking para entender cómo se conectan los recursos.</p>
            </div>
          </div>
          <div className="guide-step">
            <div className="step-number">2</div>
            <div className="step-content">
              <h4>Compute Básico</h4>
              <p>Aprende EC2 y arquitectura 3 capas antes de abordar Kubernetes.</p>
            </div>
          </div>
          <div className="guide-step">
            <div className="step-number">3</div>
            <div className="step-content">
              <h4>Contenedores</h4>
              <p>Domina EKS y orquestación para microservicios a escala.</p>
            </div>
          </div>
          <div className="guide-step">
            <div className="step-number">4</div>
            <div className="step-content">
              <h4>Serverless</h4>
              <p>Explora Lambda y servicios gestionados para agilidad.</p>
            </div>
          </div>
          <div className="guide-step">
            <div className="step-number">5</div>
            <div className="step-content">
              <h4>Eventos y Datos</h4>
              <p>Event-driven y data pipelines para arquitecturas avanzadas.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="conventions-section">
        <h2>Convenciones del Documento</h2>
        <div className="conventions-grid">
          <div className="convention-card reutilizable">
            <div className="convention-badge">[REUTILIZABLE]</div>
            <p>Patrones y configuraciones aplicables en múltiples proyectos y ambientes.</p>
          </div>
          <div className="convention-card critico">
            <div className="convention-badge">[CRÍTICO]</div>
            <p>Elementos de seguridad y configuración que requieren atención especial.</p>
          </div>
          <div className="convention-card depende">
            <div className="convention-badge">[DEPENDE]</div>
            <p>Componentes que varían según contexto: IDs, CIDRs, cuentas, ambientes.</p>
          </div>
        </div>
      </section>
    </div>
  )
}
