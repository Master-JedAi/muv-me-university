# MŪV Voice Pipeline

## Architecture

```
┌─────────────┐     WebSocket      ┌─────────────────┐    Realtime API    ┌──────────┐
│  Expo App   │ ◄──────────────► │  Voice Gateway  │ ◄────────────────► │  OpenAI  │
│  (Client)   │   JSON frames     │  (Backend)      │   Transcription    │  API     │
└─────────────┘                    └─────────────────┘                     └──────────┘
```

## Option B: Transcription (Current)

### Client → Server Messages

#### `start_session`
```json
{
  "type": "start_session",
  "learnerId": "uuid"
}
```

#### `audio_frame`
```json
{
  "type": "audio_frame",
  "audioData": "base64-encoded-audio"
}
```

#### `end_session`
```json
{
  "type": "end_session"
}
```

#### `send_transcript`
Used for text-based input (bypassing audio):
```json
{
  "type": "send_transcript",
  "audioData": "text string"
}
```

### Server → Client Messages

#### `session_started`
```json
{
  "type": "session_started",
  "mode": "transcription",
  "message": "Voice session started..."
}
```

#### `transcript_delta`
```json
{
  "type": "transcript_delta",
  "text": "partial word or phrase",
  "isFinal": false
}
```

#### `transcript_final`
```json
{
  "type": "transcript_final",
  "text": "complete transcript",
  "isFinal": true
}
```

### Current Implementation (Prototype)
- WebSocket server at `/ws/voice`
- In prototype mode: simulated transcription (echoes random words)
- When OpenAI API key is configured: connects to OpenAI Realtime API transcription sessions
- API key stays on server only

### OpenAI Realtime Integration (Production)
To enable real transcription:
1. Set `OPENAI_API_KEY` environment variable on backend
2. Voice gateway connects to `wss://api.openai.com/v1/realtime`
3. Uses transcription session type (not conversation)
4. Relays transcript deltas to mobile client

## Option C: Realtime Conversations (Future)

### Upgrade Path
The voice_capture module supports two modes:
- **Mode B**: Transcription streaming (current)
- **Mode C**: Realtime conversations / voice agent (future)

### Key Design Decisions for B→C Migration
1. **Kernel contracts unchanged**: Plugins and mastery rules are mode-agnostic
2. **Orchestrator becomes AI-driven**: Replace deterministic intent parser with OpenAI Responses API tool-calling
3. **Voice gateway adds conversation mode**: New session type alongside transcription
4. **Client UI adapts**: Speak tab gains conversation view alongside transcript view

### Migration Steps
1. Add `OPENAI_API_KEY` to backend environment
2. Extend voice gateway to support `session_type: "conversation"`
3. Add tool definitions matching plugin contracts
4. Replace orchestrator's `parseIntent()` with AI tool dispatch
5. Add streaming conversation UI to Speak tab
6. Keep transcript mode as fallback

## VoiceCapture Abstraction Layer

### Source
`lib/voice-capture.ts`

### Purpose
Platform-agnostic voice input abstraction that hides recording, permissions, and transcription behind a single class. Designed to support both the current prototype mode and future realtime streaming.

### Modes

#### `record_transcribe` (Current — Default)
1. Requests microphone permission via `expo-av` (`Audio.requestPermissionsAsync()`)
2. Creates a high-quality recording (`Audio.Recording.createAsync`)
3. On stop: uploads the audio file to `POST /api/transcribe` as `multipart/form-data`
4. Returns the transcript string in `VoiceCaptureResult`

Flow:
```
User taps record → requestPermission() → Audio.Recording.createAsync()
  → recording... (status: "recording") → user taps stop
  → stopAndUnloadAsync() → upload to /api/transcribe (status: "uploading" → "transcribing")
  → return { transcript, durationMs, mode, uri }
```

#### `realtime_stream` (Upgrade Path)
1. Same permission flow as `record_transcribe`
2. Opens a WebSocket connection to the voice gateway
3. Streams PCM/Opus audio frames to the server in real time
4. Receives `transcript_delta` and `transcript_final` messages via `onTranscript` callback
5. Currently a stub: falls back to `startRecording()` with a placeholder transcript

### Class API

```typescript
class VoiceCapture {
  constructor(config: VoiceCaptureConfig)
  getStatus(): VoiceCaptureStatus
  getDuration(): number                     // Current recording duration in seconds
  requestPermission(): Promise<boolean>
  checkPermission(): Promise<boolean>
  start(): Promise<boolean>                 // Starts recording or streaming based on mode
  stop(): Promise<VoiceCaptureResult | null>
  cancel(): Promise<void>                   // Stops without returning result
  destroy(): void                           // Cleanup
}
```

### Types

```typescript
type VoiceCaptureMode = "record_transcribe" | "realtime_stream";

type VoiceCaptureStatus =
  | "idle"
  | "requesting_permission"
  | "permission_denied"
  | "recording"
  | "uploading"
  | "transcribing"
  | "streaming"
  | "error";

interface VoiceCaptureConfig {
  mode: VoiceCaptureMode;
  onTranscript?: (text: string, isFinal: boolean) => void;
  onError?: (error: Error) => void;
  onStatusChange?: (status: VoiceCaptureStatus) => void;
  backendUrl?: string;
}

interface VoiceCaptureResult {
  transcript: string;
  durationMs: number;
  mode: VoiceCaptureMode;
  uri?: string;
}
```

### Factory Function
```typescript
createVoiceCapture(config?: Partial<VoiceCaptureConfig>): VoiceCapture
```
Creates a VoiceCapture instance with `record_transcribe` as the default mode.

### Permission Handling Flow
1. On `start()`, calls `checkPermission()` (non-intrusive check via `Audio.getPermissionsAsync()`)
2. If not granted, calls `requestPermission()` which triggers the OS permission dialog
3. Status transitions: `idle` → `requesting_permission` → `idle` (granted) or `permission_denied` (denied)
4. If permission denied, `start()` returns `false` — caller should show a settings prompt
5. On subsequent calls, permission is cached by the OS; `checkPermission()` returns instantly

### Integration with Speak Tab
The Speak tab (`app/(tabs)/speak.tsx`) uses `VoiceCapture` as follows:
1. Creates a `VoiceCapture` instance with `mode: "record_transcribe"` and a backend URL from `getApiUrl()`
2. Binds `onStatusChange` to update the `AssistantContext` state (e.g., recording → `listening`, uploading → `thinking`)
3. On record button press: calls `voiceCapture.start()`
4. On stop button press: calls `voiceCapture.stop()`, sends the transcript to `POST /api/orchestrate`
5. On response: sets assistant state to `speaking`, displays the response, then returns to `idle`
