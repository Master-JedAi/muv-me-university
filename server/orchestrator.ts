import { randomUUID } from "crypto";
import {
  createConcept,
  createCourseBlueprint,
  createCourseRun,
  createPin,
  getWeakPoints,
  logEvent,
} from "./storage";
import { createQuiz, gradeQuiz } from "./plugins/quiz-engine";
import { generateGame } from "./plugins/game-engine";
import { createEvidencePack } from "./plugins/search-ingestion";
import { recordEvidence } from "./kernel";

export type IntentType =
  | "create_course"
  | "run_placement_quiz"
  | "generate_games"
  | "checkpoint"
  | "final_exam"
  | "create_portfolio"
  | "pin"
  | "search"
  | "unknown";

interface OrchestrateRequest {
  learner_id: string;
  transcript: string;
  policy_flags?: Record<string, unknown>;
}

interface OrchestrateResponse {
  intent: IntentType;
  actions: OrchestrateAction[];
  message: string;
  data?: unknown;
}

interface OrchestrateAction {
  plugin: string;
  function: string;
  result: unknown;
}

export function parseIntent(transcript: string): IntentType {
  const lower = transcript.toLowerCase();

  if (
    lower.includes("create course") ||
    lower.includes("new course") ||
    lower.includes("learn about") ||
    lower.includes("teach me") ||
    lower.includes("i want to learn") ||
    lower.includes("start learning")
  ) {
    return "create_course";
  }

  if (
    lower.includes("quiz") ||
    lower.includes("test me") ||
    lower.includes("placement") ||
    lower.includes("assess")
  ) {
    return "run_placement_quiz";
  }

  if (
    lower.includes("game") ||
    lower.includes("play") ||
    lower.includes("practice") ||
    lower.includes("exercise")
  ) {
    return "generate_games";
  }

  if (
    lower.includes("checkpoint") ||
    lower.includes("progress") ||
    lower.includes("how am i doing")
  ) {
    return "checkpoint";
  }

  if (lower.includes("final exam") || lower.includes("final test")) {
    return "final_exam";
  }

  if (
    lower.includes("portfolio") ||
    lower.includes("showcase") ||
    lower.includes("evidence")
  ) {
    return "create_portfolio";
  }

  if (
    lower.includes("pin") ||
    lower.includes("save for later") ||
    lower.includes("remember") ||
    lower.includes("bookmark")
  ) {
    return "pin";
  }

  if (
    lower.includes("search") ||
    lower.includes("find") ||
    lower.includes("look up") ||
    lower.includes("research")
  ) {
    return "search";
  }

  return "unknown";
}

function extractTopic(transcript: string): string {
  const patterns = [
    /learn(?:ing)?\s+about\s+(.+)/i,
    /teach\s+me\s+(.+)/i,
    /create\s+(?:a\s+)?course\s+(?:on|about|for)\s+(.+)/i,
    /i\s+want\s+to\s+learn\s+(.+)/i,
    /start\s+learning\s+(.+)/i,
    /quiz\s+(?:me\s+)?(?:on|about)\s+(.+)/i,
    /test\s+(?:me\s+)?(?:on|about)\s+(.+)/i,
    /search\s+(?:for\s+)?(.+)/i,
    /find\s+(.+)/i,
    /research\s+(.+)/i,
    /pin\s+(.+)/i,
    /remember\s+(.+)/i,
    /save\s+(.+)/i,
  ];

  for (const pattern of patterns) {
    const match = transcript.match(pattern);
    if (match && match[1]) {
      return match[1].trim().replace(/[.!?]+$/, "");
    }
  }

  return transcript.trim().replace(/[.!?]+$/, "");
}

export async function orchestrate(
  req: OrchestrateRequest,
): Promise<OrchestrateResponse> {
  const { learner_id, transcript } = req;
  const sessionId = randomUUID();
  const intent = parseIntent(transcript);
  const topic = extractTopic(transcript);
  const actions: OrchestrateAction[] = [];

  await logEvent({
    learnerId: learner_id,
    eventType: "orchestrate_request",
    payload: { transcript, intent, topic, sessionId },
  });

  switch (intent) {
    case "create_course": {
      const concept = await createConcept({
        label: topic,
        domain: topic.split(" ")[0] || "general",
        description: `Auto-created from voice: "${transcript}"`,
      });

      const blueprint = await createCourseBlueprint({
        title: `Learn: ${topic}`,
        description: `Course created via voice command`,
        conceptIds: [concept.id],
        learnerId: learner_id,
      });

      const run = await createCourseRun({
        blueprintId: blueprint.id,
        learnerId: learner_id,
      });

      actions.push({
        plugin: "kernel",
        function: "create_course",
        result: { concept, blueprint, run },
      });

      return {
        intent,
        actions,
        message: `Created a new course: "${topic}". Ready to start learning!`,
        data: { concept, blueprint, run },
      };
    }

    case "run_placement_quiz": {
      const concept = await createConcept({
        label: topic,
        domain: topic.split(" ")[0] || "general",
      });

      const quiz = await createQuiz(
        sessionId,
        learner_id,
        [concept.id],
        "placement",
      );

      actions.push({
        plugin: "quiz_engine.v1",
        function: "quiz.create",
        result: quiz,
      });

      return {
        intent,
        actions,
        message: `Here's a placement quiz on "${topic}". Answer the questions to assess your level.`,
        data: quiz,
      };
    }

    case "generate_games": {
      const wps = await getWeakPoints(learner_id);
      const wpIds = wps.length > 0 ? wps.map((wp) => wp.id) : ["general"];

      const game = await generateGame(
        sessionId,
        learner_id,
        wpIds,
        "focused",
      );

      actions.push({
        plugin: "game_engine.v1",
        function: "game.generate",
        result: game,
      });

      return {
        intent,
        actions,
        message: `Generated practice games targeting your weak points. Let's strengthen those areas!`,
        data: game,
      };
    }

    case "checkpoint": {
      const wps = await getWeakPoints(learner_id);

      await recordEvidence({
        learnerId: learner_id,
        sessionId,
        artifactType: "checkpoint",
        payload: { transcript, weakPointCount: wps.length },
        tags: ["checkpoint"],
      });

      return {
        intent,
        actions,
        message: `Checkpoint recorded. You have ${wps.length} active weak point${wps.length === 1 ? "" : "s"} to work on.`,
        data: { weakPointCount: wps.length, weakPoints: wps },
      };
    }

    case "final_exam": {
      const concept = await createConcept({
        label: topic,
        domain: topic.split(" ")[0] || "general",
      });

      const quiz = await createQuiz(
        sessionId,
        learner_id,
        [concept.id],
        "final",
      );

      actions.push({
        plugin: "quiz_engine.v1",
        function: "quiz.create",
        result: quiz,
      });

      return {
        intent,
        actions,
        message: `Final exam prepared for "${topic}". This will verify your mastery.`,
        data: quiz,
      };
    }

    case "create_portfolio": {
      await recordEvidence({
        learnerId: learner_id,
        sessionId,
        artifactType: "portfolio_entry",
        payload: { transcript, topic },
        tags: ["portfolio"],
      });

      return {
        intent,
        actions,
        message: `Portfolio entry created for "${topic}".`,
      };
    }

    case "pin": {
      const pin = await createPin({
        learnerId: learner_id,
        content: topic,
        source: "voice",
      });

      actions.push({
        plugin: "kernel",
        function: "pin.create",
        result: pin,
      });

      return {
        intent,
        actions,
        message: `Pinned "${topic}" for later.`,
        data: pin,
      };
    }

    case "search": {
      const pack = await createEvidencePack(
        learner_id,
        sessionId,
        topic,
        "beginner",
      );

      actions.push({
        plugin: "search_ingestion.v1",
        function: "ingest.create_evidence_pack",
        result: pack,
      });

      return {
        intent,
        actions,
        message: `Found resources on "${topic}". Evidence pack created with ${pack.sources.length} sources.`,
        data: pack,
      };
    }

    default: {
      await logEvent({
        learnerId: learner_id,
        eventType: "unknown_intent",
        payload: { transcript },
      });

      return {
        intent: "unknown",
        actions: [],
        message: `I heard: "${transcript}". Try saying things like "teach me about..." or "quiz me on..." or "pin this for later".`,
      };
    }
  }
}
