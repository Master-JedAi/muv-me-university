# MŪV Animated Assistant System

## Overview
The MŪV assistant is a CSS/Reanimated-driven animated character that provides visual feedback for the learner's current interaction state. It is implemented as a circular "face" with eyes and a state-specific icon, animated via `react-native-reanimated`. The system is designed as a drop-in placeholder that can be upgraded to a real Rive (.riv) animation file when one becomes available.

## Source Files
| File | Purpose |
|------|---------|
| `lib/assistant-context.tsx` | `AssistantProvider` context and `useAssistant` hook |
| `components/AnimatedAssistant.tsx` | `LargeAssistant`, `AssistantBubble`, and internal `AssistantFace` components |

## Assistant States

The assistant has 6 discrete states defined by the `AssistantState` type:

| State | Color | Icon | Trigger |
|-------|-------|------|---------|
| `idle` | `#6B7280` (gray) | `school-outline` | Default / resting state |
| `listening` | `#F5A623` (amber) | `ear-outline` | User is recording voice input |
| `thinking` | `#8B5CF6` (purple) | `ellipsis-horizontal` | Backend is processing a request |
| `speaking` | `#0A7E8C` (teal) | `chatbubble-outline` | Assistant is delivering a response |
| `celebrate` | `#10B981` (green) | `sparkles` | Mastery milestone reached |
| `pin_ack` | `#EC4899` (pink) | `bookmark` | Pin successfully created |

## Animation Details

Each state drives three shared values: `breathe` (scale), `pulse` (glow opacity), and `rotation` (degrees).

### idle
- **Breathe**: Slow scale oscillation 0.95 ↔ 1.05 over 4s (2s each direction), `Easing.inOut(ease)`
- **Pulse**: Glow opacity 0 ↔ 0.3 over 4s
- **Rotation**: None

### listening
- **Breathe**: Fast scale oscillation 0.9 ↔ 1.15 over 1s (500ms each), `Easing.inOut(ease)`
- **Pulse**: Glow opacity 0.2 ↔ 0.6 over 600ms (300ms each)
- **Rotation**: None
- **Eyes**: Height increases to `size * 0.14` (wider/alert look)

### thinking
- **Breathe**: Medium scale oscillation 0.92 ↔ 1.08 over 1.6s (800ms each), `Easing.inOut(ease)`
- **Pulse**: None
- **Rotation**: Continuous 360° rotation over 3s, `Easing.linear`, infinite repeat

### speaking
- **Breathe**: Asymmetric scale oscillation 0.96 ↔ 1.12 over 1s (400ms up, 600ms down)
- **Pulse**: Glow opacity 0.1 ↔ 0.5 over 1s (400ms up, 600ms down)
- **Rotation**: None

### celebrate
- **Breathe**: Spring bounce to 1.3 then back to 1.0 (damping: 4, stiffness: 200), repeats 3 times
- **Pulse**: None
- **Rotation**: Wiggle ±15° with return to 0° (150ms per segment), repeats 3 times
- **Duration**: Auto-resets to `idle` after 2500ms via `triggerCelebrate()`

### pin_ack
- **Breathe**: Single spring pop to 1.2 then settle to 1.0 (damping: 6, stiffness: 300)
- **Pulse**: None
- **Rotation**: None
- **Duration**: Auto-resets to `idle` after 1500ms via `triggerPinAck()`

## Components

### AssistantFace (internal)
The core rendering component. Accepts `size` (px) and `state` props. Renders:
- An outer glow circle at `size * 1.4` with state color and animated opacity
- A circular body at `size` with state color, 2px border, animated scale and rotation
- Two white "eye" dots (scale with size, taller in `listening` state)
- A state-specific Ionicon below the eyes

### LargeAssistant
- **Size**: 80px
- **Usage**: Displayed on the Speak tab as the primary assistant avatar
- **Behavior**: Reads state from `useAssistant()` context, passes to `AssistantFace`

### AssistantBubble
- **Size**: 36px (collapsed) / 40px (expanded)
- **Usage**: Floating overlay on non-Speak tabs, positioned `bottom: 100, right: 16`
- **Collapsed state**: Shows when `idle` and not expanded; small circular bubble, tap to expand
- **Expanded state**: Full-width bar showing assistant face + state label + last message (2-line max)
- **Tap behavior**: Toggles expanded/collapsed
- **Z-index**: 999 (floats above tab content)
- **Styling**: Theme-aware surface/border colors, shadow/elevation for depth

## AssistantContext Provider

### Provider: `AssistantProvider`
Wraps the app (placed in root `_layout.tsx`). Manages:
- `state: AssistantState` — current animation state
- `isExpanded: boolean` — whether the bubble is showing the expanded message view
- `lastMessage: string` — text to display in the expanded bubble

### Hook: `useAssistant()`
Returns the full `AssistantContextValue`:
```typescript
interface AssistantContextValue {
  state: AssistantState;
  isExpanded: boolean;
  lastMessage: string;
  setState: (state: AssistantState) => void;
  setExpanded: (expanded: boolean) => void;
  setLastMessage: (message: string) => void;
  triggerCelebrate: () => void;  // Sets celebrate, auto-resets after 2500ms
  triggerPinAck: () => void;     // Sets pin_ack, auto-resets after 1500ms
}
```

### Usage Pattern
```typescript
const { setState, triggerCelebrate, setLastMessage } = useAssistant();

// When starting voice recording:
setState("listening");

// When sending to backend:
setState("thinking");

// When response arrives:
setState("speaking");
setLastMessage(response.text);

// When mastery milestone hit:
triggerCelebrate();

// When pin created:
triggerPinAck();

// When done:
setState("idle");
```

## Upgrade Path to Real Rive

The current implementation uses `react-native-reanimated` to simulate what would ideally be a Rive state machine. To upgrade:

1. **Create a `.riv` file** in Rive Editor with a state machine containing 6 states matching the current `AssistantState` type
2. **Install `rive-react-native`** (requires a development build, not Expo Go compatible)
3. **Replace `AssistantFace`** internals:
   ```typescript
   import Rive, { Fit } from 'rive-react-native';

   function AssistantFace({ size, state }: { size: number; state: AssistantState }) {
     const riveRef = useRef<RiveRef>(null);

     useEffect(() => {
       riveRef.current?.setInputState("StateMachine", "state", state);
     }, [state]);

     return (
       <Rive
         ref={riveRef}
         resourceName="assistant"
         stateMachineName="StateMachine"
         style={{ width: size, height: size }}
         fit={Fit.Contain}
       />
     );
   }
   ```
4. **No changes needed** to `AssistantProvider`, `useAssistant()`, `LargeAssistant`, or `AssistantBubble` — only the internal `AssistantFace` component changes
5. **State machine inputs** in the Rive file should accept a string input named `state` with values matching `AssistantState`
6. **Keep the reanimated version** as a fallback for Expo Go development (guard with `Platform` or a feature flag)
