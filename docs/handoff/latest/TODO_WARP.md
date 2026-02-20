# MŪV Productionization Checklist (TODO WARP)

## Critical Path

### Authentication & Multi-User
- [ ] Implement user registration/login
- [ ] Add JWT or session-based authentication
- [ ] Scope all API endpoints to authenticated user
- [ ] Add RBAC for admin vs learner roles

### Voice Pipeline (Option B → Production)
- [ ] Integrate OpenAI Realtime API for real transcription
- [ ] Add audio compression (Opus) for bandwidth optimization
- [ ] Add silence detection for auto-stop
- [ ] Add error recovery for dropped WebSocket connections
- [ ] Add transcription language selection

### Voice Pipeline (Option C)
- [ ] Implement OpenAI Realtime conversation sessions
- [ ] Add tool definitions matching plugin contracts
- [ ] Replace deterministic orchestrator with AI tool-calling
- [ ] Add conversation history management
- [ ] Add voice output (text-to-speech via Realtime API)
- [ ] Add streaming response UI

### Plugin Enhancements
- [ ] Quiz engine: Connect to real question banks or AI generation
- [ ] Quiz engine: Adaptive difficulty based on mastery
- [ ] Game engine: Rich interactive game templates
- [ ] Game engine: Multiplayer/collaborative modes
- [ ] Search ingestion: Real web search integration
- [ ] Search ingestion: Source reliability scoring
- [ ] Add plugin versioning and migration support

### Kernel Hardening
- [ ] Implement spaced repetition scheduling
- [ ] Add forgetting curve modeling
- [ ] Enhance weak point detection with ML signals
- [ ] Add mastery decay over time
- [ ] Implement concept dependency validation
- [ ] Add learning path optimization

### Evidence & Integrity
- [ ] Add cryptographic artifact signing
- [ ] Implement external verification service
- [ ] Add blockchain anchoring (optional)
- [ ] Add evidence export (PDF, JSON)
- [ ] Add portfolio sharing (public links)

### Data & Performance
- [ ] Add database indices for common queries
- [ ] Implement pagination for large datasets
- [ ] Add caching layer (Redis)
- [ ] Add database connection pooling
- [ ] Implement offline-first with SQLite on client
- [ ] Add sync engine for offline → online reconciliation

### UI/UX Polish
- [ ] Add onboarding flow for new users
- [ ] Add learning path visualization (graph)
- [ ] Add achievement/badge system
- [ ] Add daily streak tracking
- [ ] Add push notifications for reminders
- [ ] Add dark mode toggle in profile
- [ ] Add accessibility improvements (VoiceOver, TalkBack)

### DevOps & Monitoring
- [ ] Add error tracking (Sentry)
- [ ] Add analytics (Mixpanel/Amplitude)
- [ ] Add health check endpoints
- [ ] Add log aggregation
- [ ] Add CI/CD pipeline
- [ ] Add automated testing

### Security
- [ ] Add rate limiting
- [ ] Add input validation/sanitization
- [ ] Add CSRF protection
- [ ] Add security headers
- [ ] Add API key rotation
- [ ] Penetration testing

## Mobile Voice & Realtime (Warp)

### VoiceCapture Class — realtime_stream Mode
- [ ] Implement real WebSocket audio streaming in `startRealtimeStream()` (currently falls back to `startRecording()`)
- [ ] Add PCM/Opus encoding for streamed audio frames on iOS and Android
- [ ] Handle partial transcript callbacks (`onTranscript` with `isFinal: false`) from WebSocket deltas
- [ ] Add automatic reconnection logic when WebSocket drops during streaming
- [ ] Add silence detection (VAD) to auto-stop recording after N seconds of silence
- [ ] Add audio level metering callback (`onAudioLevel`) for visual waveform feedback

### WebSocket Integration for Streaming Transcription
- [ ] Upgrade voice gateway to accept raw audio frames (binary WebSocket messages)
- [ ] Add client-side WebSocket connection management in `VoiceCapture` (connect on `start()`, disconnect on `stop()`)
- [ ] Implement backpressure handling for slow network conditions
- [ ] Add session resumption after temporary disconnects (session ID continuity)
- [ ] Support both `record_transcribe` (HTTP upload) and `realtime_stream` (WebSocket) modes simultaneously

### Mobile-Specific Considerations
- [ ] Handle iOS audio session interruptions (phone calls, Siri, other apps)
- [ ] Handle Android audio focus changes (notifications, other media apps)
- [ ] Manage `Audio.setAudioModeAsync` lifecycle across app backgrounding
- [ ] Test and handle permission revocation mid-session
- [ ] Add battery-aware recording (reduce quality or disable streaming on low battery)
- [ ] Ensure WebSocket stays alive during React Native background mode (limited on iOS)
- [ ] Add haptic feedback for state transitions (recording start/stop, transcript received)
- [ ] Handle Expo Go limitations vs development build for audio streaming

## Nice-to-Have
- [ ] Multi-language support (i18n)
- [ ] Collaborative learning (study groups)
- [ ] Instructor/mentor mode
- [ ] Integration with external LMS (Canvas, Moodle)
- [ ] Calendar integration for study scheduling
- [ ] Widget/notification for quick pin capture
