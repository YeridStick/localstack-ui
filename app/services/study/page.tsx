"use client";

import { useMemo, useState } from "react";
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
  Loader2,
  Send,
  Sparkles,
  Target,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

type Difficulty = "beginner" | "intermediate" | "advanced";
type ChatRole = "user" | "assistant";
type QuizProfile = "fast" | "balanced" | "deep";

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

interface GlossaryEntry {
  term: string;
  definition: string;
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

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
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
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>(
    {},
  );

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
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Dialogo guiado
            </TabsTrigger>
            <TabsTrigger value="quiz" className="flex items-center gap-2">
              <BookOpenCheck className="h-4 w-4" />
              Practica de preguntas
            </TabsTrigger>
          </TabsList>

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
                        {message.content}
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
        </Tabs>
      </div>
    </MainLayout>
  );
}
