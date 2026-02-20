import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import { setupVoiceGateway } from "./voice-gateway";
import {
  getOrCreateDefaultLearner,
  getLearner,
  updateLearner,
  getConcepts,
  getCourseBlueprints,
  getCourseRuns,
  updateCourseRun,
  getMasteryStates,
  getWeakPoints,
  getEvidenceArtifacts,
  getPortfolioItems,
  getPins,
  resolvePin,
  createPin,
  getEventLog,
  createEventLogEntry,
} from "./storage";
import { orchestrate } from "./orchestrator";
import { createQuiz, gradeQuiz } from "./plugins/quiz-engine";
import { generateGame, reportGameOutcome } from "./plugins/game-engine";

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/learner", async (_req: Request, res: Response) => {
    try {
      const learner = await getOrCreateDefaultLearner();
      res.json(learner);
    } catch (err) {
      res.status(500).json({ error: "Failed to get learner" });
    }
  });

  app.put("/api/learner/:id", async (req: Request, res: Response) => {
    try {
      const learner = await updateLearner(req.params.id, req.body);
      res.json(learner);
    } catch (err) {
      res.status(500).json({ error: "Failed to update learner" });
    }
  });

  app.get("/api/concepts", async (req: Request, res: Response) => {
    try {
      const domain = req.query.domain as string | undefined;
      const items = await getConcepts(domain);
      res.json(items);
    } catch (err) {
      res.status(500).json({ error: "Failed to get concepts" });
    }
  });

  app.get("/api/courses", async (req: Request, res: Response) => {
    try {
      const learnerId = req.query.learner_id as string;
      if (!learnerId) return res.status(400).json({ error: "learner_id required" });
      const blueprints = await getCourseBlueprints(learnerId);
      res.json(blueprints);
    } catch (err) {
      res.status(500).json({ error: "Failed to get courses" });
    }
  });

  app.get("/api/course-runs", async (req: Request, res: Response) => {
    try {
      const learnerId = req.query.learner_id as string;
      if (!learnerId) return res.status(400).json({ error: "learner_id required" });
      const runs = await getCourseRuns(learnerId);
      res.json(runs);
    } catch (err) {
      res.status(500).json({ error: "Failed to get course runs" });
    }
  });

  app.put("/api/course-runs/:id", async (req: Request, res: Response) => {
    try {
      const run = await updateCourseRun(req.params.id, req.body);
      res.json(run);
    } catch (err) {
      res.status(500).json({ error: "Failed to update course run" });
    }
  });

  app.get("/api/mastery", async (req: Request, res: Response) => {
    try {
      const learnerId = req.query.learner_id as string;
      if (!learnerId) return res.status(400).json({ error: "learner_id required" });
      const states = await getMasteryStates(learnerId);
      res.json(states);
    } catch (err) {
      res.status(500).json({ error: "Failed to get mastery" });
    }
  });

  app.get("/api/weak-points", async (req: Request, res: Response) => {
    try {
      const learnerId = req.query.learner_id as string;
      if (!learnerId) return res.status(400).json({ error: "learner_id required" });
      const wps = await getWeakPoints(learnerId);
      res.json(wps);
    } catch (err) {
      res.status(500).json({ error: "Failed to get weak points" });
    }
  });

  app.get("/api/evidence", async (req: Request, res: Response) => {
    try {
      const learnerId = req.query.learner_id as string;
      if (!learnerId) return res.status(400).json({ error: "learner_id required" });
      const artifacts = await getEvidenceArtifacts(learnerId);
      res.json(artifacts);
    } catch (err) {
      res.status(500).json({ error: "Failed to get evidence" });
    }
  });

  app.get("/api/portfolio", async (req: Request, res: Response) => {
    try {
      const learnerId = req.query.learner_id as string;
      if (!learnerId) return res.status(400).json({ error: "learner_id required" });
      const items = await getPortfolioItems(learnerId);
      res.json(items);
    } catch (err) {
      res.status(500).json({ error: "Failed to get portfolio" });
    }
  });

  app.get("/api/pins", async (req: Request, res: Response) => {
    try {
      const learnerId = req.query.learner_id as string;
      if (!learnerId) return res.status(400).json({ error: "learner_id required" });
      const items = await getPins(learnerId);
      res.json(items);
    } catch (err) {
      res.status(500).json({ error: "Failed to get pins" });
    }
  });

  app.post("/api/pins", async (req: Request, res: Response) => {
    try {
      const { learnerId, content, source } = req.body;
      if (!learnerId || !content)
        return res.status(400).json({ error: "learnerId and content required" });
      const pin = await createPin({ learnerId, content, source });
      res.json(pin);
    } catch (err) {
      res.status(500).json({ error: "Failed to create pin" });
    }
  });

  app.put("/api/pins/:id/resolve", async (req: Request, res: Response) => {
    try {
      const pin = await resolvePin(req.params.id);
      res.json(pin);
    } catch (err) {
      res.status(500).json({ error: "Failed to resolve pin" });
    }
  });

  app.post("/api/orchestrate", async (req: Request, res: Response) => {
    try {
      const { learner_id, transcript, policy_flags } = req.body;
      if (!learner_id || !transcript) {
        return res
          .status(400)
          .json({ error: "learner_id and transcript required" });
      }
      const result = await orchestrate({
        learner_id,
        transcript,
        policy_flags,
      });
      res.json(result);
    } catch (err) {
      console.error("Orchestrate error:", err);
      res.status(500).json({ error: "Orchestration failed" });
    }
  });

  app.post("/api/quiz/create", async (req: Request, res: Response) => {
    try {
      const { sessionId, learnerId, conceptIds, quizType, policy } = req.body;
      const quiz = await createQuiz(
        sessionId,
        learnerId,
        conceptIds || [],
        quizType,
        policy,
      );
      res.json(quiz);
    } catch (err) {
      res.status(500).json({ error: "Failed to create quiz" });
    }
  });

  app.post("/api/quiz/grade", async (req: Request, res: Response) => {
    try {
      const { sessionId, attemptId, learnerId, quizId, responses, questions } =
        req.body;
      const result = await gradeQuiz(
        sessionId,
        attemptId,
        learnerId,
        quizId,
        responses,
        questions,
      );
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: "Failed to grade quiz" });
    }
  });

  app.post("/api/game/generate", async (req: Request, res: Response) => {
    try {
      const { sessionId, learnerId, weakPointIds, vibe, templatesAllowed, policy } =
        req.body;
      const game = await generateGame(
        sessionId,
        learnerId,
        weakPointIds || [],
        vibe,
        templatesAllowed,
        policy,
      );
      res.json(game);
    } catch (err) {
      res.status(500).json({ error: "Failed to generate game" });
    }
  });

  app.post("/api/game/outcome", async (req: Request, res: Response) => {
    try {
      const { sessionId, gameRunId, learnerId, outcome, conceptIds } = req.body;
      const report = await reportGameOutcome(
        sessionId,
        gameRunId,
        learnerId,
        outcome,
        conceptIds || [],
      );
      res.json(report);
    } catch (err) {
      res.status(500).json({ error: "Failed to report game outcome" });
    }
  });

  app.post("/api/events/sync", async (req: Request, res: Response) => {
    try {
      const { eventType, payload, learnerId, originalTimestamp } = req.body;
      if (!eventType) return res.status(400).json({ error: "eventType required" });
      const entry = await createEventLogEntry({
        learnerId,
        eventType,
        payload: { ...payload, originalTimestamp, synced: true },
      });
      res.json(entry);
    } catch (err) {
      res.status(500).json({ error: "Failed to sync event" });
    }
  });

  app.get("/api/events", async (req: Request, res: Response) => {
    try {
      const learnerId = req.query.learner_id as string | undefined;
      const limit = parseInt(req.query.limit as string) || 50;
      const events = await getEventLog(learnerId, limit);
      res.json(events);
    } catch (err) {
      res.status(500).json({ error: "Failed to get events" });
    }
  });

  const httpServer = createServer(app);
  setupVoiceGateway(httpServer);

  return httpServer;
}
