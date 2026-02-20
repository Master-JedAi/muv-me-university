import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  ReactNode,
} from "react";
import { apiRequest, getApiUrl } from "@/lib/query-client";

interface Learner {
  id: string;
  displayName: string;
  createdAt: string;
  preferences: Record<string, unknown>;
}

interface MasteryState {
  id: string;
  learnerId: string;
  conceptId: string;
  score: number;
  stability: number;
  lastDemonstratedAt: string | null;
}

interface WeakPoint {
  id: string;
  learnerId: string;
  conceptId: string;
  wpType: string;
  severity: number;
  signals: Record<string, unknown>[];
  evidenceRefs: string[];
  resolvedAt: string | null;
  createdAt: string;
}

interface Pin {
  id: string;
  learnerId: string;
  content: string;
  source: string;
  resolved: boolean;
  createdAt: string;
}

interface EvidenceArtifact {
  id: string;
  learnerId: string;
  sessionId: string;
  artifactType: string;
  hash: string | null;
  integrity: string;
  tags: string[];
  metrics: Record<string, unknown>;
  payload: Record<string, unknown>;
  createdAt: string;
}

interface CourseBlueprint {
  id: string;
  title: string;
  description: string | null;
  conceptIds: string[];
  learnerId: string;
  createdAt: string;
}

interface CourseRun {
  id: string;
  blueprintId: string;
  learnerId: string;
  status: string;
  progress: number;
  startedAt: string;
  completedAt: string | null;
}

interface OrchestrateResult {
  intent: string;
  actions: { plugin: string; function: string; result: unknown }[];
  message: string;
  data?: unknown;
}

interface MuvContextValue {
  learner: Learner | null;
  isLoading: boolean;
  mastery: MasteryState[];
  weakPoints: WeakPoint[];
  pins: Pin[];
  evidence: EvidenceArtifact[];
  courses: CourseBlueprint[];
  courseRuns: CourseRun[];
  refreshAll: () => Promise<void>;
  refreshMastery: () => Promise<void>;
  refreshWeakPoints: () => Promise<void>;
  refreshPins: () => Promise<void>;
  refreshEvidence: () => Promise<void>;
  refreshCourses: () => Promise<void>;
  orchestrate: (transcript: string) => Promise<OrchestrateResult>;
  createPin: (content: string, source?: string) => Promise<Pin>;
  resolvePin: (pinId: string) => Promise<void>;
}

const MuvContext = createContext<MuvContextValue | null>(null);

export function MuvProvider({ children }: { children: ReactNode }) {
  const [learner, setLearner] = useState<Learner | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mastery, setMastery] = useState<MasteryState[]>([]);
  const [weakPoints, setWeakPoints] = useState<WeakPoint[]>([]);
  const [pins, setPins] = useState<Pin[]>([]);
  const [evidence, setEvidence] = useState<EvidenceArtifact[]>([]);
  const [courses, setCourses] = useState<CourseBlueprint[]>([]);
  const [courseRuns, setCourseRuns] = useState<CourseRun[]>([]);

  const fetchLearner = async () => {
    try {
      const res = await apiRequest("GET", "/api/learner");
      const data = await res.json();
      setLearner(data);
      return data as Learner;
    } catch (err) {
      console.error("Failed to fetch learner:", err);
      return null;
    }
  };

  const refreshMastery = async () => {
    if (!learner) return;
    try {
      const res = await apiRequest("GET", `/api/mastery?learner_id=${learner.id}`);
      setMastery(await res.json());
    } catch (err) {
      console.error("Failed to fetch mastery:", err);
    }
  };

  const refreshWeakPoints = async () => {
    if (!learner) return;
    try {
      const res = await apiRequest(
        "GET",
        `/api/weak-points?learner_id=${learner.id}`,
      );
      setWeakPoints(await res.json());
    } catch (err) {
      console.error("Failed to fetch weak points:", err);
    }
  };

  const refreshPins = async () => {
    if (!learner) return;
    try {
      const res = await apiRequest("GET", `/api/pins?learner_id=${learner.id}`);
      setPins(await res.json());
    } catch (err) {
      console.error("Failed to fetch pins:", err);
    }
  };

  const refreshEvidence = async () => {
    if (!learner) return;
    try {
      const res = await apiRequest(
        "GET",
        `/api/evidence?learner_id=${learner.id}`,
      );
      setEvidence(await res.json());
    } catch (err) {
      console.error("Failed to fetch evidence:", err);
    }
  };

  const refreshCourses = async () => {
    if (!learner) return;
    try {
      const res = await apiRequest(
        "GET",
        `/api/courses?learner_id=${learner.id}`,
      );
      setCourses(await res.json());
      const runsRes = await apiRequest(
        "GET",
        `/api/course-runs?learner_id=${learner.id}`,
      );
      setCourseRuns(await runsRes.json());
    } catch (err) {
      console.error("Failed to fetch courses:", err);
    }
  };

  const refreshAll = async () => {
    const l = learner || (await fetchLearner());
    if (!l) return;
    await Promise.all([
      refreshMastery(),
      refreshWeakPoints(),
      refreshPins(),
      refreshEvidence(),
      refreshCourses(),
    ]);
  };

  const doOrchestrate = async (
    transcript: string,
  ): Promise<OrchestrateResult> => {
    if (!learner) throw new Error("No learner");
    const res = await apiRequest("POST", "/api/orchestrate", {
      learner_id: learner.id,
      transcript,
    });
    const result = (await res.json()) as OrchestrateResult;
    await refreshAll();
    return result;
  };

  const doCreatePin = async (
    content: string,
    source = "manual",
  ): Promise<Pin> => {
    if (!learner) throw new Error("No learner");
    const res = await apiRequest("POST", "/api/pins", {
      learnerId: learner.id,
      content,
      source,
    });
    const pin = (await res.json()) as Pin;
    await refreshPins();
    return pin;
  };

  const doResolvePin = async (pinId: string): Promise<void> => {
    await apiRequest("PUT", `/api/pins/${pinId}/resolve`);
    await refreshPins();
  };

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      const l = await fetchLearner();
      if (l) {
        setLearner(l);
      }
      setIsLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (learner) {
      refreshAll();
    }
  }, [learner?.id]);

  const value = useMemo(
    () => ({
      learner,
      isLoading,
      mastery,
      weakPoints,
      pins,
      evidence,
      courses,
      courseRuns,
      refreshAll,
      refreshMastery,
      refreshWeakPoints,
      refreshPins,
      refreshEvidence,
      refreshCourses,
      orchestrate: doOrchestrate,
      createPin: doCreatePin,
      resolvePin: doResolvePin,
    }),
    [learner, isLoading, mastery, weakPoints, pins, evidence, courses, courseRuns],
  );

  return <MuvContext.Provider value={value}>{children}</MuvContext.Provider>;
}

export function useMuv() {
  const ctx = useContext(MuvContext);
  if (!ctx) throw new Error("useMuv must be used within MuvProvider");
  return ctx;
}
