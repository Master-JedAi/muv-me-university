import {
  getMasteryState,
  upsertMasteryState,
  createWeakPoint,
  getWeakPoints,
  createEvidenceArtifact,
  logEvent,
} from "./storage";
import { createHash } from "crypto";

export interface MasteryDelta {
  conceptId: string;
  scoreDelta: number;
  confidence: number;
  source: string;
}

export interface AcceptanceResult {
  accepted: boolean;
  reason?: string;
  finalScore?: number;
  finalStability?: number;
}

const CONFIDENCE_GATE = 0.3;
const DELTA_CAP = 0.25;
const STABILITY_REQUIREMENT_FOR_MISCONCEPTION = 0.5;

export async function acceptMasteryDelta(
  learnerId: string,
  delta: MasteryDelta,
): Promise<AcceptanceResult> {
  if (delta.confidence < CONFIDENCE_GATE) {
    return {
      accepted: false,
      reason: `Confidence ${delta.confidence} below gate ${CONFIDENCE_GATE}`,
    };
  }

  const cappedDelta = Math.max(
    -DELTA_CAP,
    Math.min(DELTA_CAP, delta.scoreDelta),
  );

  const current = await getMasteryState(learnerId, delta.conceptId);
  const currentScore = current?.score ?? 0;
  const currentStability = current?.stability ?? 0;

  const newScore = Math.max(0, Math.min(1, currentScore + cappedDelta));
  const stabilityChange = cappedDelta > 0 ? 0.05 : -0.1;
  const newStability = Math.max(
    0,
    Math.min(1, currentStability + stabilityChange),
  );

  if (
    cappedDelta < 0 &&
    currentStability < STABILITY_REQUIREMENT_FOR_MISCONCEPTION
  ) {
    return {
      accepted: false,
      reason: `Stability ${currentStability} too low for negative delta on misconception`,
    };
  }

  await upsertMasteryState({
    learnerId,
    conceptId: delta.conceptId,
    score: newScore,
    stability: newStability,
  });

  await logEvent({
    learnerId,
    eventType: "mastery_delta_accepted",
    payload: {
      conceptId: delta.conceptId,
      previousScore: currentScore,
      newScore,
      delta: cappedDelta,
      source: delta.source,
    },
  });

  return {
    accepted: true,
    finalScore: newScore,
    finalStability: newStability,
  };
}

export type WeakPointType =
  | "misconception"
  | "fragile_understanding"
  | "transfer_failure"
  | "signal_prioritization"
  | "attention_drift";

interface Signal {
  type: string;
  value: number;
  timestamp: string;
}

export async function detectWeakPoints(
  learnerId: string,
  signals: Signal[],
  conceptId: string,
): Promise<void> {
  const repeatedErrors = signals.filter(
    (s) => s.type === "error" && s.value > 0.5,
  );
  const slowCorrects = signals.filter(
    (s) => s.type === "slow_correct" && s.value > 0.7,
  );
  const transferFails = signals.filter((s) => s.type === "transfer_fail");
  const sortingErrors = signals.filter(
    (s) => s.type === "signal_sort_error",
  );
  const driftSignals = signals.filter(
    (s) => s.type === "pin" || s.type === "interruption",
  );

  if (repeatedErrors.length >= 2) {
    await createWeakPoint({
      learnerId,
      conceptId,
      wpType: "misconception",
      severity: Math.min(1, repeatedErrors.length * 0.3),
      signals: repeatedErrors as unknown as Record<string, unknown>[],
    });
  }

  if (slowCorrects.length >= 1) {
    await createWeakPoint({
      learnerId,
      conceptId,
      wpType: "fragile_understanding",
      severity: Math.min(1, slowCorrects.length * 0.25),
      signals: slowCorrects as unknown as Record<string, unknown>[],
    });
  }

  if (transferFails.length >= 1) {
    await createWeakPoint({
      learnerId,
      conceptId,
      wpType: "transfer_failure",
      severity: Math.min(1, transferFails.length * 0.4),
      signals: transferFails as unknown as Record<string, unknown>[],
    });
  }

  if (sortingErrors.length >= 2) {
    await createWeakPoint({
      learnerId,
      conceptId,
      wpType: "signal_prioritization",
      severity: Math.min(1, sortingErrors.length * 0.2),
      signals: sortingErrors as unknown as Record<string, unknown>[],
    });
  }

  if (driftSignals.length >= 3) {
    await createWeakPoint({
      learnerId,
      conceptId,
      wpType: "attention_drift",
      severity: Math.min(1, driftSignals.length * 0.15),
      signals: driftSignals as unknown as Record<string, unknown>[],
    });
  }
}

export function computeArtifactHash(payload: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex")
    .substring(0, 16);
}

export async function recordEvidence(data: {
  learnerId: string;
  sessionId: string;
  artifactType: string;
  payload: Record<string, unknown>;
  tags?: string[];
  metrics?: Record<string, unknown>;
}) {
  const hash = computeArtifactHash(data.payload);
  return createEvidenceArtifact({
    learnerId: data.learnerId,
    sessionId: data.sessionId,
    artifactType: data.artifactType,
    hash,
    tags: data.tags || [],
    metrics: data.metrics || {},
    payload: data.payload,
  });
}
