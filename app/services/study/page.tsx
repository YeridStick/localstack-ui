"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MainLayout } from "@/components/layout/main-layout";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  BookOpenCheck,
  Brain,
  CheckCircle2,
  Clock3,
  Loader2,
  Send,
  Sparkles,
  Target,
  XCircle,
  ExternalLink,
  FlaskConical,
  Flag,
  Play,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";

type Difficulty = "beginner" | "intermediate" | "advanced";
type ChatRole = "user" | "assistant";
type QuizProfile = "fast" | "balanced" | "deep";
type ExamDomain =
  | "Cloud Concepts"
  | "Security and Compliance"
  | "Technology"
  | "Billing and Pricing";
type MockStatus = "idle" | "running" | "finished";

interface ChatMessage {
  role: ChatRole;
  content: string;
  createdAt: number;
}

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

interface StudySourceReference {
  id: string;
  title: string;
  url: string;
}

interface MockExamQuestion extends QuizQuestion {
  domain: ExamDomain;
  tags?: string[];
  sources?: StudySourceReference[];
}

interface MockExamBlueprintEntry {
  domain: ExamDomain;
  weightPercent: number;
  targetQuestions: number;
}

interface GlossaryEntry {
  term: string;
  definition: string;
}

interface StudyModule {
  id: string;
  title: string;
  domain: string;
  objectives: string[];
  practicalGoals: string[];
  estimatedMinutes: number;
}

interface StudyLab {
  id: string;
  title: string;
  serviceRoute: string;
  awsConsolePath: string;
  localstackEquivalent: string;
  expectedResult: string;
  steps: string[];
  validationChecklist: string[];
}

interface ParityNote {
  area: string;
  awsRealBehavior: string;
  localSimulationBehavior: string;
  recommendation: string;
}

interface RoutineDay {
  day: string;
  objective: string;
  modules: string[];
  lab: string;
  output: string;
}

interface UpdateItem {
  title: string;
  link: string;
  pubDate?: string;
  description?: string;
  source: string;
}

const QUICK_PROMPTS = [
  "Explicame IAM con ejemplos para certificacion.",
  "Dame un laboratorio rapido de S3 + Lambda en LocalStack.",
  "Hazme 5 preguntas de EventBridge con dificultad intermedia.",
  "Simula una entrevista tecnica sobre arquitectura AWS.",
];

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  beginner: "Basico",
  intermediate: "Intermedio",
  advanced: "Avanzado",
};

const QUIZ_PROFILE_LABELS: Record<QuizProfile, string> = {
  fast: "Rapido",
  balanced: "Balanceado",
  deep: "Profundo",
};

const MOCK_EXAM_PRESETS = [
  { label: "Mini 20/30", totalQuestions: 20, durationMinutes: 30 },
  { label: "Standard 40/60", totalQuestions: 40, durationMinutes: 60 },
  { label: "Full 65/90", totalQuestions: 65, durationMinutes: 90 },
];

const TAG_LABELS: Record<string, string> = {
  fundamentos: "Fundamentos AWS",
  architecture: "Arquitectura",
  security: "Seguridad",
  iam: "IAM",
  storage: "Storage",
  compute: "Compute",
  serverless: "Serverless",
  networking: "Networking",
  database: "Bases de datos",
  operations: "Operaciones",
  monitoring: "Monitoreo",
  governance: "Gobierno",
  pricing: "Billing y Pricing",
  integration: "Integracion",
  reliability: "Confiabilidad",
};

function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function formatTagLabel(tag: string): string {
  if (TAG_LABELS[tag]) return TAG_LABELS[tag];
  if (!tag) return "General";
  return tag
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

function renderInlineMarkdown(text: string) {
  const parts = text.split(/(\*\*[^*\n]+\*\*|\*[^*\n]+\*)/g);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={`bold-${index}`} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }

    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return (
        <em key={`italic-${index}`} className="italic">
          {part.slice(1, -1)}
        </em>
      );
    }

    return <span key={`text-${index}`}>{part}</span>;
  });
}

function renderMarkdownMessage(content: string) {
  const lines = content.replace(/\r/g, "").split("\n");

  return (
    <div className="space-y-1">
      {lines.map((line, index) =>
        line.trim().length === 0 ? (
          <div key={`line-${index}`} className="h-4" />
        ) : (
          <p key={`line-${index}`}>{renderInlineMarkdown(line)}</p>
        ),
      )}
    </div>
  );
}

function isStudySourceReference(item: unknown): item is StudySourceReference {
  if (!item || typeof item !== "object") return false;
  const candidate = item as Partial<StudySourceReference>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.title === "string" &&
    typeof candidate.url === "string"
  );
}

export default function StudyPage() {
  const [certificationGoal, setCertificationGoal] = useState(
    "AWS Cloud Practitioner",
  );
  const [focusTopic, setFocusTopic] = useState("Fundamentos de AWS");
  const [difficulty, setDifficulty] = useState<Difficulty>("beginner");
  const [questionCount, setQuestionCount] = useState(5);
  const [quizProfile, setQuizProfile] = useState<QuizProfile>("fast");
  const [avoidRecent, setAvoidRecent] = useState(true);

  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [quizLoading, setQuizLoading] = useState(false);
  const [mockLoading, setMockLoading] = useState(false);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Listo para estudiar. Cuentame tu meta y empezamos con teoria + practica en local.",
      createdAt: Date.now(),
    },
  ]);

  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [glossary, setGlossary] = useState<GlossaryEntry[]>([]);
  const [questionSource, setQuestionSource] = useState("");
  const [recentQuestionKeys, setRecentQuestionKeys] = useState<string[]>([]);
  const [centerLoading, setCenterLoading] = useState(false);
  const [studyModules, setStudyModules] = useState<StudyModule[]>([]);
  const [studyLabs, setStudyLabs] = useState<StudyLab[]>([]);
  const [parityNotes, setParityNotes] = useState<ParityNote[]>([]);
  const [routineDays, setRoutineDays] = useState<RoutineDay[]>([]);
  const [studyChecklist, setStudyChecklist] = useState<string[]>([]);
  const [officialUpdates, setOfficialUpdates] = useState<UpdateItem[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>(
    {},
  );
  const [mockQuestions, setMockQuestions] = useState<MockExamQuestion[]>([]);
  const [mockAnswers, setMockAnswers] = useState<Record<number, string>>({});
  const [mockBlueprint, setMockBlueprint] = useState<MockExamBlueprintEntry[]>([]);
  const [mockOfficialSources, setMockOfficialSources] = useState<
    StudySourceReference[]
  >([]);
  const [mockRecommendations, setMockRecommendations] = useState<string[]>([]);
  const [mockWarning, setMockWarning] = useState("");
  const [mockExamId, setMockExamId] = useState("");
  const [mockTotalQuestions, setMockTotalQuestions] = useState(40);
  const [mockDurationMinutes, setMockDurationMinutes] = useState(60);
  const [mockTimeLeftSec, setMockTimeLeftSec] = useState(0);
  const [mockStatus, setMockStatus] = useState<MockStatus>("idle");

  const score = useMemo(() => {
    if (quizQuestions.length === 0) {
      return { correct: 0, answered: 0, total: 0 };
    }

    const answered = Object.keys(selectedAnswers).length;
    const correct = quizQuestions.reduce((acc, question, index) => {
      return selectedAnswers[index] === question.correctAnswer ? acc + 1 : acc;
    }, 0);

    return { correct, answered, total: quizQuestions.length };
  }, [quizQuestions, selectedAnswers]);

  const mockProgress = useMemo(() => {
    if (mockQuestions.length === 0) return 0;
    return Math.round((Object.keys(mockAnswers).length / mockQuestions.length) * 100);
  }, [mockAnswers, mockQuestions.length]);

  const mockScore = useMemo(() => {
    if (mockQuestions.length === 0) {
      return {
        correct: 0,
        answered: 0,
        total: 0,
        percent: 0,
        byDomain: [] as Array<{
          domain: ExamDomain;
          correct: number;
          answered: number;
          total: number;
          percent: number;
        }>,
      };
    }

    const byDomainMap = new Map<
      ExamDomain,
      { correct: number; answered: number; total: number }
    >();

    const answered = Object.keys(mockAnswers).length;
    const correct = mockQuestions.reduce((acc, question, index) => {
      const selected = mockAnswers[index];
      const current = byDomainMap.get(question.domain) || {
        correct: 0,
        answered: 0,
        total: 0,
      };

      current.total += 1;
      if (selected) current.answered += 1;
      if (selected === question.correctAnswer) {
        current.correct += 1;
      }
      byDomainMap.set(question.domain, current);
      return selected === question.correctAnswer ? acc + 1 : acc;
    }, 0);

    const domainOrder = mockBlueprint.map((item) => item.domain);
    const byDomain = Array.from(byDomainMap.entries())
      .sort((a, b) => {
        const left = domainOrder.indexOf(a[0]);
        const right = domainOrder.indexOf(b[0]);
        const leftRank = left === -1 ? Number.MAX_SAFE_INTEGER : left;
        const rightRank = right === -1 ? Number.MAX_SAFE_INTEGER : right;
        return leftRank - rightRank;
      })
      .map(([domain, data]) => ({
        domain,
        ...data,
        percent: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
      }));

    return {
      correct,
      answered,
      total: mockQuestions.length,
      percent: Math.round((correct / mockQuestions.length) * 100),
      byDomain,
    };
  }, [mockAnswers, mockBlueprint, mockQuestions]);

  const mockReviewPlan = useMemo(() => {
    if (mockQuestions.length === 0) {
      return {
        incorrect: 0,
        unanswered: 0,
        weakDomains: [] as Array<{
          domain: ExamDomain;
          wrong: number;
          total: number;
          percent: number;
        }>,
        weakTopics: [] as Array<{ tag: string; count: number; label: string }>,
        sourceRefs: [] as Array<StudySourceReference & { hits: number }>,
      };
    }

    const unanswered = mockQuestions.reduce((acc, _, index) => {
      return mockAnswers[index] ? acc : acc + 1;
    }, 0);

    const domainWrong = new Map<ExamDomain, number>();
    const tagWrong = new Map<string, number>();
    const sourceHits = new Map<string, StudySourceReference & { hits: number }>();

    let incorrect = 0;
    mockQuestions.forEach((question, index) => {
      const selected = mockAnswers[index];
      const isWrong = !selected || selected !== question.correctAnswer;
      if (!isWrong) return;

      incorrect += 1;
      domainWrong.set(question.domain, (domainWrong.get(question.domain) || 0) + 1);

      (question.tags || []).forEach((tag) => {
        tagWrong.set(tag, (tagWrong.get(tag) || 0) + 1);
      });

      (question.sources || []).forEach((source) => {
        const current = sourceHits.get(source.id) || { ...source, hits: 0 };
        current.hits += 1;
        sourceHits.set(source.id, current);
      });
    });

    const weakDomains = mockScore.byDomain
      .map((domain) => ({
        domain: domain.domain,
        wrong: domainWrong.get(domain.domain) || 0,
        total: domain.total,
        percent: domain.percent,
      }))
      .filter((domain) => domain.wrong > 0 || domain.percent < 70)
      .sort((a, b) => b.wrong - a.wrong || a.percent - b.percent);

    const weakTopics = Array.from(tagWrong.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([tag, count]) => ({
        tag,
        count,
        label: formatTagLabel(tag),
      }));

    const sourceRefs = Array.from(sourceHits.values()).sort(
      (a, b) => b.hits - a.hits,
    );

    return {
      incorrect,
      unanswered,
      weakDomains,
      weakTopics,
      sourceRefs:
        sourceRefs.length > 0
          ? sourceRefs.slice(0, 8)
          : mockOfficialSources.slice(0, 8).map((source) => ({ ...source, hits: 0 })),
    };
  }, [mockAnswers, mockOfficialSources, mockQuestions, mockScore.byDomain]);

  const loadStudyCenter = useCallback(async () => {
    setCenterLoading(true);
    try {
      const params = new URLSearchParams({
        certificationGoal,
        focusTopic,
        difficulty,
      });
      const response = await fetch(`/api/study/center?${params.toString()}`);
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "No se pudo cargar el centro de estudio.");
      }

      setStudyModules(Array.isArray(payload.modules) ? payload.modules : []);
      setStudyLabs(Array.isArray(payload.labs) ? payload.labs : []);
      setParityNotes(Array.isArray(payload.parityNotes) ? payload.parityNotes : []);
      setRoutineDays(Array.isArray(payload.routine) ? payload.routine : []);
      setStudyChecklist(Array.isArray(payload.quickChecklist) ? payload.quickChecklist : []);
      setOfficialUpdates(Array.isArray(payload.updates) ? payload.updates : []);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "No se pudo cargar el centro de estudio."));
    } finally {
      setCenterLoading(false);
    }
  }, [certificationGoal, difficulty, focusTopic]);

  useEffect(() => {
    loadStudyCenter();
  }, [loadStudyCenter]);

  const finishMockExam = useCallback(
    (reason: "manual" | "timeout" = "manual") => {
      if (mockStatus !== "running") return;
      setMockStatus("finished");
      if (reason === "timeout") {
        toast.message("Tiempo agotado. Simulacro finalizado.");
        return;
      }
      toast.success("Simulacro finalizado.");
    },
    [mockStatus],
  );

  useEffect(() => {
    if (mockStatus !== "running") return;
    const interval = window.setInterval(() => {
      setMockTimeLeftSec((previous) => (previous <= 1 ? 0 : previous - 1));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [mockStatus]);

  useEffect(() => {
    if (mockStatus !== "running") return;
    if (mockQuestions.length === 0) return;
    if (mockTimeLeftSec > 0) return;
    finishMockExam("timeout");
  }, [finishMockExam, mockQuestions.length, mockStatus, mockTimeLeftSec]);

  const sendMessage = async (prefilledPrompt?: string) => {
    if (chatLoading) return;

    const userPrompt = (prefilledPrompt || chatInput).trim();
    if (!userPrompt) return;

    const nextMessages: ChatMessage[] = [
      ...chatMessages,
      { role: "user", content: userPrompt, createdAt: Date.now() },
    ];

    setChatMessages(nextMessages);
    setChatInput("");
    setChatLoading(true);

    try {
      const response = await fetch("/api/study/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "tutor",
          certificationGoal,
          focusTopic,
          difficulty,
          messages: nextMessages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        const details =
          typeof payload.details === "string" ? ` ${payload.details}` : "";
        throw new Error(
          `${payload.error || "No se pudo obtener respuesta del tutor."}${details}`,
        );
      }

      const answer =
        typeof payload.answer === "string"
          ? payload.answer
          : "No se recibio una respuesta valida.";

      setChatMessages([
        ...nextMessages,
        { role: "assistant", content: answer, createdAt: Date.now() },
      ]);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Fallo la conexion con Ollama."));
      setChatMessages([
        ...nextMessages,
        {
          role: "assistant",
          content:
            "No pude responder ahora. Verifica que Ollama este activo y que el modelo exista.",
          createdAt: Date.now(),
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const generateQuiz = async () => {
    if (quizLoading) return;

    setQuizLoading(true);
    setSelectedAnswers({});

    const generationStrategy =
      quizProfile === "deep"
        ? "model"
        : quizProfile === "balanced"
          ? "hybrid"
          : "bank";

    try {
      const response = await fetch("/api/study/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "quiz",
          certificationGoal,
          focusTopic,
          difficulty,
          questionCount,
          generationStrategy,
          latencyProfile: quizProfile,
          avoidRecent,
          recentQuestionKeys,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        const details =
          typeof payload.details === "string" ? ` ${payload.details}` : "";
        throw new Error(
          `${payload.error || "No se pudo generar el quiz."}${details}`,
        );
      }

      setQuizQuestions(Array.isArray(payload.questions) ? payload.questions : []);
      setGlossary(Array.isArray(payload.glossary) ? payload.glossary : []);
      setQuestionSource(typeof payload.source === "string" ? payload.source : "");
      if (Array.isArray(payload.questionKeys)) {
        const incoming = payload.questionKeys.filter(
          (item: unknown): item is string => typeof item === "string",
        );
        setRecentQuestionKeys((previous) => [...incoming, ...previous].slice(0, 250));
      }

      if (typeof payload.warning === "string" && payload.warning) {
        toast.message(payload.warning);
      }
      toast.success("Quiz generado con exito.");
    } catch (error: unknown) {
      setQuizQuestions([]);
      setGlossary([]);
      toast.error(getErrorMessage(error, "Fallo la generacion del quiz."));
    } finally {
      setQuizLoading(false);
    }
  };

  const startMockExam = async () => {
    if (mockLoading) return;

    setMockLoading(true);
    try {
      const response = await fetch("/api/study/mock-exam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          certificationGoal,
          focusTopic,
          difficulty,
          totalQuestions: mockTotalQuestions,
          durationMinutes: mockDurationMinutes,
          avoidRecent,
          recentQuestionKeys,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "No se pudo iniciar el simulacro.");
      }

      const questions = Array.isArray(payload.questions)
        ? (payload.questions as MockExamQuestion[])
        : [];
      if (questions.length === 0) {
        throw new Error(
          "El simulacro no devolvio preguntas. Ajusta tema o dificultad e intenta de nuevo.",
        );
      }

      const duration = Math.min(
        180,
        Math.max(10, Number(payload.durationMinutes) || mockDurationMinutes),
      );

      setMockQuestions(questions);
      setMockAnswers({});
      setMockBlueprint(
        Array.isArray(payload.blueprint)
          ? (payload.blueprint as MockExamBlueprintEntry[])
          : [],
      );
      setMockOfficialSources(
        Array.isArray(payload.officialSources)
          ? payload.officialSources.filter((item: unknown): item is StudySourceReference =>
              isStudySourceReference(item),
            )
          : [],
      );
      setMockRecommendations(
        Array.isArray(payload.recommendations)
          ? payload.recommendations.filter(
              (item: unknown): item is string => typeof item === "string",
            )
          : [],
      );
      setMockWarning(typeof payload.warning === "string" ? payload.warning : "");
      setMockExamId(typeof payload.examId === "string" ? payload.examId : "");
      setMockDurationMinutes(duration);
      setMockTimeLeftSec(duration * 60);
      setMockStatus("running");

      if (Array.isArray(payload.questionKeys)) {
        const incoming = payload.questionKeys.filter(
          (item: unknown): item is string => typeof item === "string",
        );
        setRecentQuestionKeys((previous) => [...incoming, ...previous].slice(0, 600));
      }

      if (typeof payload.warning === "string" && payload.warning) {
        toast.message(payload.warning);
      }
      toast.success(
        `Simulacro iniciado: ${questions.length} preguntas en ${duration} minutos.`,
      );
    } catch (error: unknown) {
      setMockQuestions([]);
      setMockAnswers({});
      setMockBlueprint([]);
      setMockOfficialSources([]);
      setMockRecommendations([]);
      setMockWarning("");
      setMockExamId("");
      setMockStatus("idle");
      toast.error(getErrorMessage(error, "No se pudo iniciar el simulacro."));
    } finally {
      setMockLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-bold">
              <BookOpenCheck className="h-7 w-7" />
              Study Lab
            </h1>
            <p className="mt-1 text-muted-foreground">
              Tutor con Gemma en local para dialogo, practica y refuerzo de certificacion.
            </p>
          </div>
          <Badge variant="outline" className="px-3 py-1">
            Modelo: {process.env.NEXT_PUBLIC_OLLAMA_MODEL || "gemma4:e4b"}
          </Badge>
        </div>

        <Alert>
          <Sparkles className="h-4 w-4" />
          <AlertDescription>
            Usa esta seccion para estudiar sin entorno real: pregunta, responde y practica
            escenarios AWS en local.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Configuracion de estudio
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Meta de certificacion</p>
              <Input
                value={certificationGoal}
                onChange={(event) => setCertificationGoal(event.target.value)}
                placeholder="Ej: AWS Solutions Architect Associate"
              />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Tema principal</p>
              <Input
                value={focusTopic}
                onChange={(event) => setFocusTopic(event.target.value)}
                placeholder="Ej: IAM, S3, VPC, Lambda"
              />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Dificultad</p>
              <div className="flex gap-2">
                {(Object.keys(DIFFICULTY_LABELS) as Difficulty[]).map((item) => (
                  <Button
                    key={item}
                    type="button"
                    variant={difficulty === item ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDifficulty(item)}
                  >
                    {DIFFICULTY_LABELS[item]}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Preguntas por quiz</p>
              <Input
                type="number"
                min={1}
                max={10}
                value={questionCount}
                onChange={(event) =>
                  setQuestionCount(
                    Math.min(10, Math.max(1, Number(event.target.value) || 1)),
                  )
                }
              />
            </div>

            <div className="space-y-2 md:col-span-2 lg:col-span-4">
              <p className="text-sm font-medium">Perfil de generacion</p>
              <div className="flex flex-wrap items-center gap-2">
                {(Object.keys(QUIZ_PROFILE_LABELS) as QuizProfile[]).map((item) => (
                  <Button
                    key={item}
                    type="button"
                    size="sm"
                    variant={quizProfile === item ? "default" : "outline"}
                    onClick={() => setQuizProfile(item)}
                  >
                    {QUIZ_PROFILE_LABELS[item]}
                  </Button>
                ))}
                <Button
                  type="button"
                  size="sm"
                  variant={avoidRecent ? "default" : "outline"}
                  onClick={() => setAvoidRecent((previous) => !previous)}
                >
                  {avoidRecent ? "Sin repetidas: ON" : "Sin repetidas: OFF"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="chat" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="center" className="flex items-center gap-2">
              <FlaskConical className="h-4 w-4" />
              Centro de estudio
            </TabsTrigger>
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Dialogo guiado
            </TabsTrigger>
            <TabsTrigger value="quiz" className="flex items-center gap-2">
              <BookOpenCheck className="h-4 w-4" />
              Practica de preguntas
            </TabsTrigger>
            <TabsTrigger value="mock" className="flex items-center gap-2">
              <Flag className="h-4 w-4" />
              Simulacro
            </TabsTrigger>
          </TabsList>

          <TabsContent value="center" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Roadmap practico</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" onClick={loadStudyCenter} disabled={centerLoading}>
                    {centerLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <FlaskConical className="mr-2 h-4 w-4" />
                    )}
                    Actualizar centro
                  </Button>
                  <Badge variant="outline">
                    Enfoque: {certificationGoal} / {focusTopic}
                  </Badge>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {studyModules.map((module) => (
                    <Card key={module.id}>
                      <CardHeader>
                        <CardTitle className="text-base">{module.title}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <p className="text-muted-foreground">
                          Dominio: {module.domain} - {module.estimatedMinutes} min
                        </p>
                        <p>
                          Objetivo clave: {module.objectives[0] || "Repaso guiado del dominio."}
                        </p>
                        <p className="text-muted-foreground">
                          Practica: {module.practicalGoals[0] || "Resolver laboratorio relacionado."}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Rutina de 4 dias</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {routineDays.map((day) => (
                      <div key={day.day} className="rounded-md border p-3 text-sm">
                        <p className="font-semibold">{day.day}: {day.objective}</p>
                        <p className="mt-1 text-muted-foreground">Lab: {day.lab}</p>
                        <p className="mt-1">Salida esperada: {day.output}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Checklist de preparacion</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {studyChecklist.map((item) => (
                      <div key={item} className="rounded-md border p-2 text-sm">
                        {item}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Labs AWS-like</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {studyLabs.map((lab) => (
                  <Card key={lab.id}>
                    <CardHeader>
                      <CardTitle className="text-base">{lab.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <p className="text-muted-foreground">
                        AWS real: {lab.awsConsolePath}
                      </p>
                      <p className="text-muted-foreground">
                        Simulacion local: {lab.localstackEquivalent}
                      </p>
                      <p>Resultado esperado: {lab.expectedResult}</p>
                      <div className="flex items-center gap-2">
                        <Link href={lab.serviceRoute}>
                          <Button size="sm" variant="outline">
                            Abrir practica en UI
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Paridad con AWS real</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {parityNotes.map((note) => (
                  <div key={note.area} className="rounded-md border p-3 text-sm">
                    <p className="font-semibold">{note.area}</p>
                    <p className="mt-1 text-muted-foreground">AWS real: {note.awsRealBehavior}</p>
                    <p className="mt-1 text-muted-foreground">
                      Simulacion local: {note.localSimulationBehavior}
                    </p>
                    <p className="mt-1">{note.recommendation}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Novedades oficiales AWS</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {officialUpdates.map((update) => (
                  <a
                    key={`${update.source}-${update.link}`}
                    href={update.link}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-md border p-3 text-sm hover:bg-muted/40"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold">{update.title}</p>
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {update.source} - {update.pubDate || "sin fecha"}
                    </p>
                  </a>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="chat" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Tutor de estudio</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
                  {chatMessages.map((message, index) => (
                    <div
                      key={`${message.role}-${message.createdAt}-${index}`}
                      className={cn(
                        "flex",
                        message.role === "user" ? "justify-end" : "justify-start",
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap",
                          message.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-foreground",
                        )}
                      >
                        {renderMarkdownMessage(message.content)}
                      </div>
                    </div>
                  ))}

                  {chatLoading && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generando respuesta...
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <Textarea
                    value={chatInput}
                    onChange={(event) => setChatInput(event.target.value)}
                    placeholder="Escribe tu pregunta de estudio..."
                    className="min-h-24"
                  />
                  <div className="flex flex-wrap gap-2">
                    {QUICK_PROMPTS.map((prompt) => (
                      <Button
                        key={prompt}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => sendMessage(prompt)}
                        disabled={chatLoading}
                      >
                        {prompt}
                      </Button>
                    ))}
                  </div>
                  <Button
                    type="button"
                    onClick={() => sendMessage()}
                    disabled={chatLoading || !chatInput.trim()}
                  >
                    {chatLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="mr-2 h-4 w-4" />
                    )}
                    Enviar pregunta
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="quiz" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Generar practica</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" onClick={generateQuiz} disabled={quizLoading}>
                    {quizLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Brain className="mr-2 h-4 w-4" />
                    )}
                    Generar quiz
                  </Button>
                  {questionSource && (
                    <Badge variant="outline">Fuente: {questionSource}</Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {glossary.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Glosario de repaso ({glossary.length})</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-2">
                  {glossary.map((entry) => (
                    <div key={entry.term} className="rounded-md border p-3">
                      <p className="text-sm font-semibold">{entry.term}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {entry.definition}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {quizQuestions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>
                    Resultado: {score.correct}/{score.total} correctas ({score.answered}{" "}
                    respondidas)
                  </CardTitle>
                </CardHeader>
              </Card>
            )}

            {quizQuestions.map((question, index) => {
              const selected = selectedAnswers[index];
              const isCorrect = selected === question.correctAnswer;

              return (
                <Card key={`quiz-question-${index}`}>
                  <CardHeader>
                    <CardTitle className="text-base">
                      {index + 1}. {question.question}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {question.options.map((option) => {
                      const isSelected = selected === option;
                      const isOptionCorrect = option === question.correctAnswer;

                      return (
                        <button
                          key={option}
                          type="button"
                          className={cn(
                            "flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors",
                            isSelected
                              ? "border-primary bg-primary/10"
                              : "hover:bg-muted",
                          )}
                          onClick={() =>
                            setSelectedAnswers((prev) => ({ ...prev, [index]: option }))
                          }
                        >
                          <span>{option}</span>
                          {isSelected && isCorrect && (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          )}
                          {isSelected && !isCorrect && (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                          {!isSelected && selected && isOptionCorrect && (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          )}
                        </button>
                      );
                    })}

                    {selected && (
                      <Alert>
                        {isCorrect ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        <AlertDescription>
                          Respuesta correcta: <strong>{question.correctAnswer}</strong>.{" "}
                          {question.explanation}
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="mock" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Simulacro de certificacion</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {MOCK_EXAM_PRESETS.map((preset) => (
                    <Button
                      key={preset.label}
                      type="button"
                      size="sm"
                      variant={
                        mockTotalQuestions === preset.totalQuestions &&
                        mockDurationMinutes === preset.durationMinutes
                          ? "default"
                          : "outline"
                      }
                      onClick={() => {
                        setMockTotalQuestions(preset.totalQuestions);
                        setMockDurationMinutes(preset.durationMinutes);
                      }}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Preguntas del simulacro</p>
                    <Input
                      type="number"
                      min={5}
                      max={80}
                      value={mockTotalQuestions}
                      onChange={(event) =>
                        setMockTotalQuestions(
                          Math.min(80, Math.max(5, Number(event.target.value) || 5)),
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Duracion (minutos)</p>
                    <Input
                      type="number"
                      min={10}
                      max={180}
                      value={mockDurationMinutes}
                      onChange={(event) =>
                        setMockDurationMinutes(
                          Math.min(180, Math.max(10, Number(event.target.value) || 10)),
                        )
                      }
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" onClick={startMockExam} disabled={mockLoading}>
                    {mockLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="mr-2 h-4 w-4" />
                    )}
                    {mockQuestions.length > 0 ? "Regenerar simulacro" : "Iniciar simulacro"}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => finishMockExam("manual")}
                    disabled={mockStatus !== "running"}
                  >
                    <Flag className="mr-2 h-4 w-4" />
                    Finalizar ahora
                  </Button>

                  <Badge variant="outline">Estado: {mockStatus}</Badge>
                  {mockExamId && <Badge variant="outline">ID: {mockExamId}</Badge>}
                  {mockStatus === "running" && (
                    <Badge variant="outline" className="font-mono">
                      <Clock3 className="mr-1 h-3.5 w-3.5" />
                      {formatClock(mockTimeLeftSec)}
                    </Badge>
                  )}
                </div>

                {mockQuestions.length > 0 && (
                  <div className="grid gap-3 md:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Progreso</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-1 text-sm">
                        <p>
                          Respondidas: {mockScore.answered}/{mockScore.total}
                        </p>
                        <p>Pendientes: {Math.max(mockScore.total - mockScore.answered, 0)}</p>
                        <p>Avance: {mockProgress}%</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Objetivo de estudio</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-1 text-sm">
                        <p>{certificationGoal}</p>
                        <p className="text-muted-foreground">
                          Tema: {focusTopic} - {DIFFICULTY_LABELS[difficulty]}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {mockWarning && (
                  <Alert>
                    <AlertDescription>{mockWarning}</AlertDescription>
                  </Alert>
                )}

                {mockRecommendations.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Recomendaciones</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      {mockRecommendations.map((item) => (
                        <p key={item}>{item}</p>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>

            {mockStatus === "finished" && mockQuestions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>
                    Resultado final: {mockScore.correct}/{mockScore.total} ({mockScore.percent}%)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p>Respuestas enviadas: {mockScore.answered}</p>
                  {mockScore.byDomain.map((domain) => (
                    <div
                      key={domain.domain}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3"
                    >
                      <p className="font-medium">{domain.domain}</p>
                      <p>
                        {domain.correct}/{domain.total} correctas ({domain.percent}%)
                      </p>
                    </div>
                  ))}
                  <Button type="button" variant="outline" onClick={startMockExam}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Intentar otro simulacro
                  </Button>
                </CardContent>
              </Card>
            )}

            {mockStatus === "finished" && mockQuestions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Elementos a repasar segun tu resultado</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <p>
                    Incorrectas o no respondidas: {mockReviewPlan.incorrect}/
                    {mockQuestions.length}. Sin responder: {mockReviewPlan.unanswered}.
                  </p>

                  {mockReviewPlan.weakDomains.length > 0 && (
                    <div className="space-y-2">
                      <p className="font-medium">Dominios a reforzar</p>
                      {mockReviewPlan.weakDomains.map((domain) => (
                        <div
                          key={domain.domain}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3"
                        >
                          <p>{domain.domain}</p>
                          <p>
                            Errores: {domain.wrong} - Score: {domain.percent}%
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {mockReviewPlan.weakTopics.length > 0 && (
                    <div className="space-y-2">
                      <p className="font-medium">Temas puntuales a revisar</p>
                      <div className="flex flex-wrap gap-2">
                        {mockReviewPlan.weakTopics.map((topic) => (
                          <Badge key={topic.tag} variant="secondary">
                            {topic.label} ({topic.count})
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {mockReviewPlan.sourceRefs.length > 0 && (
                    <div className="space-y-2">
                      <p className="font-medium">Fuentes oficiales sugeridas</p>
                      {mockReviewPlan.sourceRefs.map((source) => (
                        <a
                          key={source.id}
                          href={source.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-between rounded-md border p-3 hover:bg-muted/40"
                        >
                          <span>{source.title}</span>
                          <span className="flex items-center gap-1 text-muted-foreground">
                            {source.hits > 0 ? `Errores: ${source.hits}` : "General"}
                            <ExternalLink className="h-4 w-4" />
                          </span>
                        </a>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {mockQuestions.map((question, index) => {
              const selected = mockAnswers[index];
              const isCorrect = selected === question.correctAnswer;
              const showFeedback = mockStatus === "finished";

              return (
                <Card key={`mock-question-${index}`}>
                  <CardHeader>
                    <CardTitle className="text-base">
                      {index + 1}. {question.question}
                    </CardTitle>
                    <div className="mt-2">
                      <Badge variant="secondary">{question.domain}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {question.options.map((option) => {
                      const isSelected = selected === option;
                      const isOptionCorrect = option === question.correctAnswer;

                      return (
                        <button
                          key={option}
                          type="button"
                          className={cn(
                            "flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors",
                            isSelected && !showFeedback && "border-primary bg-primary/10",
                            !isSelected && !showFeedback && "hover:bg-muted",
                            showFeedback && isOptionCorrect && "border-emerald-500 bg-emerald-500/10",
                            showFeedback &&
                              isSelected &&
                              !isOptionCorrect &&
                              "border-red-500 bg-red-500/10",
                          )}
                          disabled={mockStatus !== "running"}
                          onClick={() =>
                            setMockAnswers((previous) => ({ ...previous, [index]: option }))
                          }
                        >
                          <span>{option}</span>
                          {showFeedback && isOptionCorrect && (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          )}
                          {showFeedback && isSelected && !isOptionCorrect && (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                        </button>
                      );
                    })}

                    {showFeedback && (
                      <Alert>
                        {isCorrect ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        <AlertDescription>
                          Respuesta correcta: <strong>{question.correctAnswer}</strong>.{" "}
                          {question.explanation}
                        </AlertDescription>
                      </Alert>
                    )}

                    {(question.sources?.length || 0) > 0 && (
                      <div className="space-y-2 rounded-md border p-3">
                        <p className="text-xs font-medium text-muted-foreground">
                          Fuentes oficiales para esta pregunta
                        </p>
                        {question.sources?.map((source) => (
                          <a
                            key={`${source.id}-${index}`}
                            href={source.url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-between rounded-md border px-3 py-2 text-xs hover:bg-muted/40"
                          >
                            <span>{source.title}</span>
                            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                          </a>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
