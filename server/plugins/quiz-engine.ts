import { randomUUID } from "crypto";
import { acceptMasteryDelta, recordEvidence } from "../kernel";
import type { MasteryDelta, AcceptanceResult } from "../kernel";

export interface QuizQuestion {
  id: string;
  conceptId: string;
  questionText: string;
  options: string[];
  correctIndex: number;
  difficulty: number;
}

export interface QuizPayload {
  quizId: string;
  sessionId: string;
  questions: QuizQuestion[];
  quizType: string;
}

export interface GradeResult {
  attemptId: string;
  score: number;
  totalQuestions: number;
  correctCount: number;
  masteryResults: AcceptanceResult[];
  artifactId: string;
}

const QUESTION_BANK: Record<string, QuizQuestion[]> = {
  default: [
    {
      id: "q1",
      conceptId: "",
      questionText: "What is the primary purpose of this concept?",
      options: [
        "To organize information",
        "To solve problems",
        "To communicate ideas",
        "All of the above",
      ],
      correctIndex: 3,
      difficulty: 0.3,
    },
    {
      id: "q2",
      conceptId: "",
      questionText: "Which approach best demonstrates understanding?",
      options: [
        "Memorizing facts",
        "Applying knowledge to new situations",
        "Repeating exercises",
        "Reading more material",
      ],
      correctIndex: 1,
      difficulty: 0.5,
    },
    {
      id: "q3",
      conceptId: "",
      questionText: "What is a common misconception about this topic?",
      options: [
        "It is always straightforward",
        "There is only one correct approach",
        "Understanding requires practice",
        "Both A and B",
      ],
      correctIndex: 3,
      difficulty: 0.6,
    },
    {
      id: "q4",
      conceptId: "",
      questionText: "How would you verify your understanding?",
      options: [
        "Take a test",
        "Teach it to someone else",
        "Apply it in a different context",
        "All of the above",
      ],
      correctIndex: 3,
      difficulty: 0.4,
    },
    {
      id: "q5",
      conceptId: "",
      questionText:
        "What distinguishes mastery from surface-level knowledge?",
      options: [
        "Speed of recall",
        "Ability to transfer to new domains",
        "Number of facts known",
        "Time spent studying",
      ],
      correctIndex: 1,
      difficulty: 0.7,
    },
  ],
};

export async function createQuiz(
  sessionId: string,
  learnerId: string,
  conceptIds: string[],
  quizType: string = "placement",
  _policy: Record<string, unknown> = {},
): Promise<QuizPayload> {
  const quizId = randomUUID();
  const bank = QUESTION_BANK["default"];
  const questions = bank.map((q, i) => ({
    ...q,
    id: `${quizId}_q${i}`,
    conceptId: conceptIds[i % conceptIds.length] || "general",
  }));

  return {
    quizId,
    sessionId,
    questions,
    quizType,
  };
}

export async function gradeQuiz(
  sessionId: string,
  attemptId: string,
  learnerId: string,
  quizId: string,
  responses: { questionId: string; selectedIndex: number }[],
  questions: QuizQuestion[],
): Promise<GradeResult> {
  let correctCount = 0;
  const conceptScores: Record<string, { correct: number; total: number }> = {};

  for (const resp of responses) {
    const question = questions.find((q) => q.id === resp.questionId);
    if (!question) continue;

    const isCorrect = resp.selectedIndex === question.correctIndex;
    if (isCorrect) correctCount++;

    if (!conceptScores[question.conceptId]) {
      conceptScores[question.conceptId] = { correct: 0, total: 0 };
    }
    conceptScores[question.conceptId].total++;
    if (isCorrect) conceptScores[question.conceptId].correct++;
  }

  const score = responses.length > 0 ? correctCount / responses.length : 0;

  const deltas: MasteryDelta[] = Object.entries(conceptScores).map(
    ([conceptId, { correct, total }]) => ({
      conceptId,
      scoreDelta: (correct / total - 0.5) * 0.4,
      confidence: total >= 2 ? 0.6 : 0.3,
      source: `quiz:${quizId}`,
    }),
  );

  const masteryResults: AcceptanceResult[] = [];
  for (const delta of deltas) {
    const result = await acceptMasteryDelta(learnerId, delta);
    masteryResults.push(result);
  }

  const artifact = await recordEvidence({
    learnerId,
    sessionId,
    artifactType: "quiz_attempt",
    payload: {
      quizId,
      attemptId,
      responses,
      score,
      correctCount,
      totalQuestions: responses.length,
      conceptScores,
    },
    tags: ["quiz", `type:placement`],
    metrics: { score, correctCount, totalQuestions: responses.length },
  });

  return {
    attemptId,
    score,
    totalQuestions: responses.length,
    correctCount,
    masteryResults,
    artifactId: artifact.id,
  };
}
