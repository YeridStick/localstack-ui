export type StudyDifficulty = "beginner" | "intermediate" | "advanced";

export interface GlossaryEntry {
  term: string;
  definition: string;
  tags: string[];
  difficulty: StudyDifficulty;
}

export interface BankQuizQuestion {
  key: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  tags: string[];
  difficulty: StudyDifficulty;
}

interface ScenarioQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  tags: string[];
  difficulty: StudyDifficulty;
}

interface BankGenerationInput {
  certificationGoal: string;
  focusTopic: string;
  difficulty: StudyDifficulty;
  questionCount: number;
  excludeKeys?: Set<string>;
}

interface BankGenerationResult {
  questions: BankQuizQuestion[];
  glossary: GlossaryEntry[];
  questionKeys: string[];
}

const GLOSSARY: GlossaryEntry[] = [
  {
    term: "Shared Responsibility Model",
    definition:
      "AWS asegura la infraestructura de nube, y el cliente asegura sus datos, configuraciones e identidades.",
    tags: ["fundamentos", "security"],
    difficulty: "beginner",
  },
  {
    term: "Region",
    definition:
      "Area geografica fisica que contiene varias zonas de disponibilidad aisladas.",
    tags: ["fundamentos", "networking", "reliability"],
    difficulty: "beginner",
  },
  {
    term: "Availability Zone",
    definition:
      "Centro de datos aislado dentro de una region, conectado con baja latencia a otras zonas.",
    tags: ["fundamentos", "reliability", "networking"],
    difficulty: "beginner",
  },
  {
    term: "IAM Policy",
    definition:
      "Documento JSON que define permisos permitidos o denegados sobre recursos de AWS.",
    tags: ["security", "iam"],
    difficulty: "beginner",
  },
  {
    term: "Least Privilege",
    definition:
      "Principio de otorgar solo los permisos minimos necesarios para realizar una tarea.",
    tags: ["security", "iam"],
    difficulty: "beginner",
  },
  {
    term: "S3",
    definition:
      "Servicio de almacenamiento de objetos altamente durable y escalable.",
    tags: ["storage", "fundamentos"],
    difficulty: "beginner",
  },
  {
    term: "EBS",
    definition:
      "Almacenamiento en bloques persistente para instancias EC2 dentro de una zona de disponibilidad.",
    tags: ["storage", "compute"],
    difficulty: "beginner",
  },
  {
    term: "EFS",
    definition:
      "Sistema de archivos elastico compatible con NFS para multiples instancias.",
    tags: ["storage", "compute"],
    difficulty: "beginner",
  },
  {
    term: "RDS",
    definition:
      "Servicio administrado para bases de datos relacionales con backups y parches automatizados.",
    tags: ["database", "operations"],
    difficulty: "beginner",
  },
  {
    term: "DynamoDB",
    definition:
      "Base de datos NoSQL administrada con baja latencia y escalado automatico.",
    tags: ["database", "serverless"],
    difficulty: "beginner",
  },
  {
    term: "VPC",
    definition:
      "Red virtual aislada logicamente para desplegar recursos en AWS con control de rutas y seguridad.",
    tags: ["networking", "security"],
    difficulty: "beginner",
  },
  {
    term: "Security Group",
    definition:
      "Firewall virtual stateful que controla trafico entrante y saliente de recursos.",
    tags: ["networking", "security"],
    difficulty: "beginner",
  },
  {
    term: "NACL",
    definition:
      "Lista de control de acceso stateless aplicada al nivel de subred en una VPC.",
    tags: ["networking", "security"],
    difficulty: "intermediate",
  },
  {
    term: "CloudWatch",
    definition:
      "Servicio de observabilidad para metricas, logs, alarmas y eventos operativos.",
    tags: ["operations", "monitoring"],
    difficulty: "beginner",
  },
  {
    term: "CloudTrail",
    definition:
      "Servicio de auditoria que registra llamadas API y actividad de cuenta.",
    tags: ["security", "operations", "governance"],
    difficulty: "beginner",
  },
  {
    term: "AWS Budgets",
    definition:
      "Herramienta para definir umbrales de costo o uso y recibir alertas.",
    tags: ["pricing", "governance"],
    difficulty: "beginner",
  },
  {
    term: "Savings Plans",
    definition:
      "Modelo de ahorro por compromiso de uso de computo durante 1 o 3 anos.",
    tags: ["pricing", "compute"],
    difficulty: "intermediate",
  },
  {
    term: "Reserved Instances",
    definition:
      "Compromiso de capacidad para EC2 o RDS que reduce costos frente a on-demand.",
    tags: ["pricing", "compute", "database"],
    difficulty: "intermediate",
  },
  {
    term: "On-Demand",
    definition:
      "Modelo de pago por uso sin compromiso, util para cargas variables o cortas.",
    tags: ["pricing"],
    difficulty: "beginner",
  },
  {
    term: "Auto Scaling",
    definition:
      "Ajuste automatico de capacidad segun demanda para mantener rendimiento y costos.",
    tags: ["compute", "reliability", "operations"],
    difficulty: "beginner",
  },
  {
    term: "Elastic Load Balancer",
    definition:
      "Distribuye trafico de red o HTTP/HTTPS entre multiples destinos saludables.",
    tags: ["networking", "reliability", "compute"],
    difficulty: "beginner",
  },
  {
    term: "Lambda",
    definition:
      "Computo serverless por eventos sin administrar servidores, con pago por invocacion.",
    tags: ["compute", "serverless", "fundamentos"],
    difficulty: "beginner",
  },
  {
    term: "EventBridge",
    definition:
      "Bus de eventos para enrutar eventos entre servicios y aplicaciones desacopladas.",
    tags: ["integration", "serverless"],
    difficulty: "intermediate",
  },
  {
    term: "SQS",
    definition:
      "Cola de mensajes administrada para desacoplar componentes de sistemas distribuidos.",
    tags: ["integration", "reliability"],
    difficulty: "beginner",
  },
  {
    term: "SNS",
    definition:
      "Servicio pub/sub para envio de notificaciones a multiples suscriptores.",
    tags: ["integration"],
    difficulty: "beginner",
  },
  {
    term: "KMS",
    definition:
      "Servicio administrado para crear y controlar claves de cifrado.",
    tags: ["security", "governance"],
    difficulty: "intermediate",
  },
  {
    term: "AWS Organizations",
    definition:
      "Servicio para administrar multiples cuentas y aplicar politicas centralizadas.",
    tags: ["governance", "security"],
    difficulty: "intermediate",
  },
  {
    term: "Well-Architected Framework",
    definition:
      "Conjunto de buenas practicas basado en seis pilares para evaluar arquitecturas.",
    tags: ["fundamentos", "architecture"],
    difficulty: "beginner",
  },
  {
    term: "Pillar: Operational Excellence",
    definition:
      "Pilar enfocado en ejecutar, monitorear y mejorar operaciones continuamente.",
    tags: ["architecture", "operations"],
    difficulty: "intermediate",
  },
  {
    term: "Pillar: Security",
    definition:
      "Pilar orientado a proteger datos, sistemas y activos mediante controles y trazabilidad.",
    tags: ["architecture", "security"],
    difficulty: "beginner",
  },
  {
    term: "Pillar: Reliability",
    definition:
      "Pilar orientado a recuperacion ante fallos y cumplimiento consistente de funciones.",
    tags: ["architecture", "reliability"],
    difficulty: "beginner",
  },
  {
    term: "Pillar: Performance Efficiency",
    definition:
      "Pilar que optimiza uso de recursos de computo y almacenamiento segun demanda.",
    tags: ["architecture", "compute"],
    difficulty: "intermediate",
  },
  {
    term: "Pillar: Cost Optimization",
    definition:
      "Pilar para evitar gastos innecesarios y alinear costos con valor de negocio.",
    tags: ["architecture", "pricing"],
    difficulty: "beginner",
  },
  {
    term: "Pillar: Sustainability",
    definition:
      "Pilar enfocado en reducir impacto ambiental mediante diseno y operacion eficientes.",
    tags: ["architecture", "governance"],
    difficulty: "intermediate",
  },
];

const SCENARIO_QUESTIONS: ScenarioQuestion[] = [
  {
    question:
      "Tu equipo necesita almacenar backups de archivos con alta durabilidad y acceso desde multiples servicios. Que opcion es la mas adecuada?",
    options: ["Amazon S3", "Amazon EBS", "Amazon EC2 Instance Store", "Amazon ElastiCache"],
    correctAnswer: "Amazon S3",
    explanation:
      "S3 es almacenamiento de objetos durable y escalable para backups y datos compartidos.",
    tags: ["storage", "fundamentos"],
    difficulty: "beginner",
  },
  {
    question:
      "Necesitas permisos granulares para que una aplicacion lea solo un bucket especifico. Que debes usar?",
    options: ["IAM Policy", "Security Group", "NACL", "AWS Shield Standard"],
    correctAnswer: "IAM Policy",
    explanation:
      "IAM Policy permite permisos finos por accion y recurso, como lectura sobre un bucket concreto.",
    tags: ["security", "iam"],
    difficulty: "beginner",
  },
  {
    question:
      "Quieres reducir costos de computo con compromiso de uso flexible entre instancias y serverless. Que conviene evaluar primero?",
    options: ["Savings Plans", "On-Demand solo", "Data transfer out", "Spot Fleet obligatoria"],
    correctAnswer: "Savings Plans",
    explanation:
      "Savings Plans aplica descuentos por compromiso de uso y ofrece flexibilidad segun tipo.",
    tags: ["pricing", "compute"],
    difficulty: "intermediate",
  },
  {
    question:
      "Tu aplicacion web debe soportar picos de trafico sin intervencion manual. Que combinacion es mas apropiada?",
    options: [
      "Auto Scaling + Elastic Load Balancer",
      "EBS + CloudTrail",
      "IAM + KMS",
      "S3 + Glacier solamente",
    ],
    correctAnswer: "Auto Scaling + Elastic Load Balancer",
    explanation:
      "ELB distribuye trafico y Auto Scaling ajusta capacidad automaticamente ante variaciones.",
    tags: ["compute", "reliability", "networking"],
    difficulty: "beginner",
  },
  {
    question:
      "Para auditar quien creo o elimino recursos en una cuenta, que servicio debes revisar?",
    options: ["CloudTrail", "CloudFront", "Trusted Advisor", "Route 53"],
    correctAnswer: "CloudTrail",
    explanation: "CloudTrail registra llamadas API y actividad de cuenta para auditoria.",
    tags: ["security", "operations", "governance"],
    difficulty: "beginner",
  },
  {
    question:
      "Que servicio de AWS se usa para ejecutar codigo por eventos sin administrar servidores?",
    options: ["Lambda", "EC2", "EKS", "RDS"],
    correctAnswer: "Lambda",
    explanation: "Lambda es el servicio serverless de computo orientado a eventos.",
    tags: ["compute", "serverless", "fundamentos"],
    difficulty: "beginner",
  },
  {
    question:
      "Que mecanismo de seguridad en VPC es stateless y funciona a nivel de subred?",
    options: ["NACL", "Security Group", "IAM Role", "AWS WAF Rule Group"],
    correctAnswer: "NACL",
    explanation: "Las NACL son stateless y se aplican por subred.",
    tags: ["networking", "security"],
    difficulty: "intermediate",
  },
  {
    question:
      "Tu objetivo es desacoplar servicios para procesar tareas asincronas con tolerancia a picos. Que servicio encaja mejor?",
    options: ["SQS", "Route 53", "CloudFront", "AWS Batch"],
    correctAnswer: "SQS",
    explanation: "SQS desacopla productores y consumidores mediante colas administradas.",
    tags: ["integration", "reliability"],
    difficulty: "beginner",
  },
  {
    question:
      "Que opcion describe mejor el principio de least privilege?",
    options: [
      "Dar solo los permisos minimos para cada tarea",
      "Permitir acceso total a administradores y usuarios",
      "Usar siempre credenciales raiz en scripts",
      "Bloquear todo acceso sin excepciones",
    ],
    correctAnswer: "Dar solo los permisos minimos para cada tarea",
    explanation: "Least privilege reduce superficie de ataque y errores operativos.",
    tags: ["security", "iam"],
    difficulty: "beginner",
  },
  {
    question:
      "Que servicio te ayuda a definir alertas cuando el gasto mensual supera un umbral?",
    options: ["AWS Budgets", "AWS Artifact", "AWS Audit Manager", "AWS Config Recorder"],
    correctAnswer: "AWS Budgets",
    explanation:
      "AWS Budgets permite crear alertas por costo, uso o cobertura de reservas.",
    tags: ["pricing", "governance"],
    difficulty: "beginner",
  },
  {
    question:
      "Cual es la mejor opcion para una base de datos relacional administrada?",
    options: ["RDS", "DynamoDB", "S3", "EFS"],
    correctAnswer: "RDS",
    explanation: "RDS esta disenado para motores relacionales con gestion automatizada.",
    tags: ["database", "operations"],
    difficulty: "beginner",
  },
  {
    question:
      "Que pilar Well-Architected se centra en recuperacion ante fallos y continuidad del servicio?",
    options: ["Reliability", "Sustainability", "Cost Optimization", "Operational Excellence"],
    correctAnswer: "Reliability",
    explanation: "Reliability aborda tolerancia a fallos, recuperacion y continuidad.",
    tags: ["architecture", "reliability"],
    difficulty: "intermediate",
  },
];

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildQuestionKey(question: string, answer: string): string {
  return normalizeText(`${question}::${answer}`).slice(0, 120);
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function difficultyRank(value: StudyDifficulty): number {
  if (value === "advanced") return 3;
  if (value === "intermediate") return 2;
  return 1;
}

function matchesDifficulty(
  requested: StudyDifficulty,
  candidate: StudyDifficulty,
): boolean {
  const req = difficultyRank(requested);
  const cand = difficultyRank(candidate);
  return cand <= req || Math.random() > 0.55;
}

function deriveFocusTags(focusTopic: string, certificationGoal: string): Set<string> {
  const raw = normalizeText(`${focusTopic} ${certificationGoal}`);
  const tags = new Set<string>();

  if (
    raw.includes("fundamentos") ||
    raw.includes("cloud-practitioner") ||
    raw.includes("practitioner")
  ) {
    [
      "fundamentos",
      "security",
      "pricing",
      "compute",
      "storage",
      "networking",
      "operations",
      "reliability",
      "integration",
      "architecture",
    ].forEach((tag) => tags.add(tag));
  }

  if (raw.includes("iam") || raw.includes("security")) tags.add("security");
  if (raw.includes("s3") || raw.includes("storage")) tags.add("storage");
  if (raw.includes("vpc") || raw.includes("network")) tags.add("networking");
  if (raw.includes("lambda") || raw.includes("serverless")) tags.add("serverless");
  if (raw.includes("cost") || raw.includes("precio") || raw.includes("pricing")) {
    tags.add("pricing");
  }
  if (raw.includes("monitor") || raw.includes("cloudwatch")) tags.add("operations");
  if (raw.includes("database") || raw.includes("rds") || raw.includes("dynamodb")) {
    tags.add("database");
  }
  if (raw.includes("event") || raw.includes("sqs") || raw.includes("sns")) {
    tags.add("integration");
  }

  if (tags.size === 0) {
    [
      "fundamentos",
      "security",
      "pricing",
      "compute",
      "storage",
      "networking",
      "operations",
      "integration",
    ].forEach((tag) => tags.add(tag));
  }

  return tags;
}

function pickDistractors(
  source: GlossaryEntry[],
  currentTerm: string,
  count: number,
): string[] {
  return shuffle(
    source
      .filter((entry) => entry.term !== currentTerm)
      .map((entry) => entry.definition),
  ).slice(0, count);
}

function buildDefinitionQuestions(
  glossary: GlossaryEntry[],
  requestedDifficulty: StudyDifficulty,
): BankQuizQuestion[] {
  return glossary
    .filter((entry) => matchesDifficulty(requestedDifficulty, entry.difficulty))
    .map((entry) => {
      const distractors = pickDistractors(glossary, entry.term, 3);
      const options = shuffle([entry.definition, ...distractors]).slice(0, 4);

      return {
        key: buildQuestionKey(
          `Que describe mejor el termino AWS ${entry.term}?`,
          entry.definition,
        ),
        question: `Que describe mejor el termino AWS "${entry.term}"?`,
        options,
        correctAnswer: entry.definition,
        explanation: `La opcion correcta define ${entry.term} en el contexto de arquitectura AWS.`,
        tags: entry.tags,
        difficulty: entry.difficulty,
      };
    });
}

function buildScenarioQuestionPool(
  focusTags: Set<string>,
  requestedDifficulty: StudyDifficulty,
): BankQuizQuestion[] {
  return SCENARIO_QUESTIONS
    .filter((item) => {
      const tagMatch = item.tags.some((tag) => focusTags.has(tag));
      return tagMatch && matchesDifficulty(requestedDifficulty, item.difficulty);
    })
    .map((item) => ({
      ...item,
      key: buildQuestionKey(item.question, item.correctAnswer),
    }));
}

function uniqueByKey(items: BankQuizQuestion[]): BankQuizQuestion[] {
  const map = new Map<string, BankQuizQuestion>();
  for (const item of items) {
    if (!map.has(item.key)) map.set(item.key, item);
  }
  return Array.from(map.values());
}

function buildRelevantGlossary(
  focusTags: Set<string>,
  requestedDifficulty: StudyDifficulty,
): GlossaryEntry[] {
  const direct = GLOSSARY.filter(
    (entry) =>
      entry.tags.some((tag) => focusTags.has(tag)) &&
      matchesDifficulty(requestedDifficulty, entry.difficulty),
  );

  if (direct.length >= 12) return direct;

  const expanded = [
    ...direct,
    ...GLOSSARY.filter((entry) => !direct.some((d) => d.term === entry.term)),
  ];
  return expanded;
}

function selectGlossaryForQuestions(
  questions: BankQuizQuestion[],
  fallback: GlossaryEntry[],
): GlossaryEntry[] {
  const tags = new Set<string>();
  questions.forEach((question) => question.tags.forEach((tag) => tags.add(tag)));

  const candidates = fallback.filter((entry) =>
    entry.tags.some((tag) => tags.has(tag)),
  );
  const selected = (candidates.length > 0 ? candidates : fallback).slice(0, 18);

  const unique = new Map<string, GlossaryEntry>();
  selected.forEach((entry) => {
    if (!unique.has(entry.term)) unique.set(entry.term, entry);
  });

  return Array.from(unique.values());
}

export function generateQuizFromBank({
  certificationGoal,
  focusTopic,
  difficulty,
  questionCount,
  excludeKeys,
}: BankGenerationInput): BankGenerationResult {
  const focusTags = deriveFocusTags(focusTopic, certificationGoal);
  const glossaryBase = buildRelevantGlossary(focusTags, difficulty);
  const definitionQuestions = buildDefinitionQuestions(glossaryBase, difficulty);
  const scenarioQuestions = buildScenarioQuestionPool(focusTags, difficulty);

  const pool = uniqueByKey(shuffle([...definitionQuestions, ...scenarioQuestions]));
  const selected: BankQuizQuestion[] = [];

  for (const question of pool) {
    if (selected.length >= questionCount) break;
    if (excludeKeys?.has(question.key)) continue;
    selected.push(question);
  }

  const selectedGlossary = selectGlossaryForQuestions(selected, glossaryBase);
  const questionKeys = selected.map((question) => question.key);

  return {
    questions: selected,
    glossary: selectedGlossary,
    questionKeys,
  };
}
