# MŪV (Me Uni-Versity)

## Overview
MŪV is a personal adaptive learning platform with voice-first interaction. Users "speak it into existence" - saying what they want to learn, and the system creates courses, quizzes, and games tailored to their needs. Built as an Expo (React Native) mobile app with an Express backend.

## Current State
- **Version**: 1.0.0 (Prototype)
- **Voice Mode**: Option B (Transcription) - text input with voice gateway ready
- **Interaction Modes**: 4 options selectable at startup (stored in AsyncStorage)
- **Date**: February 2026

## Interaction Modes
Users choose their preferred mode on first launch (changeable in Profile):
1. **Voice Only** (`voice_only`): Full-screen liquid ripple UI, center orb, no buttons. Ripples outward when AI talks, inward when user talks. Route: `/voice-only`
2. **Voice + Text** (`voice_text`): Chat-style with conversation bubbles, optional keyboard toggle. Route: `/(tabs)/speak`
3. **Click / Touch** (`click_only`): Traditional tab navigation with full controls. Route: `/(tabs)`
4. **Any / All** (`any`): All input methods available. Route: `/(tabs)`

## Project Architecture

### Frontend (Expo + React Native + TypeScript)
- **Routing**: Expo Router file-based routing with onboarding gate + 5-tab layout
- **Onboarding**: `app/onboarding.tsx` - mode selection screen on first launch
- **Voice Only**: `app/voice-only.tsx` - immersive ripple UI for voice-only mode
- **Tabs**: Dashboard, Speak, Learn, Evidence, Profile
- **State**: MuvProvider (lib/muv-context.tsx) + InteractionModeProvider (lib/interaction-mode-context.tsx) + AssistantProvider (lib/assistant-context.tsx) + React Query
- **Animated Assistant**: components/AnimatedAssistant.tsx - 6-state animated orb (idle, listening, thinking, speaking, celebrate, pin_ack). Large on Speak tab, floating bubble on other tabs.
- **Voice Capture**: lib/voice-capture.ts - Abstraction layer with record_transcribe (current) and realtime_stream (Warp upgrade path)
- **Offline Queue**: lib/offline-queue.ts - AsyncStorage event queue with periodic sync (30s), max 3 retries
- **Font**: Inter (Google Fonts)
- **Design**: Dark/light theme, teal/amber palette

### Backend (Express + TypeScript)
- **Database**: PostgreSQL via Drizzle ORM
- **Schema**: shared/schema.ts (10 tables)
- **Kernel**: server/kernel.ts (mastery rules, weak point detection)
- **Orchestrator**: server/orchestrator.ts (intent parsing, plugin dispatch)
- **Plugins**: server/plugins/ (quiz_engine.v1, game_engine.v1, search_ingestion.v1)
- **Voice**: server/voice-gateway.ts (WebSocket at /ws/voice)

### Key Files
- `app/(tabs)/` - Tab screens
- `lib/muv-context.tsx` - Central state management
- `lib/assistant-context.tsx` - Animated assistant state
- `lib/voice-capture.ts` - Voice capture abstraction
- `lib/offline-queue.ts` - Offline event queue
- `lib/query-client.ts` - API client
- `components/AnimatedAssistant.tsx` - Animated orb with 6 states
- `server/routes.ts` - All API endpoints (including /api/events/sync)
- `server/kernel.ts` - Mastery acceptance rules
- `server/orchestrator.ts` - Voice/text command processing
- `docs/handoff/latest/` - Complete handoff documentation (9 files)

## Recent Changes
- Added animated AI assistant (Rive-equivalent): 6 states with Reanimated animations, LargeAssistant on Speak tab header, AssistantBubble floating on other tabs
- Added voice capture abstraction (lib/voice-capture.ts): record_transcribe mode active, realtime_stream upgrade path for Warp
- Added offline event queue (lib/offline-queue.ts): AsyncStorage persistence, 30s sync interval, 3 retries, /api/events/sync endpoint
- Enhanced Pin it: pin_ack animation on pin creation, event logging for pins
- Updated handoff docs: HANDOFF_MANIFEST.json, RIVE_ASSISTANT.md, updated VOICE_PIPELINE.md, MOBILE_ARCHITECTURE.md, TODO_WARP.md
- Added interaction mode selection: onboarding screen, voice-only mode with ripple effect, voice+text with keyboard toggle, profile mode switching
- Added real microphone recording with expo-av permission handling
- Initial build: Full 5-tab app, backend with kernel API, plugins, voice gateway, handoff docs

## User Preferences
- Personal learning tool (single user for now)
- Voice-first interaction paradigm
- Evidence-based, not-fakeable learning records
