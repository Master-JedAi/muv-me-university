import { randomUUID } from "crypto";
import { acceptMasteryDelta, recordEvidence } from "../kernel";
import type { AcceptanceResult } from "../kernel";

export interface GameChallenge {
  id: string;
  type: "match" | "sequence" | "fill_blank" | "categorize";
  prompt: string;
  data: Record<string, unknown>;
  conceptId: string;
}

export interface GameRunPayload {
  gameRunId: string;
  sessionId: string;
  challenges: GameChallenge[];
  vibe: string;
  weakPointIds: string[];
}

export interface GameOutcome {
  challengeResults: {
    challengeId: string;
    correct: boolean;
    timeMs: number;
  }[];
}

export interface GameReport {
  gameRunId: string;
  score: number;
  masteryResults: AcceptanceResult[];
  artifactId: string;
}

const GAME_TEMPLATES: Record<string, GameChallenge[]> = {
  match: [
    {
      id: "",
      type: "match",
      prompt: "Match the concept to its definition",
      data: {
        pairs: [
          { term: "Concept A", definition: "Definition of A" },
          { term: "Concept B", definition: "Definition of B" },
          { term: "Concept C", definition: "Definition of C" },
        ],
      },
      conceptId: "",
    },
  ],
  sequence: [
    {
      id: "",
      type: "sequence",
      prompt: "Arrange these steps in the correct order",
      data: {
        items: ["Step 1", "Step 2", "Step 3", "Step 4"],
        correctOrder: [0, 1, 2, 3],
      },
      conceptId: "",
    },
  ],
  fill_blank: [
    {
      id: "",
      type: "fill_blank",
      prompt: "Complete the statement: Learning requires ___",
      data: {
        answer: "practice",
        hints: ["It involves repetition", "Think of skill building"],
      },
      conceptId: "",
    },
  ],
  categorize: [
    {
      id: "",
      type: "categorize",
      prompt: "Sort these items into the correct categories",
      data: {
        categories: ["Category A", "Category B"],
        items: [
          { text: "Item 1", category: 0 },
          { text: "Item 2", category: 1 },
          { text: "Item 3", category: 0 },
          { text: "Item 4", category: 1 },
        ],
      },
      conceptId: "",
    },
  ],
};

export async function generateGame(
  sessionId: string,
  learnerId: string,
  weakPointIds: string[],
  vibe: string = "focused",
  templatesAllowed: string[] = ["match", "sequence", "fill_blank", "categorize"],
  _policy: Record<string, unknown> = {},
): Promise<GameRunPayload> {
  const gameRunId = randomUUID();
  const challenges: GameChallenge[] = [];

  for (const tpl of templatesAllowed.slice(0, 3)) {
    const templates = GAME_TEMPLATES[tpl];
    if (!templates) continue;
    for (const t of templates) {
      challenges.push({
        ...t,
        id: `${gameRunId}_${tpl}_${challenges.length}`,
        conceptId: weakPointIds[challenges.length % weakPointIds.length] || "general",
      });
    }
  }

  return {
    gameRunId,
    sessionId,
    challenges,
    vibe,
    weakPointIds,
  };
}

export async function reportGameOutcome(
  sessionId: string,
  gameRunId: string,
  learnerId: string,
  outcome: GameOutcome,
  conceptIds: string[],
): Promise<GameReport> {
  const correctCount = outcome.challengeResults.filter(
    (r) => r.correct,
  ).length;
  const total = outcome.challengeResults.length;
  const score = total > 0 ? correctCount / total : 0;

  const masteryResults: AcceptanceResult[] = [];
  for (const conceptId of conceptIds) {
    const result = await acceptMasteryDelta(learnerId, {
      conceptId,
      scoreDelta: (score - 0.5) * 0.3,
      confidence: total >= 2 ? 0.5 : 0.25,
      source: `game:${gameRunId}`,
    });
    masteryResults.push(result);
  }

  const artifact = await recordEvidence({
    learnerId,
    sessionId,
    artifactType: "game_run",
    payload: {
      gameRunId,
      outcome,
      score,
      correctCount,
      totalChallenges: total,
    },
    tags: ["game"],
    metrics: { score, correctCount, totalChallenges: total },
  });

  return {
    gameRunId,
    score,
    masteryResults,
    artifactId: artifact.id,
  };
}
