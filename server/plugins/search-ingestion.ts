import { randomUUID } from "crypto";
import { recordEvidence } from "../kernel";

export interface EvidencePack {
  evidencePackId: string;
  topic: string;
  audienceLevel: string;
  sources: SourceEntry[];
  version: number;
  artifactId: string;
}

interface SourceEntry {
  id: string;
  title: string;
  url: string;
  snippet: string;
  reliability: number;
}

export async function createEvidencePack(
  learnerId: string,
  sessionId: string,
  topic: string,
  audienceLevel: string = "beginner",
  _sourcePolicy: Record<string, unknown> = {},
): Promise<EvidencePack> {
  const evidencePackId = randomUUID();

  const sources: SourceEntry[] = [
    {
      id: randomUUID(),
      title: `Introduction to ${topic}`,
      url: `https://learn.example.com/${topic.toLowerCase().replace(/\s+/g, "-")}`,
      snippet: `A comprehensive introduction to ${topic} covering fundamental concepts and practical applications.`,
      reliability: 0.85,
    },
    {
      id: randomUUID(),
      title: `${topic}: Key Concepts`,
      url: `https://docs.example.com/${topic.toLowerCase().replace(/\s+/g, "-")}/concepts`,
      snippet: `Core concepts and frameworks for understanding ${topic} at the ${audienceLevel} level.`,
      reliability: 0.9,
    },
    {
      id: randomUUID(),
      title: `Practice Exercises for ${topic}`,
      url: `https://practice.example.com/${topic.toLowerCase().replace(/\s+/g, "-")}`,
      snippet: `Hands-on exercises and problems to reinforce understanding of ${topic}.`,
      reliability: 0.8,
    },
  ];

  const artifact = await recordEvidence({
    learnerId,
    sessionId,
    artifactType: "evidence_pack",
    payload: {
      evidencePackId,
      topic,
      audienceLevel,
      sources,
      version: 1,
    },
    tags: ["search", "ingestion", `topic:${topic}`],
    metrics: { sourceCount: sources.length, avgReliability: 0.85 },
  });

  return {
    evidencePackId,
    topic,
    audienceLevel,
    sources,
    version: 1,
    artifactId: artifact.id,
  };
}

export async function updateEvidencePack(
  learnerId: string,
  sessionId: string,
  evidencePackId: string,
  _sourcePolicy: Record<string, unknown> = {},
): Promise<EvidencePack> {
  const newSource: SourceEntry = {
    id: randomUUID(),
    title: "Updated resource",
    url: "https://learn.example.com/updated",
    snippet: "Newly discovered resource with updated information.",
    reliability: 0.75,
  };

  const artifact = await recordEvidence({
    learnerId,
    sessionId,
    artifactType: "evidence_pack_update",
    payload: {
      evidencePackId,
      newSources: [newSource],
      version: 2,
    },
    tags: ["search", "ingestion", "update"],
    metrics: { sourceCount: 1 },
  });

  return {
    evidencePackId,
    topic: "Updated",
    audienceLevel: "intermediate",
    sources: [newSource],
    version: 2,
    artifactId: artifact.id,
  };
}
