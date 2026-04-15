export type StudyDifficulty = "beginner" | "intermediate" | "advanced";

export interface StudyModule {
  id: string;
  title: string;
  domain: string;
  focus: string[];
  difficulty: StudyDifficulty;
  objectives: string[];
  practicalGoals: string[];
  estimatedMinutes: number;
}

export interface StudyLab {
  id: string;
  title: string;
  difficulty: StudyDifficulty;
  services: string[];
  serviceRoute: string;
  awsConsolePath: string;
  localstackEquivalent: string;
  expectedResult: string;
  steps: string[];
  validationChecklist: string[];
}

export interface AwsParityNote {
  area: string;
  awsRealBehavior: string;
  localSimulationBehavior: string;
  recommendation: string;
}

export interface StudyRoutineDay {
  day: string;
  objective: string;
  modules: string[];
  lab: string;
  output: string;
}

export interface StudyCenterData {
  certificationGoal: string;
  focusTopic: string;
  difficulty: StudyDifficulty;
  modules: StudyModule[];
  labs: StudyLab[];
  parityNotes: AwsParityNote[];
  routine: StudyRoutineDay[];
  quickChecklist: string[];
}

const MODULE_LIBRARY: StudyModule[] = [
  {
    id: "cp-cloud-concepts",
    title: "Cloud Concepts and Global Infrastructure",
    domain: "Cloud Concepts",
    focus: ["fundamentos", "regions", "availability-zones", "resilience"],
    difficulty: "beginner",
    objectives: [
      "Diferenciar Region, Availability Zone y Edge Location.",
      "Explicar alta disponibilidad y recuperacion ante fallos.",
      "Relacionar elasticidad con ahorro de costos.",
    ],
    practicalGoals: [
      "Identificar servicios globales vs regionales en la consola local.",
      "Simular fallo de componente y definir estrategia de recuperacion.",
    ],
    estimatedMinutes: 45,
  },
  {
    id: "cp-security-iam",
    title: "Security and IAM Foundations",
    domain: "Security",
    focus: ["iam", "security", "least-privilege", "cloudtrail"],
    difficulty: "beginner",
    objectives: [
      "Aplicar principio de least privilege.",
      "Diferenciar roles, users y policies.",
      "Entender trazabilidad basica con logs y eventos.",
    ],
    practicalGoals: [
      "Crear user/role/policy minimas para una tarea concreta.",
      "Validar accesos permitidos y denegados en escenarios guiados.",
    ],
    estimatedMinutes: 55,
  },
  {
    id: "cp-storage-data",
    title: "Storage and Data Services",
    domain: "Technology",
    focus: ["s3", "efs", "ebs", "rds", "dynamodb"],
    difficulty: "beginner",
    objectives: [
      "Elegir servicio de datos segun tipo de carga.",
      "Comparar objeto, bloque, archivo y base de datos administrada.",
      "Entender durability, availability y performance en alto nivel.",
    ],
    practicalGoals: [
      "Crear bucket, subir objetos y validar permisos.",
      "Comparar una tabla DynamoDB vs instancia RDS en caso practico.",
    ],
    estimatedMinutes: 60,
  },
  {
    id: "cp-networking-core",
    title: "Networking Core with VPC",
    domain: "Technology",
    focus: ["vpc", "subnet", "security-groups", "route-table", "apigateway"],
    difficulty: "intermediate",
    objectives: [
      "Comprender aislamiento de red con VPC.",
      "Diferenciar Security Groups y NACL.",
      "Relacionar API Gateway con capas de aplicacion.",
    ],
    practicalGoals: [
      "Construir una VPC minima con subred y reglas.",
      "Probar flujo de trafico y bloqueo intencional de puertos.",
    ],
    estimatedMinutes: 70,
  },
  {
    id: "cp-observability-ops",
    title: "Operations and Observability",
    domain: "Operations",
    focus: ["cloudwatch", "logs", "alarms", "eventbridge", "sqs"],
    difficulty: "intermediate",
    objectives: [
      "Configurar metricas y alarmas para eventos clave.",
      "Correlacionar logs con estado de recursos.",
      "Usar patrones event-driven para desacoplar sistemas.",
    ],
    practicalGoals: [
      "Crear alarma y verificar transicion de estados.",
      "Enviar eventos a bus/regla y observar destino.",
    ],
    estimatedMinutes: 65,
  },
  {
    id: "cp-pricing-governance",
    title: "Pricing, Cost and Governance",
    domain: "Billing and Pricing",
    focus: ["pricing", "budgets", "organizations", "cost-optimization"],
    difficulty: "beginner",
    objectives: [
      "Diferenciar On-Demand, Reserved y Savings Plans.",
      "Aplicar practicas de cost optimization.",
      "Entender gobernanza basica multi-cuenta.",
    ],
    practicalGoals: [
      "Analizar arquitectura y proponer ajustes de costo.",
      "Crear checklist de gobierno minimo para entorno dev.",
    ],
    estimatedMinutes: 40,
  },
];

const LAB_LIBRARY: StudyLab[] = [
  {
    id: "lab-s3-iam",
    title: "S3 + IAM Least Privilege",
    difficulty: "beginner",
    services: ["s3", "iam"],
    serviceRoute: "/services/s3",
    awsConsolePath: "AWS Console > S3 > Buckets + IAM > Policies",
    localstackEquivalent: "Study Lab + S3 page + IAM page in localstack-ui",
    expectedResult:
      "Usuario solo puede listar/subir en un bucket concreto y falla fuera de alcance.",
    steps: [
      "Crear bucket de practica en S3.",
      "Crear policy minima para acciones s3:GetObject, PutObject y ListBucket.",
      "Asignar policy a user de practica en IAM.",
      "Validar acceso permitido en bucket objetivo y denegado en otro bucket.",
    ],
    validationChecklist: [
      "Policy no usa wildcard innecesario.",
      "Accion fuera de alcance retorna error esperado.",
      "El bucket mantiene bloqueo publico activo.",
    ],
  },
  {
    id: "lab-vpc-ec2-rds",
    title: "VPC Isolation with EC2 and RDS",
    difficulty: "intermediate",
    services: ["vpc", "ec2", "rds"],
    serviceRoute: "/services/vpc",
    awsConsolePath: "AWS Console > VPC > Subnets/SG + EC2 + RDS",
    localstackEquivalent: "VPC page + EC2 page + RDS page in localstack-ui",
    expectedResult:
      "Instancia EC2 conecta a RDS solo por puerto permitido dentro de la VPC.",
    steps: [
      "Crear VPC y subnet de laboratorio.",
      "Configurar security group para permitir solo puerto DB requerido.",
      "Mover/crear EC2 y RDS dentro de la VPC.",
      "Validar conectividad permitida y bloqueo de trafico no autorizado.",
    ],
    validationChecklist: [
      "RDS no expone puerto al exterior.",
      "EC2 accede al puerto DB autorizado.",
      "Intento en puerto no permitido falla.",
    ],
  },
  {
    id: "lab-observability-alerting",
    title: "CloudWatch Logs + Alarms",
    difficulty: "intermediate",
    services: ["cloudwatch", "logs"],
    serviceRoute: "/services/cloudwatch",
    awsConsolePath: "AWS Console > CloudWatch > Log Groups + Alarms",
    localstackEquivalent: "CloudWatch page in localstack-ui",
    expectedResult:
      "Se visualizan logs y una alarma cambia de estado con umbral configurado.",
    steps: [
      "Crear log group y escribir eventos de prueba.",
      "Definir metrica derivada o metrica base para alarma.",
      "Configurar umbral con accion de evaluacion.",
      "Forzar condicion de alarma y revisar historial de estado.",
    ],
    validationChecklist: [
      "Log events aparecen con timestamps coherentes.",
      "Alarma pasa por al menos dos estados.",
      "Historial de alarma queda visible para auditoria.",
    ],
  },
  {
    id: "lab-event-driven",
    title: "EventBridge + SQS Integration",
    difficulty: "advanced",
    services: ["eventbridge", "sqs", "scheduler"],
    serviceRoute: "/services/eventbridge",
    awsConsolePath: "AWS Console > EventBridge > Rules + SQS",
    localstackEquivalent: "EventBridge page + SQS page in localstack-ui",
    expectedResult:
      "Eventos de bus son enrutados a cola y consumidos sin perdida.",
    steps: [
      "Crear bus y regla con patron de eventos.",
      "Configurar SQS como target.",
      "Publicar eventos de prueba al bus.",
      "Verificar mensajes recibidos y contenido esperado en SQS.",
    ],
    validationChecklist: [
      "Regla activa con patron correcto.",
      "Mensajes llegan a la cola sin duplicados inesperados.",
      "Payload conserva campos clave para procesamiento.",
    ],
  },
];

const PARITY_NOTES: AwsParityNote[] = [
  {
    area: "IAM and Access Control",
    awsRealBehavior:
      "Evaluacion de politicas es completa, con condiciones avanzadas y contexto organizacional.",
    localSimulationBehavior:
      "Cubre casos comunes, pero puede simplificar condiciones avanzadas o integraciones multi-cuenta.",
    recommendation:
      "Practica logica de permisos en local y valida edge-cases en sandbox AWS real antes de produccion.",
  },
  {
    area: "Networking and VPC",
    awsRealBehavior:
      "Incluye componentes administrados completos (NAT GW, TGW, endpoints, rutas complejas).",
    localSimulationBehavior:
      "Simula flujos principales para aprendizaje, con menor fidelidad en escenarios avanzados.",
    recommendation:
      "Usa local para fundamentos de topologia y seguridad; luego compara con diagramas reales AWS.",
  },
  {
    area: "CloudWatch and Metrics",
    awsRealBehavior:
      "Metricas, logs y alarmas con cobertura total y amplio ecosistema de integraciones.",
    localSimulationBehavior:
      "Suficiente para entrenamiento de consultas y alarmas base.",
    recommendation:
      "Define umbrales y queries en local; en AWS real ajusta cardinalidad, retencion y costos.",
  },
  {
    area: "Service Feature Coverage",
    awsRealBehavior:
      "Cada servicio evoluciona continuamente con nuevas capacidades regionales.",
    localSimulationBehavior:
      "Puede no cubrir inmediatamente todas las features nuevas.",
    recommendation:
      "Combina practica local con lectura de novedades oficiales para mantenerte actualizado.",
  },
];

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function rankDifficulty(value: StudyDifficulty): number {
  if (value === "advanced") return 3;
  if (value === "intermediate") return 2;
  return 1;
}

function matchesDifficulty(target: StudyDifficulty, candidate: StudyDifficulty): boolean {
  return rankDifficulty(candidate) <= rankDifficulty(target);
}

function pickModules(goal: string, focusTopic: string, difficulty: StudyDifficulty): StudyModule[] {
  const raw = normalizeText(`${goal} ${focusTopic}`);

  const preferred = MODULE_LIBRARY.filter((module) => {
    if (!matchesDifficulty(difficulty, module.difficulty)) {
      return false;
    }
    return module.focus.some((tag) => raw.includes(tag));
  });

  if (preferred.length >= 4) {
    return preferred.slice(0, 6);
  }

  const fallback = MODULE_LIBRARY.filter((module) =>
    matchesDifficulty(difficulty, module.difficulty),
  );
  return [...preferred, ...fallback.filter((item) => !preferred.includes(item))].slice(
    0,
    6,
  );
}

function pickLabs(modules: StudyModule[], difficulty: StudyDifficulty): StudyLab[] {
  const moduleFocus = new Set(modules.flatMap((module) => module.focus));
  const candidates = LAB_LIBRARY.filter(
    (lab) =>
      matchesDifficulty(difficulty, lab.difficulty) &&
      lab.services.some((service) => moduleFocus.has(service) || moduleFocus.has("fundamentos")),
  );

  if (candidates.length >= 3) {
    return candidates.slice(0, 4);
  }

  const fallback = LAB_LIBRARY.filter((lab) => matchesDifficulty(difficulty, lab.difficulty));
  return [...candidates, ...fallback.filter((item) => !candidates.includes(item))].slice(0, 4);
}

function buildRoutine(modules: StudyModule[], labs: StudyLab[]): StudyRoutineDay[] {
  const selectedModules = modules.slice(0, 4);
  const selectedLabs = labs.slice(0, 4);

  return [
    {
      day: "Dia 1",
      objective: "Base conceptual + identidad y seguridad",
      modules: selectedModules.slice(0, 2).map((module) => module.title),
      lab: selectedLabs[0]?.title || "S3 + IAM Least Privilege",
      output:
        "Mapa de servicios core y matriz minima de permisos para escenarios de practica.",
    },
    {
      day: "Dia 2",
      objective: "Red, datos y arquitectura base",
      modules: selectedModules.slice(1, 3).map((module) => module.title),
      lab: selectedLabs[1]?.title || "VPC Isolation with EC2 and RDS",
      output:
        "Diagrama de arquitectura y validacion de conectividad/seguridad entre recursos.",
    },
    {
      day: "Dia 3",
      objective: "Observabilidad, eventos y operaciones",
      modules: selectedModules.slice(2, 4).map((module) => module.title),
      lab: selectedLabs[2]?.title || "CloudWatch Logs + Alarms",
      output: "Runbook de monitoreo con alertas, logs y respuesta inicial a incidentes.",
    },
    {
      day: "Dia 4",
      objective: "Simulacro orientado certificacion",
      modules: selectedModules.map((module) => module.title),
      lab: selectedLabs[3]?.title || "EventBridge + SQS Integration",
      output:
        "Sesion de preguntas + correccion + refuerzo de vacios antes del siguiente ciclo.",
    },
  ];
}

export function buildStudyCenterData(input: {
  certificationGoal: string;
  focusTopic: string;
  difficulty: StudyDifficulty;
}): StudyCenterData {
  const certificationGoal = input.certificationGoal || "AWS Cloud Practitioner";
  const focusTopic = input.focusTopic || "Fundamentos de AWS";
  const difficulty = input.difficulty;

  const modules = pickModules(certificationGoal, focusTopic, difficulty);
  const labs = pickLabs(modules, difficulty);
  const routine = buildRoutine(modules, labs);

  return {
    certificationGoal,
    focusTopic,
    difficulty,
    modules,
    labs,
    parityNotes: PARITY_NOTES,
    routine,
    quickChecklist: [
      "Relaciono cada servicio con un caso de uso real y su alternativa.",
      "Puedo explicar por que una opcion es correcta y otra no en preguntas de certificacion.",
      "Tengo al menos 2 laboratorios resueltos por dominio (security, storage, networking, ops).",
      "Identifico diferencias entre simulacion local y comportamiento AWS real.",
      "Registro errores comunes y su correccion para no repetirlos.",
    ],
  };
}
