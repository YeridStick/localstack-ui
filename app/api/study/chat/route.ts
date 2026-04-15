import { NextRequest, NextResponse } from "next/server";
import {
  buildQuestionKey,
  generateQuizFromBank,
  GlossaryEntry,
  StudyDifficulty,
} from "@/lib/study/question-bank";

type StudyMode = "tutor" | "quiz";
type Difficulty = "beginner" | "intermediate" | "advanced";
type ChatRole = "user" | "assistant";
type QuizGenerationStrategy = "bank" | "hybrid" | "model";
type LatencyProfile = "fast" | "balanced" | "deep";

interface StudyMessage {
  role: ChatRole;
  content: string;
}

interface StudyChatRequest {
  mode?: StudyMode;
  certificationGoal?: string;
  focusTopic?: string;
  difficulty?: Difficulty;
  questionCount?: number;
  messages?: StudyMessage[];
  generationStrategy?: QuizGenerationStrategy;
  latencyProfile?: LatencyProfile;
  avoidRecent?: boolean;
  recentQuestionKeys?: string[];
}

interface OllamaChatResponse {
  message?: {
    role?: string;
    content?: string;
    thinking?: string;
  };
  done_reason?: string;
}

interface OllamaGenerateResponse {
  response?: string;
  done_reason?: string;
}

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

const OLLAMA_BASE_URL =
  process.env.OLLAMA_BASE_URL?.trim() || "http://127.0.0.1:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL?.trim() || "gemma4:e4b";
const OLLAMA_API_MODE = (process.env.OLLAMA_API_MODE?.trim() || "auto").toLowerCase();
const MAX_MESSAGES = 12;
const MAX_MESSAGE_LENGTH = 3000;
const MAX_RECENT_KEYS = 250;

const globalRecentQuestionKeys: string[] = [];

function cleanText(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function sanitizeQuestionKeys(input: unknown): string[] {
  if (!Array.isArray(input)) return [];

  return input
    .map((item) => cleanText(item, 180))
    .filter((item) => /^[a-z0-9-]+$/.test(item))
    .slice(0, MAX_RECENT_KEYS);
}

function rememberQuestionKeys(keys: string[]): void {
  for (const key of keys) {
    if (!globalRecentQuestionKeys.includes(key)) {
      globalRecentQuestionKeys.unshift(key);
    }
  }
  if (globalRecentQuestionKeys.length > MAX_RECENT_KEYS) {
    globalRecentQuestionKeys.splice(MAX_RECENT_KEYS);
  }
}

function sanitizeMessages(input: unknown): StudyMessage[] {
  if (!Array.isArray(input)) return [];

  return input
    .filter((item): item is StudyMessage => {
      if (!item || typeof item !== "object") return false;
      if (!("role" in item) || !("content" in item)) return false;
      return item.role === "user" || item.role === "assistant";
    })
    .map((item) => ({
      role: item.role,
      content: cleanText(item.content, MAX_MESSAGE_LENGTH),
    }))
    .filter((item) => item.content.length > 0)
    .slice(-MAX_MESSAGES);
}

function parseGenerationStrategy(value: unknown): QuizGenerationStrategy {
  if (value === "model") return "model";
  if (value === "hybrid") return "hybrid";
  return "bank";
}

function parseLatencyProfile(value: unknown): LatencyProfile {
  if (value === "deep") return "deep";
  if (value === "balanced") return "balanced";
  return "fast";
}

function parseStudyDifficulty(value: unknown): StudyDifficulty {
  if (value === "advanced") return "advanced";
  if (value === "intermediate") return "intermediate";
  return "beginner";
}

function getSystemPrompt(
  mode: StudyMode,
  certificationGoal: string,
  focusTopic: string,
  difficulty: Difficulty,
  questionCount: number,
): string {
  const context = [
    certificationGoal ? `Meta de certificacion: ${certificationGoal}.` : "",
    focusTopic ? `Tema principal: ${focusTopic}.` : "",
    `Nivel objetivo: ${difficulty}.`,
  ]
    .filter(Boolean)
    .join(" ");

  if (mode === "quiz") {
    return `Eres un tutor de AWS y LocalStack para aprendizaje practico. ${context}
Genera un mini examen de ${questionCount} preguntas.
Devuelve SOLO JSON valido (sin markdown) con este formato exacto:
{"questions":[{"question":"...","options":["...","...","...","..."],"correctAnswer":"...","explanation":"..."}]}
Reglas: 4 opciones por pregunta, una sola correcta, explicaciones cortas y claras, espanol neutro.`;
  }

  return `Eres un tutor de AWS y LocalStack, enfocado en preparar certificaciones con practica guiada. ${context}
Responde en espanol con enfoque didactico, paso a paso, y ejemplos aplicables en local.
Limita la respuesta a 8-10 lineas salvo que el usuario pida detalle largo.
Si el usuario se equivoca, corrige con respeto y da una mini practica para reforzar.`;
}

function extractJsonObject(raw: string): unknown {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed);
  } catch {
    // Try fenced JSON block.
    const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fencedMatch?.[1]) {
      try {
        return JSON.parse(fencedMatch[1].trim());
      } catch {
        // Continue trying.
      }
    }

    const firstBrace = trimmed.indexOf("{");
    const lastBrace = trimmed.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      const candidate = trimmed.slice(firstBrace, lastBrace + 1);
      try {
        return JSON.parse(candidate);
      } catch {
        return null;
      }
    }
    return null;
  }
}

function normalizeQuiz(raw: unknown): QuizQuestion[] {
  if (!raw || typeof raw !== "object" || !("questions" in raw)) return [];

  const questions = (raw as { questions?: unknown }).questions;
  if (!Array.isArray(questions)) return [];

  return questions
    .map((item) => {
      if (!item || typeof item !== "object") return null;

      const question = cleanText(
        (item as { question?: unknown }).question,
        500,
      );
      const rawOptions = (item as { options?: unknown }).options;
      const correctAnswer = cleanText(
        (item as { correctAnswer?: unknown }).correctAnswer,
        300,
      );
      const explanation = cleanText(
        (item as { explanation?: unknown }).explanation,
        500,
      );

      if (!question || !Array.isArray(rawOptions) || !correctAnswer) {
        return null;
      }

      const options = rawOptions
        .map((option) => cleanText(option, 300))
        .filter(Boolean)
        .slice(0, 4);

      if (options.length < 2) return null;

      // Ensure the correct answer is selectable in UI.
      if (!options.includes(correctAnswer) && options.length < 4) {
        options.push(correctAnswer);
      }

      return {
        question,
        options,
        correctAnswer,
        explanation,
      };
    })
    .filter((item): item is QuizQuestion => item !== null);
}

function buildGeneratePrompt(
  messages: Array<{ role: "system" | ChatRole; content: string }>,
): string {
  const lines = messages.map((message) => {
    const label =
      message.role === "system"
        ? "SYSTEM"
        : message.role === "user"
          ? "USER"
          : "ASSISTANT";
    return `${label}: ${message.content}`;
  });

  return `${lines.join("\n\n")}\n\nASSISTANT:`;
}

function getLatestUserMessage(messages: StudyMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i]?.role === "user") {
      return messages[i].content;
    }
  }
  return "";
}

function buildTutorFallbackAnswer(
  certificationGoal: string,
  focusTopic: string,
  difficulty: Difficulty,
  userQuestion: string,
): string {
  const question = userQuestion.toLowerCase();
  const goal = certificationGoal || "AWS Cloud Practitioner";
  const topic = focusTopic || "Fundamentos de AWS";

  if (
    (question.includes("region") || question.includes("regi")) &&
    (question.includes("az") || question.includes("zona de disponibilidad"))
  ) {
    return [
      "Modo respaldo local: no pude consultar Ollama en este intento.",
      "",
      "Diferencia clave:",
      "- Region: area geografica completa (ej. us-east-1).",
      "- AZ (Availability Zone): centro de datos aislado dentro de una Region (ej. us-east-1a).",
      "",
      "Para examen:",
      "- Multi-AZ: alta disponibilidad dentro de la misma Region.",
      "- Multi-Region: resiliencia geografica y menor impacto por desastres regionales.",
      "",
      "Mini practica:",
      "1) Crea recursos en 2 AZ distintas de us-east-1.",
      "2) Simula fallo de una AZ y verifica continuidad.",
      "3) Explica cuando usarias Multi-Region vs Multi-AZ.",
    ].join("\n");
  }

  if (question.includes("iam") || question.includes("permiso")) {
    return [
      "Modo respaldo local: no pude consultar Ollama en este intento.",
      "",
      "Resumen IAM:",
      "- Usuario: identidad de persona/aplicacion.",
      "- Rol: permisos temporales asumibles.",
      "- Policy: JSON que define acciones permitidas/denegadas.",
      "- Buenas practicas: least privilege + MFA + evitar credenciales root.",
      "",
      "Mini practica:",
      "1) Crea rol de solo lectura para S3.",
      "2) Prueba acceso a ListBucket (debe pasar).",
      "3) Prueba DeleteBucket (debe fallar).",
    ].join("\n");
  }

  return [
    "Modo respaldo local: no pude consultar Ollama en este intento.",
    "",
    `Meta: ${goal}`,
    `Tema: ${topic}`,
    `Nivel: ${difficulty}`,
    "",
    "Plan rapido de estudio:",
    "1) Define 3 conceptos clave del tema.",
    "2) Haz 1 laboratorio local en LocalStack.",
    "3) Resuelve 5 preguntas tipo certificacion y revisa errores.",
    "",
    "Si quieres, te guio paso a paso con una sesion corta de 20 minutos.",
  ].join("\n");
}

type CallSuccess = { answer: string };
type CallError = { status: number; details: string };

function buildModelOptions(
  temperature: number,
  latencyProfile: LatencyProfile,
  mode: StudyMode,
): {
  temperature: number;
  top_p: number;
  num_predict: number;
} {
  const quizBudget =
    latencyProfile === "deep"
      ? 1800
      : latencyProfile === "balanced"
        ? 1200
        : 700;
  const tutorBudget =
    latencyProfile === "deep"
      ? 650
      : latencyProfile === "balanced"
        ? 420
        : 280;

  if (latencyProfile === "deep") {
    return {
      temperature,
      top_p: 0.9,
      num_predict: mode === "quiz" ? quizBudget : tutorBudget,
    };
  }

  if (latencyProfile === "balanced") {
    return {
      temperature,
      top_p: 0.8,
      num_predict: mode === "quiz" ? quizBudget : tutorBudget,
    };
  }

  return {
    temperature,
    top_p: 0.7,
    num_predict: mode === "quiz" ? quizBudget : tutorBudget,
  };
}

async function callOllamaChat(
  messages: Array<{ role: "system" | ChatRole; content: string }>,
  temperature: number,
  mode: StudyMode,
  latencyProfile: LatencyProfile,
  jsonOutput = false,
): Promise<CallSuccess | CallError> {
  const payload: {
    model: string;
    stream: boolean;
    think: boolean;
    messages: Array<{ role: "system" | ChatRole; content: string }>;
    options: {
      temperature: number;
      top_p: number;
      num_predict: number;
    };
    format?: "json";
  } = {
    model: OLLAMA_MODEL,
    stream: false,
    think: false,
    messages,
    options: buildModelOptions(temperature, latencyProfile, mode),
  };

  if (jsonOutput) {
    payload.format = "json";
  }

  const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    return {
      status: response.status,
      details: (await response.text()) || response.statusText,
    };
  }

  const responsePayload = (await response.json()) as OllamaChatResponse;
  const answer = cleanText(responsePayload.message?.content, 12000);
  if (!answer) {
    const doneReason = cleanText(responsePayload.done_reason, 120);
    const thinkingLength =
      typeof responsePayload.message?.thinking === "string"
        ? responsePayload.message.thinking.length
        : 0;
    return {
      status: 502,
      details: `Ollama chat no devolvio contenido util. done_reason=${doneReason || "unknown"} thinking_len=${thinkingLength}`,
    };
  }

  return { answer };
}

async function callOllamaGenerate(
  messages: Array<{ role: "system" | ChatRole; content: string }>,
  temperature: number,
  mode: StudyMode,
  latencyProfile: LatencyProfile,
  jsonOutput = false,
): Promise<CallSuccess | CallError> {
  const prompt = buildGeneratePrompt(messages);
  const payload: {
    model: string;
    prompt: string;
    stream: boolean;
    think: boolean;
    options: {
      temperature: number;
      top_p: number;
      num_predict: number;
    };
    format?: "json";
  } = {
    model: OLLAMA_MODEL,
    prompt,
    stream: false,
    think: false,
    options: buildModelOptions(temperature, latencyProfile, mode),
  };

  if (jsonOutput) {
    payload.format = "json";
  }

  const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    return {
      status: response.status,
      details: (await response.text()) || response.statusText,
    };
  }

  const responsePayload = (await response.json()) as OllamaGenerateResponse;
  const answer = cleanText(responsePayload.response, 12000);
  if (!answer) {
    const doneReason = cleanText(responsePayload.done_reason, 120);
    return {
      status: 502,
      details: `Ollama generate no devolvio contenido util. done_reason=${doneReason || "unknown"}`,
    };
  }

  return { answer };
}

function parseQuizFromPlainText(raw: string): QuizQuestion[] {
  const content = raw.replace(/\r/g, "").trim();
  if (!content) return [];

  const blocks = content
    .split(/\n(?=\s*(?:\d+[\).:-]|pregunta\s+\d+))/i)
    .map((block) => block.trim())
    .filter(Boolean);

  const candidates = blocks.length > 0 ? blocks : [content];

  const parsed = candidates
    .map((block) => {
      const lines = block
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      if (lines.length < 3) return null;

      const question = cleanText(
        lines[0].replace(/^(?:\d+[\).:-]\s*|pregunta\s+\d+[:.)-]?\s*)/i, ""),
        500,
      );
      if (!question) return null;

      const options = lines
        .map((line) => {
          const optionMatch = line.match(/^(?:[A-Da-d][).:-]\s*|[-*]\s+)(.+)$/);
          return cleanText(optionMatch?.[1], 300);
        })
        .filter(Boolean)
        .slice(0, 4);

      if (options.length < 2) return null;

      const answerLine = lines.find((line) =>
        /^(?:respuesta\s+correcta|correct\s+answer|respuesta)\s*[:\-]/i.test(
          line,
        ),
      );
      let correctAnswer = "";
      if (answerLine) {
        const extracted = cleanText(
          answerLine.replace(
            /^(?:respuesta\s+correcta|correct\s+answer|respuesta)\s*[:\-]\s*/i,
            "",
          ),
          300,
        );

        const letterMatch = extracted.match(/^[A-Da-d]$/);
        if (letterMatch) {
          const index = letterMatch[0].toUpperCase().charCodeAt(0) - 65;
          correctAnswer = options[index] || "";
        } else {
          correctAnswer = extracted;
        }
      }

      const explanationLine = lines.find((line) =>
        /^(?:explicacion|explanation)\s*[:\-]/i.test(line),
      );
      const explanation = explanationLine
        ? cleanText(
            explanationLine.replace(/^(?:explicacion|explanation)\s*[:\-]\s*/i, ""),
            500,
          )
        : "Repasa el concepto y valida por que la opcion correcta es la mejor segun el escenario.";

      if (!correctAnswer) return null;
      if (!options.includes(correctAnswer) && options.length < 4) {
        options.push(correctAnswer);
      }

      return {
        question,
        options,
        correctAnswer,
        explanation,
      };
    })
    .filter((item): item is QuizQuestion => item !== null);

  return parsed;
}

async function repairQuizWithModel(
  rawAnswer: string,
  questionCount: number,
  latencyProfile: LatencyProfile,
): Promise<QuizQuestion[]> {
  const repairMessages: Array<{ role: "system" | ChatRole; content: string }> = [
    {
      role: "system",
      content: `Convierte contenido libre a JSON valido para un quiz.
Devuelve SOLO JSON con este formato exacto:
{"questions":[{"question":"...","options":["...","...","...","..."],"correctAnswer":"...","explanation":"..."}]}
Reglas: exactamente ${questionCount} preguntas, 4 opciones por pregunta, 1 correcta, espanol.`,
    },
    {
      role: "user",
      content: `Contenido original:\n${rawAnswer}`,
    },
  ];

  const repaired = await callOllamaGenerate(
    repairMessages,
    0.1,
    "quiz",
    latencyProfile,
    true,
  );
  if ("status" in repaired) return [];

  const parsed = extractJsonObject(repaired.answer);
  return normalizeQuiz(parsed).slice(0, questionCount);
}

function buildDeterministicFallbackQuiz(
  questionCount: number,
  focusTopic: string,
): QuizQuestion[] {
  const safeTopic = focusTopic || "fundamentos de AWS";
  const correctOption =
    "Aplicar buenas practicas de seguridad y validar con una prueba en LocalStack.";
  const options = [
    correctOption,
    "Usar siempre la cuenta root para simplificar permisos.",
    "Desactivar monitoreo y logs para reducir costo inmediato.",
    "Evitar automatizacion y hacer cambios manuales en produccion.",
  ];

  return Array.from({ length: questionCount }, (_, index) => ({
    question: `Pregunta de repaso ${index + 1}: cual es la practica mas recomendada al trabajar ${safeTopic}?`,
    options,
    correctAnswer: correctOption,
    explanation:
      "La opcion correcta prioriza seguridad, trazabilidad y validacion practica antes de mover cambios a entornos reales.",
  }));
}

function toKeyedQuestions(
  questions: QuizQuestion[],
): Array<QuizQuestion & { key: string }> {
  const keyed = questions.map((question) => ({
    ...question,
    key: buildQuestionKey(question.question, question.correctAnswer),
  }));

  const map = new Map<string, QuizQuestion & { key: string }>();
  for (const item of keyed) {
    if (!map.has(item.key)) map.set(item.key, item);
  }
  return Array.from(map.values());
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as StudyChatRequest;
    const mode: StudyMode = body.mode === "quiz" ? "quiz" : "tutor";
    const difficulty = parseStudyDifficulty(body.difficulty);
    const certificationGoal = cleanText(body.certificationGoal, 180);
    const focusTopic = cleanText(body.focusTopic, 180);
    const questionCount = Math.min(
      Math.max(Number(body.questionCount) || 5, 1),
      10,
    );
    const messages = sanitizeMessages(body.messages);
    const generationStrategy = parseGenerationStrategy(body.generationStrategy);
    const latencyProfile = parseLatencyProfile(body.latencyProfile);
    const avoidRecent = body.avoidRecent !== false;
    const clientRecentKeys = sanitizeQuestionKeys(body.recentQuestionKeys);

    const systemPrompt = getSystemPrompt(
      mode,
      certificationGoal,
      focusTopic,
      difficulty,
      questionCount,
    );

    const ollamaMessages: Array<{ role: "system" | ChatRole; content: string }> =
      [{ role: "system", content: systemPrompt }];

    if (mode === "quiz") {
      ollamaMessages.push({
        role: "user",
        content: `Genera ${questionCount} preguntas tipo certificacion sobre AWS y practica local en LocalStack.
Tema: ${focusTopic || "fundamentos AWS"}.
Reglas:
- SOLO JSON valido, sin markdown.
- 4 opciones por pregunta.
- 1 respuesta correcta.
- explicacion breve (maximo 1-2 lineas).
- evita repetir preguntas.`,
      });
    } else if (messages.length > 0) {
      ollamaMessages.push(...messages);
    } else {
      ollamaMessages.push({
        role: "user",
        content:
          "Quiero empezar a estudiar AWS en local. Dame una ruta de estudio practica para hoy.",
      });
    }

    const temperature = mode === "quiz" ? 0.3 : 0.5;
    const expectsJson = mode === "quiz";
    const preferGenerate = OLLAMA_API_MODE === "generate";
    const preferChat = OLLAMA_API_MODE === "chat";

    if (mode === "quiz") {
      const avoidSet = new Set<string>();
      if (avoidRecent) {
        clientRecentKeys.forEach((key) => avoidSet.add(key));
        globalRecentQuestionKeys.forEach((key) => avoidSet.add(key));
      }

      const bankResult =
        generationStrategy === "model"
          ? { questions: [], glossary: [] as GlossaryEntry[], questionKeys: [] as string[] }
          : generateQuizFromBank({
              certificationGoal,
              focusTopic,
              difficulty,
              questionCount,
              excludeKeys: avoidSet,
            });

      let finalQuestions = toKeyedQuestions(bankResult.questions);
      let finalGlossary = [...bankResult.glossary];
      let source: "bank" | "model" | "mixed" = "bank";
      let usedFallback = false;

      const shouldUseModel =
        generationStrategy === "model" ||
        (generationStrategy === "hybrid" && latencyProfile !== "fast");

      if (shouldUseModel) {
        const missingCount =
          generationStrategy === "model"
            ? questionCount
            : Math.max(questionCount - finalQuestions.length, 0);

        if (missingCount > 0) {
          const modelPromptMessages: Array<{
            role: "system" | ChatRole;
            content: string;
          }> = [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: `Genera ${missingCount} preguntas nuevas y no repetidas.
Tema: ${focusTopic || "fundamentos AWS"}.
Formato exacto:
{"questions":[{"question":"...","options":["...","...","...","..."],"correctAnswer":"...","explanation":"..."}]}`,
            },
          ];

          let firstAttempt: CallSuccess | CallError;
          let secondAttempt: CallSuccess | CallError | null = null;

          if (preferGenerate) {
            firstAttempt = await callOllamaGenerate(
              modelPromptMessages,
              temperature,
              "quiz",
              latencyProfile,
              true,
            );
          } else {
            firstAttempt = await callOllamaChat(
              modelPromptMessages,
              temperature,
              "quiz",
              latencyProfile,
              true,
            );
          }

          if ("status" in firstAttempt && !preferChat && !preferGenerate) {
            secondAttempt = preferGenerate
              ? await callOllamaChat(
                  modelPromptMessages,
                  temperature,
                  "quiz",
                  latencyProfile,
                  true,
                )
              : await callOllamaGenerate(
                  modelPromptMessages,
                  temperature,
                  "quiz",
                  latencyProfile,
                  true,
                );
          }

          const modelResult =
            secondAttempt && !("status" in secondAttempt)
              ? secondAttempt
              : !("status" in firstAttempt)
                ? firstAttempt
                : secondAttempt;

          if (modelResult && !("status" in modelResult)) {
            const parsed = extractJsonObject(modelResult.answer);
            let modelQuestions = normalizeQuiz(parsed);

            if (modelQuestions.length === 0) {
              modelQuestions = parseQuizFromPlainText(modelResult.answer).slice(
                0,
                missingCount,
              );
            }

            if (modelQuestions.length === 0) {
              modelQuestions = await repairQuizWithModel(
                modelResult.answer,
                missingCount,
                latencyProfile,
              );
            }

            const keyedModelQuestions = toKeyedQuestions(modelQuestions).filter(
              (question) =>
                !avoidSet.has(question.key) &&
                !finalQuestions.some((existing) => existing.key === question.key),
            );

            if (keyedModelQuestions.length > 0) {
              finalQuestions = [
                ...finalQuestions,
                ...keyedModelQuestions.slice(0, missingCount),
              ];
              source = bankResult.questions.length > 0 ? "mixed" : "model";
            }
          }
        }
      }

      if (finalQuestions.length < questionCount) {
        const needed = questionCount - finalQuestions.length;
        const fallback = toKeyedQuestions(
          buildDeterministicFallbackQuiz(needed, focusTopic),
        ).filter(
          (question) =>
            !finalQuestions.some((existing) => existing.key === question.key),
        );

        if (fallback.length > 0) {
          finalQuestions = [...finalQuestions, ...fallback];
          usedFallback = true;
          if (source === "model") {
            source = "mixed";
          }
        }
      }

      finalQuestions = finalQuestions.slice(0, questionCount);
      const finalKeys = finalQuestions.map((question) => question.key);
      rememberQuestionKeys(finalKeys);

      if (finalGlossary.length === 0) {
        const glossaryFallback = generateQuizFromBank({
          certificationGoal,
          focusTopic,
          difficulty,
          questionCount: 10,
        });
        finalGlossary = glossaryFallback.glossary;
      }

      return NextResponse.json({
        mode,
        model: OLLAMA_MODEL,
        source,
        latencyProfile,
        questionKeys: finalKeys,
        glossary: finalGlossary,
        questions: finalQuestions.map(({ key, ...question }) => question),
        warning: usedFallback
          ? "Se completaron preguntas con respaldo local para evitar bloqueos."
          : undefined,
      });
    }

    let firstAttempt: CallSuccess | CallError;
    let secondAttempt: CallSuccess | CallError | null = null;

    if (preferGenerate) {
      firstAttempt = await callOllamaGenerate(
        ollamaMessages,
        temperature,
        mode,
        latencyProfile,
        expectsJson,
      );
    } else {
      firstAttempt = await callOllamaChat(
        ollamaMessages,
        temperature,
        mode,
        latencyProfile,
        expectsJson,
      );
    }

    if ("status" in firstAttempt && !preferChat && !preferGenerate) {
      secondAttempt = preferGenerate
        ? await callOllamaChat(
            ollamaMessages,
            temperature,
            mode,
            latencyProfile,
            expectsJson,
          )
        : await callOllamaGenerate(
            ollamaMessages,
            temperature,
            mode,
            latencyProfile,
            expectsJson,
          );
    }

    const result = secondAttempt && !("status" in secondAttempt)
      ? secondAttempt
      : !("status" in firstAttempt)
        ? firstAttempt
        : secondAttempt;

    if (!result || "status" in result) {
      const primaryError =
        "status" in firstAttempt
          ? `${firstAttempt.status}: ${firstAttempt.details}`
          : "";
      const secondaryError =
        secondAttempt && "status" in secondAttempt
          ? `${secondAttempt.status}: ${secondAttempt.details}`
          : "";

      const details = [primaryError, secondaryError].filter(Boolean).join(" | ");
      const fallbackAnswer = buildTutorFallbackAnswer(
        certificationGoal,
        focusTopic,
        difficulty,
        getLatestUserMessage(messages),
      );

      return NextResponse.json({
        mode,
        model: OLLAMA_MODEL,
        source: "local-fallback",
        warning:
          "No se pudo consultar Ollama en este intento. Se activo respuesta local de respaldo.",
        details,
        answer: fallbackAnswer,
      });
    }

    const answer = result.answer;

    return NextResponse.json({
      mode,
      model: OLLAMA_MODEL,
      answer,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error && error.message
        ? error.message
        : "Error inesperado al generar contenido.";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 },
    );
  }
}
