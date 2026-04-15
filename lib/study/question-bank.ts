export type StudyDifficulty = "beginner" | "intermediate" | "advanced";
export type ExamDomain =
  | "Cloud Concepts"
  | "Security and Compliance"
  | "Technology"
  | "Billing and Pricing";

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
  domain: ExamDomain;
  difficulty: StudyDifficulty;
}

export interface ExamBlueprintEntry {
  domain: ExamDomain;
  weightPercent: number;
  targetQuestions: number;
}

export interface StudySourceReference {
  id: string;
  title: string;
  url: string;
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

interface MockExamGenerationInput {
  certificationGoal: string;
  focusTopic: string;
  difficulty: StudyDifficulty;
  totalQuestions: number;
  excludeKeys?: Set<string>;
}

interface MockExamGenerationResult {
  questions: BankQuizQuestion[];
  questionKeys: string[];
  blueprint: ExamBlueprintEntry[];
  availablePool: number;
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

const STUDY_SOURCE_CATALOG: StudySourceReference[] = [
  {
    id: "clf-c02-guide",
    title: "AWS Certified Cloud Practitioner - Exam Guide",
    url: "https://d1.awsstatic.com/training-and-certification/docs-cloud-practitioner/AWS-Certified-Cloud-Practitioner_Exam-Guide.pdf",
  },
  {
    id: "well-architected",
    title: "AWS Well-Architected Framework",
    url: "https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html",
  },
  {
    id: "iam-best-practices",
    title: "IAM Security Best Practices",
    url: "https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html",
  },
  {
    id: "iam-policies",
    title: "IAM Policies - User Guide",
    url: "https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies.html",
  },
  {
    id: "s3-user-guide",
    title: "Amazon S3 User Guide",
    url: "https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html",
  },
  {
    id: "ec2-user-guide",
    title: "Amazon EC2 User Guide",
    url: "https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/concepts.html",
  },
  {
    id: "lambda-guide",
    title: "AWS Lambda Developer Guide",
    url: "https://docs.aws.amazon.com/lambda/latest/dg/welcome.html",
  },
  {
    id: "vpc-guide",
    title: "Amazon VPC User Guide",
    url: "https://docs.aws.amazon.com/vpc/latest/userguide/what-is-amazon-vpc.html",
  },
  {
    id: "rds-guide",
    title: "Amazon RDS User Guide",
    url: "https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Welcome.html",
  },
  {
    id: "dynamodb-guide",
    title: "Amazon DynamoDB Developer Guide",
    url: "https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Introduction.html",
  },
  {
    id: "cloudwatch-guide",
    title: "Amazon CloudWatch User Guide",
    url: "https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/WhatIsCloudWatch.html",
  },
  {
    id: "cloudtrail-guide",
    title: "AWS CloudTrail User Guide",
    url: "https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-user-guide.html",
  },
  {
    id: "billing-guide",
    title: "Billing and Cost Management User Guide",
    url: "https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/billing-what-is.html",
  },
  {
    id: "budgets-guide",
    title: "AWS Budgets User Guide",
    url: "https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-managing-costs.html",
  },
  {
    id: "sqs-guide",
    title: "Amazon SQS Developer Guide",
    url: "https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/welcome.html",
  },
  {
    id: "eventbridge-guide",
    title: "Amazon EventBridge User Guide",
    url: "https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-what-is.html",
  },
];

const TAG_SOURCE_MAP: Record<string, string[]> = {
  fundamentos: ["clf-c02-guide", "well-architected"],
  architecture: ["well-architected", "clf-c02-guide"],
  security: ["iam-best-practices", "clf-c02-guide"],
  iam: ["iam-policies", "iam-best-practices"],
  storage: ["s3-user-guide", "clf-c02-guide"],
  compute: ["ec2-user-guide", "lambda-guide"],
  serverless: ["lambda-guide", "eventbridge-guide"],
  networking: ["vpc-guide", "clf-c02-guide"],
  database: ["rds-guide", "dynamodb-guide"],
  operations: ["cloudwatch-guide", "cloudtrail-guide"],
  monitoring: ["cloudwatch-guide"],
  governance: ["cloudtrail-guide", "billing-guide"],
  pricing: ["billing-guide", "budgets-guide", "clf-c02-guide"],
  integration: ["sqs-guide", "eventbridge-guide"],
  reliability: ["well-architected", "vpc-guide"],
};

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

export function getStudySourcesForTags(
  tags: string[],
  limit = 4,
): StudySourceReference[] {
  const sourceIds = new Set<string>();

  for (const tag of tags) {
    const mapped = TAG_SOURCE_MAP[tag] || [];
    mapped.forEach((id) => sourceIds.add(id));
  }

  if (sourceIds.size === 0) {
    sourceIds.add("clf-c02-guide");
  }

  const catalogById = new Map(
    STUDY_SOURCE_CATALOG.map((source) => [source.id, source]),
  );

  const selected: StudySourceReference[] = [];
  for (const id of sourceIds) {
    const source = catalogById.get(id);
    if (!source) continue;
    selected.push(source);
    if (selected.length >= Math.max(limit, 1)) break;
  }

  return selected;
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

function domainFromTags(tags: string[]): ExamDomain {
  if (tags.some((tag) => ["pricing"].includes(tag))) {
    return "Billing and Pricing";
  }

  if (tags.some((tag) => ["security", "iam", "governance"].includes(tag))) {
    return "Security and Compliance";
  }

  if (
    tags.some((tag) =>
      ["fundamentos", "reliability", "regions", "availability-zones"].includes(
        tag,
      ),
    )
  ) {
    return "Cloud Concepts";
  }

  return "Technology";
}

function buildCertificationBlueprint(
  certificationGoal: string,
  totalQuestions: number,
): ExamBlueprintEntry[] {
  const normalized = normalizeText(certificationGoal);
  const cloudPractitioner =
    normalized.includes("cloud-practitioner") ||
    normalized.includes("practitioner");

  const weights: Array<{ domain: ExamDomain; weightPercent: number }> =
    cloudPractitioner
      ? [
          { domain: "Cloud Concepts", weightPercent: 24 },
          { domain: "Security and Compliance", weightPercent: 30 },
          { domain: "Technology", weightPercent: 34 },
          { domain: "Billing and Pricing", weightPercent: 12 },
        ]
      : [
          { domain: "Cloud Concepts", weightPercent: 25 },
          { domain: "Security and Compliance", weightPercent: 25 },
          { domain: "Technology", weightPercent: 35 },
          { domain: "Billing and Pricing", weightPercent: 15 },
        ];

  const withTargets = weights.map((item) => {
    const exact = (item.weightPercent / 100) * totalQuestions;
    return {
      ...item,
      targetQuestions: Math.floor(exact),
      remainder: exact - Math.floor(exact),
    };
  });

  let assigned = withTargets.reduce(
    (sum, item) => sum + item.targetQuestions,
    0,
  );
  let remaining = Math.max(totalQuestions - assigned, 0);

  const sorted = [...withTargets].sort((a, b) => b.remainder - a.remainder);
  let cursor = 0;
  while (remaining > 0 && sorted.length > 0) {
    sorted[cursor % sorted.length].targetQuestions += 1;
    remaining -= 1;
    cursor += 1;
  }

  assigned = withTargets.reduce((sum, item) => sum + item.targetQuestions, 0);
  if (assigned !== totalQuestions && withTargets.length > 0) {
    const diff = totalQuestions - assigned;
    withTargets[0].targetQuestions += diff;
  }

  return withTargets.map((item) => ({
    domain: item.domain,
    weightPercent: item.weightPercent,
    targetQuestions: item.targetQuestions,
  }));
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
  const termPool = glossary.map((entry) => entry.term);

  return glossary.flatMap((entry) => {
    if (!matchesDifficulty(requestedDifficulty, entry.difficulty)) {
      return [];
    }

    const distractorDefinitions = pickDistractors(glossary, entry.term, 3);
    const definitionOptions = shuffle([entry.definition, ...distractorDefinitions]).slice(
      0,
      4,
    );

    const distractorTerms = shuffle(
      termPool.filter((term) => term !== entry.term),
    ).slice(0, 3);
    const termOptions = shuffle([entry.term, ...distractorTerms]).slice(0, 4);

    const domain = domainFromTags(entry.tags);

    return [
      {
        key: buildQuestionKey(
          `Que describe mejor el termino AWS ${entry.term}?`,
          entry.definition,
        ),
        question: `Que describe mejor el termino AWS "${entry.term}"?`,
        options: definitionOptions,
        correctAnswer: entry.definition,
        explanation: `La opcion correcta define ${entry.term} en el contexto de arquitectura AWS.`,
        tags: entry.tags,
        domain,
        difficulty: entry.difficulty,
      },
      {
        key: buildQuestionKey(
          `Que servicio o concepto coincide con esta definicion: ${entry.definition}`,
          entry.term,
        ),
        question: `Que servicio o concepto coincide con esta definicion: "${entry.definition}"?`,
        options: termOptions,
        correctAnswer: entry.term,
        explanation: `La respuesta correcta es ${entry.term} segun su definicion oficial resumida.`,
        tags: entry.tags,
        domain,
        difficulty: entry.difficulty,
      },
    ];
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
      domain: domainFromTags(item.tags),
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

export function generateMockExamFromBank({
  certificationGoal,
  focusTopic,
  difficulty,
  totalQuestions,
  excludeKeys,
}: MockExamGenerationInput): MockExamGenerationResult {
  const safeTotal = Math.min(Math.max(totalQuestions, 5), 80);
  const focusTags = deriveFocusTags(focusTopic, certificationGoal);
  const glossaryBase = buildRelevantGlossary(focusTags, difficulty);
  const definitionQuestions = buildDefinitionQuestions(glossaryBase, difficulty);
  const scenarioQuestions = buildScenarioQuestionPool(focusTags, difficulty);
  const pool = uniqueByKey(shuffle([...definitionQuestions, ...scenarioQuestions])).filter(
    (question) => !excludeKeys?.has(question.key),
  );

  const blueprint = buildCertificationBlueprint(certificationGoal, safeTotal);
  const selected: BankQuizQuestion[] = [];

  for (const slice of blueprint) {
    const domainPool = pool.filter((question) => question.domain === slice.domain);
    const needed = Math.max(slice.targetQuestions, 0);

    for (const question of domainPool) {
      if (selected.length >= safeTotal) break;
      if (selected.some((item) => item.key === question.key)) continue;
      if (
        selected.filter((item) => item.domain === slice.domain).length >= needed
      ) {
        break;
      }
      selected.push(question);
    }
  }

  if (selected.length < safeTotal) {
    for (const question of pool) {
      if (selected.length >= safeTotal) break;
      if (selected.some((item) => item.key === question.key)) continue;
      selected.push(question);
    }
  }

  const questionKeys = selected.map((question) => question.key);

  return {
    questions: selected,
    questionKeys,
    blueprint,
    availablePool: pool.length,
  };
}
