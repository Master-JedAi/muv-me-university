import { drizzle } from "drizzle-orm/node-postgres";
import { eq, and, desc, isNull } from "drizzle-orm";
import {
  learners,
  concepts,
  courseBlueprints,
  courseRuns,
  masteryStates,
  weakPoints,
  evidenceArtifacts,
  portfolioItems,
  pins,
  eventLog,
  type Learner,
  type InsertLearner,
  type Concept,
  type CourseBlueprint,
  type CourseRun,
  type MasteryState,
  type WeakPoint,
  type EvidenceArtifact,
  type PortfolioItem,
  type Pin,
  type EventLogEntry,
} from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

export const db = drizzle(process.env.DATABASE_URL);

export async function getOrCreateDefaultLearner(): Promise<Learner> {
  const existing = await db.select().from(learners).limit(1);
  if (existing.length > 0) return existing[0];
  const [created] = await db
    .insert(learners)
    .values({ displayName: "Learner" })
    .returning();
  return created;
}

export async function getLearner(id: string): Promise<Learner | undefined> {
  const [learner] = await db.select().from(learners).where(eq(learners.id, id));
  return learner;
}

export async function updateLearner(
  id: string,
  data: Partial<Pick<Learner, "displayName" | "preferences">>,
): Promise<Learner> {
  const [updated] = await db
    .update(learners)
    .set(data)
    .where(eq(learners.id, id))
    .returning();
  return updated;
}

export async function createConcept(data: {
  label: string;
  domain: string;
  description?: string;
}): Promise<Concept> {
  const [c] = await db.insert(concepts).values(data).returning();
  return c;
}

export async function getConcepts(domain?: string): Promise<Concept[]> {
  if (domain) {
    return db.select().from(concepts).where(eq(concepts.domain, domain));
  }
  return db.select().from(concepts);
}

export async function createCourseBlueprint(data: {
  title: string;
  description?: string;
  conceptIds?: string[];
  learnerId: string;
}): Promise<CourseBlueprint> {
  const [bp] = await db
    .insert(courseBlueprints)
    .values({
      title: data.title,
      description: data.description || null,
      conceptIds: data.conceptIds || [],
      learnerId: data.learnerId,
    })
    .returning();
  return bp;
}

export async function getCourseBlueprints(
  learnerId: string,
): Promise<CourseBlueprint[]> {
  return db
    .select()
    .from(courseBlueprints)
    .where(eq(courseBlueprints.learnerId, learnerId))
    .orderBy(desc(courseBlueprints.createdAt));
}

export async function createCourseRun(data: {
  blueprintId: string;
  learnerId: string;
}): Promise<CourseRun> {
  const [run] = await db.insert(courseRuns).values(data).returning();
  return run;
}

export async function getCourseRuns(learnerId: string): Promise<CourseRun[]> {
  return db
    .select()
    .from(courseRuns)
    .where(eq(courseRuns.learnerId, learnerId))
    .orderBy(desc(courseRuns.startedAt));
}

export async function updateCourseRun(
  id: string,
  data: Partial<Pick<CourseRun, "status" | "progress" | "completedAt">>,
): Promise<CourseRun> {
  const [updated] = await db
    .update(courseRuns)
    .set(data)
    .where(eq(courseRuns.id, id))
    .returning();
  return updated;
}

export async function getMasteryStates(
  learnerId: string,
): Promise<MasteryState[]> {
  return db
    .select()
    .from(masteryStates)
    .where(eq(masteryStates.learnerId, learnerId));
}

export async function getMasteryState(
  learnerId: string,
  conceptId: string,
): Promise<MasteryState | undefined> {
  const [ms] = await db
    .select()
    .from(masteryStates)
    .where(
      and(
        eq(masteryStates.learnerId, learnerId),
        eq(masteryStates.conceptId, conceptId),
      ),
    );
  return ms;
}

export async function upsertMasteryState(data: {
  learnerId: string;
  conceptId: string;
  score: number;
  stability: number;
}): Promise<MasteryState> {
  const existing = await getMasteryState(data.learnerId, data.conceptId);
  if (existing) {
    const [updated] = await db
      .update(masteryStates)
      .set({
        score: data.score,
        stability: data.stability,
        lastDemonstratedAt: new Date(),
      })
      .where(eq(masteryStates.id, existing.id))
      .returning();
    return updated;
  }
  const [created] = await db
    .insert(masteryStates)
    .values({
      ...data,
      lastDemonstratedAt: new Date(),
    })
    .returning();
  return created;
}

export async function getWeakPoints(learnerId: string): Promise<WeakPoint[]> {
  return db
    .select()
    .from(weakPoints)
    .where(
      and(
        eq(weakPoints.learnerId, learnerId),
        isNull(weakPoints.resolvedAt),
      ),
    )
    .orderBy(desc(weakPoints.severity));
}

export async function createWeakPoint(data: {
  learnerId: string;
  conceptId: string;
  wpType: string;
  severity: number;
  signals?: Record<string, unknown>[];
  evidenceRefs?: string[];
}): Promise<WeakPoint> {
  const [wp] = await db
    .insert(weakPoints)
    .values({
      learnerId: data.learnerId,
      conceptId: data.conceptId,
      wpType: data.wpType,
      severity: data.severity,
      signals: data.signals || [],
      evidenceRefs: data.evidenceRefs || [],
    })
    .returning();
  return wp;
}

export async function createEvidenceArtifact(data: {
  learnerId: string;
  sessionId: string;
  artifactType: string;
  hash?: string;
  tags?: string[];
  metrics?: Record<string, unknown>;
  payload?: Record<string, unknown>;
}): Promise<EvidenceArtifact> {
  const [ea] = await db
    .insert(evidenceArtifacts)
    .values({
      learnerId: data.learnerId,
      sessionId: data.sessionId,
      artifactType: data.artifactType,
      hash: data.hash || null,
      tags: data.tags || [],
      metrics: data.metrics || {},
      payload: data.payload || {},
    })
    .returning();
  return ea;
}

export async function getEvidenceArtifacts(
  learnerId: string,
): Promise<EvidenceArtifact[]> {
  return db
    .select()
    .from(evidenceArtifacts)
    .where(eq(evidenceArtifacts.learnerId, learnerId))
    .orderBy(desc(evidenceArtifacts.createdAt));
}

export async function createPortfolioItem(data: {
  learnerId: string;
  title: string;
  description?: string;
  artifactIds?: string[];
}): Promise<PortfolioItem> {
  const [pi] = await db
    .insert(portfolioItems)
    .values({
      learnerId: data.learnerId,
      title: data.title,
      description: data.description || null,
      artifactIds: data.artifactIds || [],
    })
    .returning();
  return pi;
}

export async function getPortfolioItems(
  learnerId: string,
): Promise<PortfolioItem[]> {
  return db
    .select()
    .from(portfolioItems)
    .where(eq(portfolioItems.learnerId, learnerId))
    .orderBy(desc(portfolioItems.createdAt));
}

export async function createPin(data: {
  learnerId: string;
  content: string;
  source?: string;
}): Promise<Pin> {
  const [pin] = await db
    .insert(pins)
    .values({
      learnerId: data.learnerId,
      content: data.content,
      source: data.source || "voice",
    })
    .returning();
  return pin;
}

export async function getPins(learnerId: string): Promise<Pin[]> {
  return db
    .select()
    .from(pins)
    .where(and(eq(pins.learnerId, learnerId), eq(pins.resolved, false)))
    .orderBy(desc(pins.createdAt));
}

export async function resolvePin(id: string): Promise<Pin> {
  const [updated] = await db
    .update(pins)
    .set({ resolved: true })
    .where(eq(pins.id, id))
    .returning();
  return updated;
}

export async function logEvent(data: {
  learnerId?: string;
  eventType: string;
  payload?: Record<string, unknown>;
}): Promise<EventLogEntry> {
  const [entry] = await db
    .insert(eventLog)
    .values({
      learnerId: data.learnerId || null,
      eventType: data.eventType,
      payload: data.payload || {},
    })
    .returning();
  return entry;
}

export async function getEventLog(
  learnerId?: string,
  limit = 50,
): Promise<EventLogEntry[]> {
  if (learnerId) {
    return db
      .select()
      .from(eventLog)
      .where(eq(eventLog.learnerId, learnerId))
      .orderBy(desc(eventLog.timestamp))
      .limit(limit);
  }
  return db
    .select()
    .from(eventLog)
    .orderBy(desc(eventLog.timestamp))
    .limit(limit);
}

export async function createEventLogEntry(data: {
  learnerId?: string;
  eventType: string;
  payload?: Record<string, unknown>;
}): Promise<EventLogEntry> {
  const [entry] = await db
    .insert(eventLog)
    .values({
      learnerId: data.learnerId || null,
      eventType: data.eventType,
      payload: data.payload || {},
    })
    .returning();
  return entry;
}
