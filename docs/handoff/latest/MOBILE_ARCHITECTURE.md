# MŪV Mobile Architecture

## Overview
MŪV (Me Uni-Versity) is a personal adaptive learning platform with voice-first interaction. The mobile client is built with Expo/React Native and communicates with an Express backend via REST API and WebSocket.

## Stack
- **Frontend**: Expo SDK 54, React Native, TypeScript, Expo Router (file-based routing)
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL (Neon-backed via Replit)
- **ORM**: Drizzle ORM
- **State**: React Context (MuvProvider) + React Query for server state
- **Voice**: WebSocket gateway at `/ws/voice`

## Frontend Architecture

### Navigation (Expo Router)
```
app/
  _layout.tsx              # Root layout: providers, fonts
  (tabs)/
    _layout.tsx            # Tab navigation (5 tabs)
    index.tsx              # Dashboard tab
    speak.tsx              # Speak/Voice tab
    learn.tsx              # Learn tab
    evidence.tsx           # Evidence tab
    profile.tsx            # Profile tab
```

### State Management
- `MuvProvider` (lib/muv-context.tsx): Central context holding learner state, mastery, weak points, pins, evidence, courses
- `AssistantProvider` (lib/assistant-context.tsx): Manages animated assistant state across the app
- All data fetched from backend API on mount and refreshed on actions
- No local-first SQLite in prototype; direct API calls

### AssistantProvider & AssistantContext
Source: `lib/assistant-context.tsx`

The `AssistantProvider` wraps the app at the root layout level and exposes the `useAssistant()` hook. It manages:
- `state: AssistantState` — one of `idle`, `listening`, `thinking`, `speaking`, `celebrate`, `pin_ack`
- `isExpanded: boolean` — controls whether the floating `AssistantBubble` shows its expanded message view
- `lastMessage: string` — the text displayed in the expanded bubble

Key methods:
- `setState(state)` — directly set the assistant animation state
- `triggerCelebrate()` — sets state to `celebrate`, auto-resets to `idle` after 2500ms
- `triggerPinAck()` — sets state to `pin_ack`, auto-resets to `idle` after 1500ms
- `setLastMessage(msg)` — update the bubble message text
- `setExpanded(bool)` — toggle bubble expansion

The `LargeAssistant` component (80px) renders on the Speak tab. The `AssistantBubble` component floats on all other tabs (see `RIVE_ASSISTANT.md` for full animation docs).

### Offline Event Queue
Source: `lib/offline-queue.ts`

Provides resilient event delivery when the device is offline or the backend is unreachable:

- **Enqueue**: `enqueueEvent({ eventType, payload, learnerId })` — persists event to AsyncStorage under `@muv_offline_queue`
- **Auto-sync**: Each enqueue triggers an immediate sync attempt; a periodic timer (`startPeriodicSync()`) retries every 30 seconds
- **Sync logic**: Checks connectivity by sending `HEAD /api/learner`; if online, POSTs each queued event to `POST /api/events/sync` with original timestamp
- **Retry policy**: Events retry up to 3 times before being dropped
- **Queue management**: `getQueue()`, `getQueueSize()`, `clearQueue()` for inspection
- **Lifecycle**: Call `startPeriodicSync()` on app mount, `stopPeriodicSync()` on unmount

### VoiceCapture Abstraction
Source: `lib/voice-capture.ts`

Platform-agnostic voice input class supporting two modes:
- **`record_transcribe`** (default): Records audio via `expo-av`, uploads to `POST /api/transcribe`, returns transcript
- **`realtime_stream`** (upgrade path): Streams audio frames over WebSocket to voice gateway for live transcription

The `VoiceCapture` class handles permission requests, recording lifecycle, duration tracking, and error recovery. See `VOICE_PIPELINE.md` for full API documentation and protocol details.

### Design System
- Colors: constants/colors.ts (light/dark themes)
- Font: Inter (Google Fonts via @expo-google-fonts/inter)
- Icons: @expo/vector-icons (Ionicons)
- Tab bar: NativeTabs with liquid glass on iOS 26+, BlurView fallback

## Backend Architecture

### API Layer (server/routes.ts)
All routes prefixed with `/api`:
- `GET /api/learner` - Get or create default learner
- `PUT /api/learner/:id` - Update learner
- `GET /api/concepts` - List concepts
- `GET /api/courses` - List course blueprints
- `GET /api/course-runs` - List course runs
- `GET /api/mastery` - Get mastery states
- `GET /api/weak-points` - Get weak points
- `GET /api/evidence` - Get evidence artifacts
- `GET /api/pins` - Get pins
- `POST /api/pins` - Create pin
- `PUT /api/pins/:id/resolve` - Resolve pin
- `POST /api/orchestrate` - Main voice/text orchestration endpoint
- `POST /api/quiz/create` - Create quiz
- `POST /api/quiz/grade` - Grade quiz
- `POST /api/game/generate` - Generate game
- `POST /api/game/outcome` - Report game outcome
- `GET /api/events` - Get event log

### WebSocket (server/voice-gateway.ts)
- Path: `/ws/voice`
- Protocol: JSON messages over WebSocket
- Modes: transcription (Option B), conversation (Option C, future)

### Service Layer
- `server/storage.ts` - Database access (Drizzle ORM)
- `server/kernel.ts` - Mastery acceptance rules, weak point detection, evidence recording
- `server/orchestrator.ts` - Intent parsing, plugin dispatch
- `server/plugins/` - Plugin implementations

## Data Flow
1. User speaks or types command → Speak tab
2. Text sent to `POST /api/orchestrate`
3. Orchestrator parses intent (deterministic, replaceable by AI)
4. Orchestrator dispatches to appropriate plugin(s)
5. Plugin creates evidence artifacts, proposes mastery deltas
6. Kernel accepts/rejects mastery changes
7. Response returned to client
8. Client refreshes all state
