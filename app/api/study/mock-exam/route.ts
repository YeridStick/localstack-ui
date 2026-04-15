import { NextRequest, NextResponse } from "next/server";
import {
  buildQuestionKey,
  generateMockExamFromBank,
  getStudySourcesForTags,
  StudyDifficulty,
  StudySourceReference,
} from "@/lib/study/question-bank";

interface MockExamRequest {
  certificationGoal?: string;
  focusTopic?: string;
  difficulty?: StudyDifficulty;
  totalQuestions?: number;
  durationMinutes?: number;
  avoidRecent?: boolean;
  recentQuestionKeys?: string[];
}

const MAX_RECENT = 600;
const globalRecentKeys: string[] = [];

function mergeSources(sourceLists: StudySourceReference[][]): StudySourceReference[] {
  const map = new Map<string, StudySourceReference>();
  for (const list of sourceLists) {
    for (const source of list) {
      if (!map.has(source.id)) {
        map.set(source.id, source);
      }
    }
  }
  return Array.from(map.values());
}

function cleanText(value: unknown, max = 220): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function parseDifficulty(value: unknown): StudyDifficulty {
  if (value === "advanced") return "advanced";
  if (value === "intermediate") return "intermediate";
  return "beginner";
}

function sanitizeQuestionKeys(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((item) => cleanText(item, 180))
    .filter((item) => /^[a-z0-9-]+$/.test(item))
    .slice(0, MAX_RECENT);
}

function remember(keys: string[]) {
  for (const key of keys) {
    if (!globalRecentKeys.includes(key)) {
      globalRecentKeys.unshift(key);
    }
  }
  if (globalRecentKeys.length > MAX_RECENT) {
    globalRecentKeys.splice(MAX_RECENT);
  }
}

function examDurationFor(totalQuestions: number, requested?: number): number {
  if (requested && requested >= 10 && requested <= 180) {
    return requested;
  }
  if (totalQuestions >= 65) return 90;
  if (totalQuestions >= 40) return 60;
  if (totalQuestions >= 25) return 45;
  return 30;
}

function buildExamId(
  certificationGoal: string,
  difficulty: StudyDifficulty,
  totalQuestions: number,
): string {
  const stamp = Date.now().toString(36);
  const seed = buildQuestionKey(
    `${certificationGoal}-${difficulty}-${totalQuestions}-${stamp}`,
    stamp,
  );
  return `mock-${seed.slice(0, 24)}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as MockExamRequest;

    const certificationGoal =
      cleanText(body.certificationGoal, 180) || "AWS Cloud Practitioner";
    const focusTopic = cleanText(body.focusTopic, 180) || "Fundamentos de AWS";
    const difficulty = parseDifficulty(body.difficulty);
    const totalQuestions = Math.min(
      Math.max(Number(body.totalQuestions) || 40, 5),
      80,
    );
    const durationMinutes = examDurationFor(
      totalQuestions,
      Number(body.durationMinutes) || undefined,
    );
    const avoidRecent = body.avoidRecent !== false;
    const clientKeys = sanitizeQuestionKeys(body.recentQuestionKeys);

    const excludeSet = new Set<string>();
    if (avoidRecent) {
      clientKeys.forEach((key) => excludeSet.add(key));
      globalRecentKeys.forEach((key) => excludeSet.add(key));
    }

    const generated = generateMockExamFromBank({
      certificationGoal,
      focusTopic,
      difficulty,
      totalQuestions,
      excludeKeys: excludeSet,
    });

    remember(generated.questionKeys);

    const examId = buildExamId(certificationGoal, difficulty, totalQuestions);
    const questionsWithSources = generated.questions.map(({ key, ...question }) => ({
      ...question,
      sources: getStudySourcesForTags(question.tags, 3),
    }));
    const officialSources = mergeSources(
      questionsWithSources.map((question) => question.sources),
    ).slice(0, 12);

    return NextResponse.json({
      examId,
      mode: "mock-exam",
      certificationGoal,
      focusTopic,
      difficulty,
      totalQuestions,
      durationMinutes,
      questionKeys: generated.questionKeys,
      blueprint: generated.blueprint,
      availablePool: generated.availablePool,
      questions: questionsWithSources,
      officialSources,
      recommendations: [
        "Responde sin ayuda externa para medir nivel real.",
        "En cada error, abre la fuente oficial asociada y toma 2 notas clave.",
        "Al cerrar el simulacro, enfocate primero en dominios por debajo de 70%.",
      ],
      warning:
        generated.questions.length < totalQuestions
          ? "No se alcanzo el total solicitado por falta de preguntas unicas."
          : undefined,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "No se pudo generar el simulacro.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
