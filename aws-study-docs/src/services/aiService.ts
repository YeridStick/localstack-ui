// Servicio para integración con modelos IA locales via Ollama API
// Soporta gemma4:e4b y gemma4:e2b

const OLLAMA_BASE_URL = 'http://localhost:11434'

export const AVAILABLE_MODELS = [
  { id: 'gemma4:e4b', name: 'Gemma 4B', description: 'Modelo balanceado para respuestas rápidas' },
  { id: 'gemma4:e2b', name: 'Gemma 2B', description: 'Modelo ligero para respuestas instantáneas' }
]

// Contexto de AWS para enriquecer las preguntas
const AWS_CONTEXT = `
Eres un asistente experto en AWS (Amazon Web Services) y arquitectura cloud.
Tienes acceso a documentación sobre: VPC, EC2, S3, RDS, Lambda, EKS, IAM, CloudFormation, 
Networking, Seguridad, y mejores prácticas de infraestructura.

Reglas:
1. Responde de manera concisa y profesional
2. Incluye comandos AWS CLI cuando sea relevante
3. Proporciona pasos numerados para guías
4. Si detectas un problema específico, ofrece soluciones paso a paso
5. Sugiere recursos relacionados de la documentación

Formato de respuesta:
- Respuesta directa
- Comandos/ejemplos (si aplica)
- Pasos siguientes recomendados
- Recursos relacionados en la documentación
`

export interface AIMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface AIResponse {
  success: boolean
  content: string | null
  error?: string
  model?: string
}

/**
 * Enviar mensaje al modelo IA
 */
export async function sendMessageToAI(
  message: string,
  model: string = 'gemma4:e4b',
  conversationHistory: AIMessage[] = []
): Promise<AIResponse> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: AWS_CONTEXT },
          ...conversationHistory,
          { role: 'user', content: message }
        ],
        stream: false,
        options: {
          temperature: 0.7,
          num_predict: 2048
        }
      })
    })

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.status}`)
    }

    const data = await response.json()
    return {
      success: true,
      content: data.message?.content || 'No response from model',
      model: model
    }
  } catch (error) {
    console.error('AI Service Error:', error)
    return {
      success: false,
      error: (error as Error).message,
      content: null
    }
  }
}

/**
 * Verificar si Ollama está disponible
 */
export async function checkOllamaStatus(): Promise<boolean> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      method: 'GET'
    })
    return response.ok
  } catch {
    return false
  }
}

/**
 * Obtener lista de modelos disponibles en Ollama
 */
export async function getAvailableModels(): Promise<string[]> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`)
    if (!response.ok) return []

    const data = await response.json()
    return data.models?.map((m: { name: string }) => m.name) || []
  } catch {
    return []
  }
}

/**
 * Generar guía paso a paso para infraestructura
 */
export interface GuideStep {
  number: number
  title: string
  description: string
  commands: string[]
  commonIssues?: string[]
  estimatedTime?: string
}

export interface InfraGuide {
  title: string
  estimatedTime?: string
  prerequisites?: string[]
  steps: GuideStep[]
}

export async function generateInfraGuide(
  goal: string,
  model: string = 'gemma4:e4b'
): Promise<InfraGuide | null> {
  const prompt = `Genera una guía paso a paso detallada para: "${goal}"

Estructura requerida:
1. Prerrequisitos (comandos AWS CLI necesarios)
2. Paso 1: [Título] - Comando(s) específicos
3. Paso 2: [Título] - Comando(s) específicos
...
N. Verificación - Cómo confirmar que todo funciona

Para cada paso incluye:
- Descripción breve
- Comando AWS CLI completo
- Posibles errores comunes y cómo evitarlos
- Tiempo estimado

Formato JSON:
{
  "title": "...",
  "estimatedTime": "...",
  "prerequisites": [...],
  "steps": [
    {
      "number": 1,
      "title": "...",
      "description": "...",
      "commands": [...],
      "commonIssues": [...],
      "estimatedTime": "..."
    }
  ]
}`

  const response = await sendMessageToAI(prompt, model)

  if (!response.success) return null

  try {
    const jsonMatch = response.content?.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
    return { title: goal, steps: [{ number: 1, title: 'Guía', description: response.content || '', commands: [] }] }
  } catch {
    return { title: goal, steps: [{ number: 1, title: 'Guía', description: response.content || '', commands: [] }] }
  }
}
