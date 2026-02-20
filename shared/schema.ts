import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  integer,
  real,
  timestamp,
  jsonb,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const learners = pgTable("learners", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  displayName: text("display_name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  preferences: jsonb("preferences").$type<Record<string, unknown>>().default({}),
});

export const concepts = pgTable("concepts", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  label: text("label").notNull(),
  domain: text("domain").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const learningGraphEdges = pgTable("learning_graph_edges", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  fromConceptId: varchar("from_concept_id").notNull(),
  toConceptId: varchar("to_concept_id").notNull(),
  edgeType: text("edge_type").notNull().default("prerequisite"),
});

export const courseBlueprints = pgTable("course_blueprints", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  conceptIds: jsonb("concept_ids").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  learnerId: varchar("learner_id").notNull(),
});

export const courseRuns = pgTable("course_runs", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  blueprintId: varchar("blueprint_id").notNull(),
  learnerId: varchar("learner_id").notNull(),
  status: text("status").notNull().default("active"),
  progress: real("progress").notNull().default(0),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const masteryStates = pgTable("mastery_states", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  learnerId: varchar("learner_id").notNull(),
  conceptId: varchar("concept_id").notNull(),
  score: real("score").notNull().default(0),
  stability: real("stability").notNull().default(0),
  lastDemonstratedAt: timestamp("last_demonstrated_at"),
});

export const weakPoints = pgTable("weak_points", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  learnerId: varchar("learner_id").notNull(),
  conceptId: varchar("concept_id").notNull(),
  wpType: text("wp_type").notNull(),
  severity: real("severity").notNull().default(0.5),
  signals: jsonb("signals").$type<Record<string, unknown>[]>().default([]),
  evidenceRefs: jsonb("evidence_refs").$type<string[]>().default([]),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const evidenceArtifacts = pgTable("evidence_artifacts", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  learnerId: varchar("learner_id").notNull(),
  sessionId: varchar("session_id").notNull(),
  artifactType: text("artifact_type").notNull(),
  hash: text("hash"),
  integrity: text("integrity").notNull().default("prototype"),
  tags: jsonb("tags").$type<string[]>().default([]),
  metrics: jsonb("metrics").$type<Record<string, unknown>>().default({}),
  payload: jsonb("payload").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const portfolioItems = pgTable("portfolio_items", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  learnerId: varchar("learner_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  artifactIds: jsonb("artifact_ids").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const pins = pgTable("pins", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  learnerId: varchar("learner_id").notNull(),
  content: text("content").notNull(),
  source: text("source").notNull().default("voice"),
  resolved: boolean("resolved").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const eventLog = pgTable("event_log", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  learnerId: varchar("learner_id"),
  eventType: text("event_type").notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().default({}),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const insertLearnerSchema = createInsertSchema(learners).pick({
  displayName: true,
  preferences: true,
});
export const insertConceptSchema = createInsertSchema(concepts).pick({
  label: true,
  domain: true,
  description: true,
});
export const insertCourseBlueprintSchema = createInsertSchema(courseBlueprints).pick({
  title: true,
  description: true,
  conceptIds: true,
  learnerId: true,
});
export const insertPinSchema = createInsertSchema(pins).pick({
  learnerId: true,
  content: true,
  source: true,
});

export type Learner = typeof learners.$inferSelect;
export type InsertLearner = z.infer<typeof insertLearnerSchema>;
export type Concept = typeof concepts.$inferSelect;
export type CourseBlueprint = typeof courseBlueprints.$inferSelect;
export type CourseRun = typeof courseRuns.$inferSelect;
export type MasteryState = typeof masteryStates.$inferSelect;
export type WeakPoint = typeof weakPoints.$inferSelect;
export type EvidenceArtifact = typeof evidenceArtifacts.$inferSelect;
export type PortfolioItem = typeof portfolioItems.$inferSelect;
export type Pin = typeof pins.$inferSelect;
export type EventLogEntry = typeof eventLog.$inferSelect;
