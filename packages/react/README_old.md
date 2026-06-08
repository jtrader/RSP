# RSP — Respectful Synchronised Protocol

**Synchronisation without coercion.**

Translate behaviour. Synchronise the signal. Burn the identifiable source.

- Protocol page: [lovekeylink.com/rsp](https://lovekeylink.com/rsp)
- Genesis NFT: `0xA1755730C6F66dbe3de29e24F4Db9F448ef3FDD5` (Ethereum)

---

## What is RSP?

RSP is a privacy-first coordination framework for systems that observe behaviour — human, AI, or hybrid — and need to act on it without surveilling, profiling, or coercing the people involved.

RSP defines how to translate raw behavioural events into minimal, low-resolution signals; how to synchronise those signals into a shared coordination state; and how to destroy the identifiable source data once it has served its purpose.

---

## The Core Flow

```
Observe minimum → Check consent → Normalise → Apply weight →
Aggregate to node signal → Render visual state → Expire → Burn source
```

---

## Packages

| Package | Version | Description |
|---|---|---|
| [`@rsp-protocol/core`](./packages/core) | ![npm](https://img.shields.io/npm/v/@rsp/core) | Core pipeline — tracker, consent, weights, translator, aggregator, burn, audit, visualizer |
| [`@rsp-protocol/react`](./packages/react) | ![npm](https://img.shields.io/npm/v/@rsp/react) | React hooks and components — drop-in integration for React 18+ |

---

## Installation

```bash
# Core only (framework-agnostic — Node, browser, AI agents)
npm install @rsp/core

# React integration (includes @rsp/core as a dependency)
npm install @rsp/react
```

---

## `@rsp/core` — Quick Example

```typescript
import {
  createConsent,
  hasConsent,
  translate,
  aggregate,
  toNodeSignal,
  markBurned,
  generateBurnReceipt,
  renderSignal,
} from '@rsp/core'

// 1. Check consent
const consent = createConsent({
  id: 'c1',
  nodeId: 'node-anon-abc123',
  scope: ['analytics'],
  durationDays: 30,
})

if (!hasConsent(consent, 'analytics')) {
  throw new Error('No consent — cannot process event')
}

// 2. Translate raw event to normalised RSP event
const normalisedEvent = translate(
  { nodeId: 'node-anon-abc123', eventType: 'activeMinute', timestamp: new Date().toISOString() },
  { nodeType: 'lesson', signalWindowMinutes: 60 }
)
// { nodeId: 'node-anon-abc123', weight: 10, sourceStatus: 'normalised', ... }

// 3. Aggregate to node signal
const entries = aggregate([normalisedEvent])
const signal = toNodeSignal(entries.get('node-anon-abc123')!)
// { state: 'aware', intensity: 0.07, trend: 'stable', sourceStatus: 'pending-burn', ... }

// 4. Burn the source
const entry = entries.get('node-anon-abc123')!
const receipt = generateBurnReceipt(entry, 'deletion')
const burnedSignal = markBurned(signal)
// { ...signal, sourceStatus: 'burned' }
// receipt → store this; the source records are gone

// 5. Render for UI or agent consumption
const display = renderSignal(burnedSignal)
// { state: { label: 'Aware', colour: 'neutral', suggestedAction: '...' }, ... }
```

---

## `@rsp/react` — Quick Example

### `useRSPPipeline` — the primary hook

Wires the full RSP pipeline into a React component in one call: tracker → consent gate → normalisation → aggregation → signal → burn.

```tsx
import { useRSPPipeline, SignalCard } from '@rsp/react'
import { createConsent } from '@rsp/core'

const consent = createConsent({
  id: 'c1',
  nodeId: 'node-anon-abc123',
  scope: ['analytics'],
  durationDays: 30,
})

function LessonPage() {
  const { track, signal, display } = useRSPPipeline({
    nodeId: 'node-anon-abc123',
    consent,
    nodeType: 'lesson',
    signalWindowMinutes: 60,
  })

  return (
    <div
      onScroll={() => track.scroll50()}
      onClick={() => track.elementClick()}
    >
      <h1>Lesson content</h1>

      {signal && <SignalCard signal={signal} />}
    </div>
  )
}
```

### Hooks

| Hook | Description |
|---|---|
| `useRSPPipeline` | Full pipeline in one hook — tracker + signal + burn wired together |
| `useRSPTracker` | Tracker only — capture events and forward normalised events to your own handler |
| `useNodeSignal` | Signal only — accumulate normalised events, manage window expiry, emit burn receipts |

### Components

| Component | Description |
|---|---|
| `SignalCard` | Displays a single node signal — state, intensity, trend, suggested action |
| `SignalGrid` | Renders a collection of `SignalCard`s in a responsive grid |
| `StateBadge` | Compact inline badge showing a visual state — full label or dot variant |
| `AttentionAlert` | Surfaces signals requiring immediate attention (`support_needed`, `friction`, `overload`) — renders nothing if none present |

### `AttentionAlert` — dashboard/operator example

```tsx
import { AttentionAlert } from '@rsp/react'

// signals is an RSPNodeSignal[] — e.g. from a list of tracked nodes
function OperatorDashboard({ signals }) {
  return (
    <AttentionAlert
      signals={signals}
      title="Nodes requiring attention"
      onDismiss={(nodeId) => console.log('dismissed', nodeId)}
    />
  )
}
```

### `StateBadge` variants

```tsx
import { StateBadge } from '@rsp/react'

// Full label
<StateBadge state="resonant" />          // → "Resonant"

// Dot only (for dense tables or lists)
<StateBadge state="support_needed" variant="dot" />
```

---

## The Identifiable Source Burn Clause

When user behaviour is translated, synchronised, aggregated, or converted into a protocol signal, any identifiable source information must be removed, destroyed, cryptographically erased, or irreversibly decoupled as soon as it is no longer necessary — unless retention is required by law, explicit consent, safety, or legitimate accountability.

**This is not optional. It is the defining clause of RSP compliance.**

---

## Visual States

RSP reduces all behaviour to 13 named visual states — intentionally low-resolution. Downstream systems act on a state, not a score.

| State | Colour | Meaning |
|---|---|---|
| `dormant` | neutral | No signal activity in the current window |
| `aware` | neutral | Low-level signal — present but not engaged |
| `active` | positive | Engaged and interacting |
| `resonant` | positive | Strong, consistent engagement |
| `friction` | warning | Repeated struggle detected |
| `overload` | warning | Signal intensity above threshold |
| `drop_off` | warning | Engagement started but not sustained |
| `support_needed` | critical | Safety escalation or distress signal |
| `cooling` | info | Signal declining after a peak |
| `converting` | positive | Completion or conversion event detected |
| `mastery` | positive | Sustained high-quality engagement |
| `coordination_degraded` | critical | Multi-node coordination breaking down |
| `coordination_healthy` | positive | Multi-node coordination operating well |

---

## Monorepo — Getting Started

```bash
pnpm install
pnpm build
pnpm test
```

---

## License

Private — Copyright © 2026 Jack Oswald. All rights reserved unless otherwise licensed in writing.

Use of the RSP name, certification marks, or associated branding in commercial products requires a written Partner Licence.