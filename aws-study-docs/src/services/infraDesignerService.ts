// Servicio de IA para diseño de infraestructura
// Analiza requerimientos y genera recomendaciones + diagramas

const OLLAMA_BASE_URL = 'http://localhost:11434'

export interface DiagramNode {
  id: string
  type: string
  label: string
  x: number
  y: number
  details?: string
  tier?: 'frontend' | 'backend' | 'data'
}

export interface DiagramConnection {
  from: string
  to: string
  label: string
  type: string
}

export interface Diagram {
  nodes: DiagramNode[]
  connections: DiagramConnection[]
}

export interface Requirements {
  appType: string
  description: string
  concurrentUsers: string
  trafficPeak: string
  budget: string
  region: string
  latency: string
  compliance: string
  needsDatabase: boolean
  databaseType: string
  needsCache: boolean
  needsQueue: boolean
  deploymentType: string
  opsTeam: string
}

export interface InfrastructureAnalysis {
  success: boolean
  analysis: string | null
  diagram: Diagram | null
  error?: string
  requirements?: Requirements
}

export interface CostEstimate {
  total: number
  breakdown: Array<{ service: string; cost: number; details: string }>
  range: { min: number; max: number }
}

const INFRA_DESIGNER_CONTEXT = `
Eres un Arquitecto de Soluciones Cloud Senior especializado en AWS.
Tu tarea es analizar requerimientos de aplicaciones y diseñar la infraestructura AWS óptima.

Debes:
1. Analizar carga de trabajo, concurrencia, presupuesto y restricciones
2. Recomendar servicios AWS específicos con justificación técnica
3. Generar diagramas de arquitectura en formato estructurado (JSON)
4. Estimar costos aproximados
5. Identificar riesgos y mitigaciones

Formato de respuesta:
- ANÁLISIS: Evaluación de requerimientos
- ARQUITECTURA_RECOMENDADA: Componentes específicos con versión (ej: RDS PostgreSQL 15, EKS 1.28)
- DIAGRAMA_JSON: Representación estructurada del diagrama
- ESTIMACION_COSTOS: Rango mensual aproximado en USD
- RIESGOS: Lista de riesgos potenciales
- MEJORAS_FUTURAS: Escalabilidad y evolución

Para el diagrama JSON, usa esta estructura:
{
  "nodes": [
    { "id": "unique-id", "type": "user|cdn|alb|ec2|lambda|rds|s3|cache|queue", 
      "label": "Nombre visible", "x": 100, "y": 100, 
      "details": "descripción técnica", "tier": "frontend|backend|data" }
  ],
  "connections": [
    { "from": "node-id-1", "to": "node-id-2", "label": "protocolo/puerto", "type": "http|https|tcp|internal" }
  ]
}

Tipos de nodos disponibles:
- user: Usuarios/Clientes
- cdn: CloudFront
- dns: Route 53
- alb: Application Load Balancer
- nlb: Network Load Balancer
- api: API Gateway
- ec2: Instancias EC2
- asg: Auto Scaling Group
- ecs: ECS Cluster
- eks: EKS Cluster
- fargate: Fargate Tasks
- lambda: Lambda Functions
- rds: RDS Database
- dynamo: DynamoDB
- elasticache: ElastiCache
- s3: S3 Bucket
- sns: SNS Topic
- sqs: SQS Queue
- eventbridge: EventBridge
- cognito: Cognito
- secrets: Secrets Manager
- cloudwatch: CloudWatch
- waf: WAF

Justifica cada decisión técnica basándote en:
- Costo-efectividad
- Escalabilidad automática
- Alta disponibilidad
- Seguridad
- Mantenibilidad
`

/**
 * Analizar requerimientos y generar recomendación de infraestructura
 */
export async function analyzeInfrastructure(
  requirements: Requirements,
  model: string = 'gemma4:e4b'
): Promise<InfrastructureAnalysis> {
  const prompt = `Analiza estos requerimientos y diseña la infraestructura AWS óptima:

REQUERIMIENTOS:
- Tipo de aplicación: ${requirements.appType}
- Descripción: ${requirements.description}
- Usuarios concurrentes esperados: ${requirements.concurrentUsers}
- Pico de tráfico: ${requirements.trafficPeak}
- Presupuesto mensual: ${requirements.budget}
- Región AWS preferida: ${requirements.region}
- Requisitos de latencia: ${requirements.latency}
- Requisitos de cumplimiento: ${requirements.compliance}
- Necesita base de datos: ${requirements.needsDatabase ? 'Sí - ' + requirements.databaseType : 'No'}
- Necesita caché: ${requirements.needsCache ? 'Sí' : 'No'}
- Necesita colas/mensajería: ${requirements.needsQueue ? 'Sí' : 'No'}
- Tipo de despliegue preferido: ${requirements.deploymentType}
- Equipo de operaciones: ${requirements.opsTeam}

Genera una respuesta completa con:
1. ANÁLISIS breve de los requerimientos
2. ARQUITECTURA_RECOMENDADA con componentes específicos
3. DIAGRAMA_JSON con la estructura solicitada
4. ESTIMACION_COSTOS mensual aproximado
5. RIESGOS identificados
6. MEJORAS_FUTURAS recomendadas`

  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: INFRA_DESIGNER_CONTEXT },
          { role: 'user', content: prompt }
        ],
        stream: false,
        options: {
          temperature: 0.7,
          num_predict: 4096
        }
      })
    })

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.status}`)
    }

    const data = await response.json()
    const content = data.message?.content || ''

    // Extraer diagrama JSON de la respuesta
    const diagramMatch = content.match(/```json\s*([\s\S]*?)```/) ||
      content.match(/DIAGRAMA_JSON:?\s*([\s\S]*?)(?=ESTIMACION_COSTOS|RIESGOS|$)/i)

    let diagram: Diagram | null = null
    if (diagramMatch) {
      try {
        const jsonStr = diagramMatch[1].trim()
        diagram = JSON.parse(jsonStr)
      } catch (e) {
        console.error('Error parsing diagram JSON:', e)
      }
    }

    return {
      success: true,
      analysis: content,
      diagram: diagram,
      requirements: requirements
    }
  } catch (error) {
    console.error('Infrastructure Designer Error:', error)
    return {
      success: false,
      error: (error as Error).message,
      analysis: null,
      diagram: null
    }
  }
}

/**
 * Refinar o modificar un diagrama existente
 */
export async function refineInfrastructure(
  currentDiagram: Diagram,
  modificationRequest: string,
  model: string = 'gemma4:e4b'
): Promise<{ success: boolean; diagram?: Diagram; error?: string }> {
  const prompt = `Tengo esta infraestructura actual representada en JSON:

${JSON.stringify(currentDiagram, null, 2)}

El usuario solicita esta modificación: "${modificationRequest}"

Actualiza el diagrama JSON según la solicitud. Mantén la estructura:
- nodes: array de nodos con id, type, label, x, y, details, tier
- connections: array de conexiones con from, to, label, type

Responde únicamente con el JSON actualizado, sin explicaciones adicionales.`

  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: 'Eres un experto en arquitectura AWS. Responde solo con JSON válido.' },
          { role: 'user', content: prompt }
        ],
        stream: false,
        options: {
          temperature: 0.5,
          num_predict: 2048
        }
      })
    })

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.status}`)
    }

    const data = await response.json()
    const content = data.message?.content || ''

    // Extraer JSON
    const jsonMatch = content.match(/```json\s*([\s\S]*?)```/) ||
      content.match(/(\{[\s\S]*\})/)

    if (jsonMatch) {
      try {
        const updatedDiagram = JSON.parse(jsonMatch[1].trim())
        return { success: true, diagram: updatedDiagram }
      } catch (e) {
        return { success: false, error: 'Invalid JSON in response' }
      }
    }

    return { success: false, error: 'No JSON found in response' }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}

// Costos aproximados por servicio (us-east-1, rough estimates)
const COST_ESTIMATES: Record<string, { hourly?: number; monthly?: number; perGB?: number; perRequest?: number }> = {
  'ec2.t3.micro': { hourly: 0.0104, monthly: 7.5 },
  'ec2.t3.small': { hourly: 0.0208, monthly: 15 },
  'ec2.t3.medium': { hourly: 0.0416, monthly: 30 },
  'ec2.t3.large': { hourly: 0.0832, monthly: 60 },
  'ec2.m5.large': { hourly: 0.096, monthly: 70 },
  'rds.db.t3.micro': { hourly: 0.017, monthly: 12 },
  'rds.db.t3.small': { hourly: 0.034, monthly: 25 },
  'rds.db.t3.medium': { hourly: 0.068, monthly: 50 },
  'alb': { hourly: 0.0225, monthly: 16.5 },
  'nlb': { hourly: 0.0225, monthly: 16.5 },
  's3': { perGB: 0.023 },
  'cloudfront': { perGB: 0.085 },
  'lambda': { perRequest: 0.0000002 },
  'api_gateway': { perRequest: 0.000003 },
  'elasticache.t3.micro': { hourly: 0.012, monthly: 9 },
  'sqs': { perRequest: 0.0000004 },
  'sns': { perRequest: 0.0000005 },
  'route53': { perRequest: 0.0000004 }
}

/**
 * Calcular costo estimado basado en nodos del diagrama
 */
export function estimateCost(nodes: DiagramNode[]): CostEstimate {
  let total = 0
  const breakdown: Array<{ service: string; cost: number; details: string }> = []

  nodes.forEach(node => {
    let cost = 0
    let details = ''

    switch (node.type) {
      case 'ec2':
        cost = COST_ESTIMATES['ec2.t3.medium'].monthly || 0
        details = 't3.medium (2 vCPU, 4GB RAM)'
        break
      case 'rds':
        cost = COST_ESTIMATES['rds.db.t3.small'].monthly || 0
        details = 'db.t3.small + storage'
        break
      case 'alb':
        cost = COST_ESTIMATES['alb'].monthly || 0
        details = 'ALB + LCU'
        break
      case 'nlb':
        cost = COST_ESTIMATES['nlb'].monthly || 0
        details = 'NLB + NLCU'
        break
      case 'elasticache':
        cost = COST_ESTIMATES['elasticache.t3.micro'].monthly || 0
        details = 'cache.t3.micro'
        break
      case 'lambda':
        cost = 10 // estimado variable
        details = 'Variable por invocaciones'
        break
      case 's3':
        cost = 5
        details = 'Primeros 50GB + transferencia'
        break
      case 'cloudfront':
        cost = 15
        details = 'Transferencia variable'
        break
      case 'api':
        cost = 10
        details = 'API Gateway REST'
        break
      case 'sqs':
        cost = 2
        details = 'Variable por mensajes'
        break
      case 'sns':
        cost = 2
        details = 'Variable por notificaciones'
        break
      case 'secrets':
        cost = 0.40
        details = 'Por secreto almacenado'
        break
      default:
        cost = 0
    }

    if (cost > 0) {
      total += cost
      breakdown.push({ service: node.label || node.type, cost, details })
    }
  })

  // Añadir costos base
  const dataTransfer = 20
  total += dataTransfer
  breakdown.push({ service: 'Data Transfer', cost: dataTransfer, details: 'Estimado' })

  return {
    total: Math.round(total),
    breakdown,
    range: {
      min: Math.round(total * 0.8),
      max: Math.round(total * 1.5)
    }
  }
}
