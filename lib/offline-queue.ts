import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { getApiUrl } from "@/lib/query-client";

const QUEUE_KEY = "@muv_offline_queue";
const SYNC_INTERVAL_MS = 30000;

export interface QueuedEvent {
  id: string;
  eventType: string;
  payload: Record<string, unknown>;
  learnerId?: string;
  timestamp: string;
  retries: number;
}

let syncTimer: ReturnType<typeof setInterval> | null = null;
let isSyncing = false;

export async function enqueueEvent(event: Omit<QueuedEvent, "id" | "timestamp" | "retries">): Promise<void> {
  const queuedEvent: QueuedEvent = {
    ...event,
    id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    retries: 0,
  };

  const queue = await getQueue();
  queue.push(queuedEvent);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));

  attemptSync();
}

export async function getQueue(): Promise<QueuedEvent[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function getQueueSize(): Promise<number> {
  const queue = await getQueue();
  return queue.length;
}

export async function clearQueue(): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify([]));
}

async function isOnline(): Promise<boolean> {
  if (Platform.OS === "web") {
    return typeof navigator !== "undefined" ? navigator.onLine : true;
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${getApiUrl()}/api/learner`, {
      method: "HEAD",
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}

export async function attemptSync(): Promise<{ synced: number; failed: number }> {
  if (isSyncing) return { synced: 0, failed: 0 };
  isSyncing = true;

  let synced = 0;
  let failed = 0;

  try {
    const online = await isOnline();
    if (!online) {
      isSyncing = false;
      return { synced: 0, failed: 0 };
    }

    const queue = await getQueue();
    if (queue.length === 0) {
      isSyncing = false;
      return { synced: 0, failed: 0 };
    }

    const remaining: QueuedEvent[] = [];
    const apiUrl = getApiUrl();

    for (const event of queue) {
      try {
        const response = await fetch(`${apiUrl}/api/events/sync`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventType: event.eventType,
            payload: event.payload,
            learnerId: event.learnerId,
            originalTimestamp: event.timestamp,
          }),
        });

        if (response.ok) {
          synced++;
        } else if (event.retries < 3) {
          remaining.push({ ...event, retries: event.retries + 1 });
          failed++;
        }
      } catch {
        if (event.retries < 3) {
          remaining.push({ ...event, retries: event.retries + 1 });
        }
        failed++;
      }
    }

    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
  } catch {
    failed++;
  }

  isSyncing = false;
  return { synced, failed };
}

export function startPeriodicSync(): void {
  if (syncTimer) return;
  syncTimer = setInterval(() => {
    attemptSync();
  }, SYNC_INTERVAL_MS);
  attemptSync();
}

export function stopPeriodicSync(): void {
  if (syncTimer) {
    clearInterval(syncTimer);
    syncTimer = null;
  }
}
