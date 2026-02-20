# MŪV Event Schema

## Event Envelope

Every event is stored in the `event_log` table with this structure:

```json
{
  "id": "uuid",
  "learner_id": "uuid | null",
  "event_type": "string",
  "payload": {},
  "timestamp": "ISO-8601"
}
```

## Event Types

### System Events
| Event Type | Payload | Description |
|------------|---------|-------------|
| `orchestrate_request` | `{ transcript, intent, topic, sessionId }` | User submitted a voice/text command |
| `unknown_intent` | `{ transcript }` | Orchestrator could not classify intent |

### Mastery Events
| Event Type | Payload | Description |
|------------|---------|-------------|
| `mastery_delta_accepted` | `{ conceptId, previousScore, newScore, delta, source }` | Kernel accepted a mastery change |

### Voice Events
| Event Type | Payload | Description |
|------------|---------|-------------|
| `voice_session_start` | `{ mode }` | Voice capture session started |
| `voice_session_end` | `{ transcript }` | Voice capture session ended |

### Plugin Events
Plugin events are recorded as evidence artifacts rather than event log entries.
See PLUGIN_CONTRACTS.json for output schemas.

## Event Consumption

Events can be queried via:
```
GET /api/events?learner_id={id}&limit={n}
```

Returns events in reverse chronological order.

## Future Event Types (Option C)
When upgrading to realtime conversations:
- `voice_conversation_start`
- `voice_conversation_turn`
- `voice_conversation_end`
- `tool_call_requested`
- `tool_call_completed`
