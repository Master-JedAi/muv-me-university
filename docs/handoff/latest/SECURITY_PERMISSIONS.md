# MŪV Security & Permissions

## API Key Management

### OpenAI API Key
- **Location**: Server-side only (environment variable `OPENAI_API_KEY`)
- **Client access**: NEVER exposed to the mobile client
- **Voice gateway**: Connects to OpenAI Realtime API using server-side key
- **Fallback**: System works without API key in prototype mode (simulated transcription)

### Session Secret
- **Location**: Server-side environment variable `SESSION_SECRET`
- **Usage**: Session management and CSRF protection

## Scopes & Access Control

### Learner Scope
In the prototype, there is a single default learner. In production:
- Each learner can only access their own data
- All API queries require `learner_id` parameter
- Backend validates learner ownership before returning data

### Plugin Scopes
Plugins operate under strict contracts:
- **quiz_engine.v1**: Can READ concepts, WRITE quiz artifacts, PROPOSE mastery deltas
- **game_engine.v1**: Can READ weak points, WRITE game artifacts, PROPOSE mastery deltas
- **search_ingestion.v1**: Can WRITE evidence packs

### Kernel Invariants
1. **Mastery deltas are proposals only**: No plugin can directly write mastery scores
2. **Confidence gate**: All mastery updates require confidence ≥ 0.3
3. **Delta cap**: Maximum ±0.25 per update prevents gaming
4. **Evidence integrity**: All artifacts get content-hash for tamper detection
5. **Audit trail**: All events logged to event_log table

## Data Integrity

### Evidence Artifacts
- Each artifact includes a SHA-256 content hash (truncated to 16 chars)
- `integrity` field indicates verification level:
  - `"prototype"`: Hash computed but not externally verified
  - `"verified"`: (Future) Cryptographically signed and verified
- Payload is stored as JSONB for replayability

### Event Log
- Append-only event log captures all significant actions
- Events include timestamps and learner associations
- No event deletion in normal operation

## Network Security
- CORS configured for Replit domains only
- WebSocket connections authenticated via learner_id in start_session
- All API responses use standard HTTP error codes

## Permissions (Mobile App)
- **Microphone**: Required for voice capture (NSMicrophoneUsageDescription set)
- **Network**: Required for API communication
- No other permissions required in prototype

## Production Hardening Checklist
- [ ] Add proper authentication (JWT or session-based)
- [ ] Add rate limiting on all endpoints
- [ ] Add input validation/sanitization
- [ ] Enable HTTPS-only
- [ ] Add CSRF protection
- [ ] Implement proper RBAC for multi-user
- [ ] Add artifact signature verification
- [ ] Enable audit log export
- [ ] Add API key rotation mechanism
