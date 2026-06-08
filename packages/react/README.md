# `@rsp-protocol/react`

**Respectful Synchronised Protocol — React hooks and components**

Drop-in React integration for the RSP privacy-first coordination pipeline.

[![npm](https://img.shields.io/npm/v/@rsp-protocol/react)](https://www.npmjs.com/package/@rsp-protocol/react)
[![npm peer dependency](https://img.shields.io/npm/dependency-version/@rsp-protocol/react/peer/react)](https://www.npmjs.com/package/@rsp-protocol/react)
[![GitHub](https://img.shields.io/badge/github-%40rsp-lightgrey)](https://github.com/rsp)
[![Protocol](https://img.shields.io/badge/protocol-lovekeylink.com%2Frsp-red)](https://lovekeylink.com/rsp)

---

## What is RSP?

RSP is a privacy-first coordination framework for systems that observe behaviour — human, AI, or hybrid — and need to act on it without surveilling, profiling, or coercing the people involved.

`@rsp-protocol/react` provides hooks and components that wire the full RSP pipeline into React applications. It wraps [`@rsp-protocol/core`](https://www.npmjs.com/package/@rsp-protocol/core), which is included as a dependency — you do not need to install both.

---

## Installation

```bash
npm install @rsp-protocol/react
# or
pnpm add @rsp-protocol/react
# or
yarn add @rsp-protocol/react
```

**Peer dependencies:** React 18 or 19.

---

## Quick Start

```tsx
import { useRSPPipeline, SignalCard } from '@rsp-protocol/react'
import { createConsent } from '@rsp-protocol/core'

// Create a consent record — always required before tracking
const consent = createConsent({
  id: 'c1',
  nodeId: 'node-anon-abc123',  // anonymised — never a real user ID
  scope: ['analytics'],
  durationDays: 30,
})

function LessonPage() {
  const { track, signal, display, receipts } = useRSPPipeline({
    nodeId: 'node-anon-abc123',
    consent,
    nodeType: 'lesson',
    signalWindowMinutes: 60,
    onBurn: (receipt) => {
      // persist the receipt to your audit store
      console.log('Burned:', receipt)
    },
  })

  return (
    <div
      onScroll={() => track.scroll50()}
      onClick={() => track.elementClick()}
    >
      <h1>Lesson content</h1>

      {signal && <SignalCard signal={signal} showAction showIntensity />}
    </div>
  )
}
```

---

## Hooks

### `useRSPPipeline` — primary hook

Wires the full RSP pipeline in a single call: tracker → consent gate → normalisation → aggregation → signal → auto-burn on window expiry.

```typescript
const {
  track,       // convenience capture methods
  capture,     // capture any event type by string
  isTracking,  // boolean — false if consent is invalid or withdrawn
  signal,      // RSPNodeSignal | null
  display,     // RSPSignalDisplay | null — rendered for UI
  push,        // manually push a normalised event
  reset,       // manually flush the current window
  receipts,    // RSPBurnReceipt[] — all receipts generated this session
} = useRSPPipeline({
  nodeId: string                    // required — anonymised node identifier
  consent: RSPConsent | null        // required — null disables tracking
  consentScope?: string             // default: 'analytics'
  signalWindowMinutes?: number      // default: 60
  nodeType?: string                 // default: 'element'
  weights?: RSPWeightMap            // custom weight overrides
  thresholds?: StateThresholds      // custom state thresholds
  onBurn?: (receipt) => void        // called when a window burns
})
```

---

### `useRSPTracker` — tracker only

Use when you want to capture events and handle normalised output yourself — e.g. when feeding multiple trackers into a shared signal store.

```typescript
const { track, capture, isTracking } = useRSPTracker({
  nodeId: 'node-anon-abc123',
  consent,
  consentScope: 'analytics',
  signalWindowMinutes: 60,
  nodeType: 'lesson',
  onEvent: (normalisedEvent) => {
    // forward to your own signal handler
    mySignalStore.push(normalisedEvent)
  },
})

// Capture events
track.pageView()
track.activeMinute()
track.completionOrConversion()
capture('customEventType')
```

**`track` convenience methods:** `pageView` · `scroll50` · `scroll90` · `elementClick` · `activeMinute` · `formInteraction` · `resourceDownload` · `returnVisit` · `completionOrConversion` · `humanCorrection` · `agentHandoff` · `safetyEscalation` · `quizRetry` · `videoRewind`

---

### `useNodeSignal` — signal only

Use when you're managing event capture separately and want to feed normalised events into the signal/burn pipeline.

```typescript
const { signal, display, push, reset, receipts } = useNodeSignal({
  nodeId: 'node-anon-abc123',
  signalWindowMinutes: 60,
  nodeType: 'lesson',
  thresholds: customThresholds,  // optional
  onBurn: (receipt) => {         // optional
    saveToAuditLog(receipt)
  },
})

// Feed events in
push(normalisedEvent)

// Manually flush window
reset()
```

**Behaviour:**
- Updates `signal` optimistically on every `push` for responsive UI
- Automatically flushes and burns the window on expiry (checks every 30 seconds)
- Each flush generates a `RSPBurnReceipt` and calls `onBurn`

---

## Components

All components are **unstyled by default** — they emit semantic class names you style yourself. Pass `className` or `style` for inline overrides.

---

### `SignalCard`

Displays a single RSP node signal — state, intensity, trend, and suggested action.

```tsx
import { SignalCard } from '@rsp-protocol/react'

<SignalCard
  signal={signal}
  showAction={true}      // show suggested action — default: true
  showIntensity={true}   // show intensity bar — default: true
  showTrend={true}       // show trend indicator — default: true
  showNodeId={false}     // show node ID (debug only) — default: false
  className="my-card"
/>
```

Emits class names: `rsp-signal-card` · `rsp-neutral` / `rsp-positive` / `rsp-warning` / `rsp-critical` / `rsp-info`

---

### `SignalGrid`

Renders a collection of `SignalCard`s in a responsive grid. Useful for instructor dashboards, operator panels, or multi-node monitoring views.

```tsx
import { SignalGrid } from '@rsp-protocol/react'

<SignalGrid
  signals={signals}           // RSPNodeSignal[]
  showAction={true}
  showIntensity={true}
  className="my-grid"
/>
```

---

### `StateBadge`

Compact inline badge for dense UIs — tables, lists, headers.

```tsx
import { StateBadge } from '@rsp-protocol/react'

// Full label
<StateBadge state="resonant" />
// → renders: "Resonant"

// Dot only — for tight spaces
<StateBadge state="support_needed" variant="dot" />
// → renders a coloured dot with aria-label

// With custom class
<StateBadge state="friction" className="my-badge" />
```

**Props:** `state: RSPVisualState` · `variant?: 'full' | 'dot'` · `className?` · `style?`

---

### `AttentionAlert`

Surfaces signals requiring immediate attention. Renders nothing if no attention signals are present — safe to include unconditionally.

Attention states: `support_needed` · `friction` · `overload` · `drop_off` · `coordination_degraded`

```tsx
import { AttentionAlert } from '@rsp-protocol/react'

<AttentionAlert
  signals={allSignals}                         // RSPNodeSignal[]
  title="Nodes requiring attention"            // optional, default: 'Attention required'
  onDismiss={(nodeId) => dismiss(nodeId)}      // optional
  className="my-alert"
/>
```

Accessible by default — uses `role="alert"` and `aria-live="polite"`.

---

## CSS Class Reference

Style these classes to theme the components:

```css
/* Signal card */
.rsp-signal-card { }
.rsp-signal-card__header { }
.rsp-signal-card__state { }
.rsp-signal-card__trend { }
.rsp-signal-card__intensity { }
.rsp-signal-card__intensity-bar { }
.rsp-signal-card__description { }
.rsp-signal-card__action { }
.rsp-signal-card__window { }

/* State badge */
.rsp-state-badge { }
.rsp-state-badge--dot { }

/* Attention alert */
.rsp-attention-alert { }
.rsp-attention-alert__header { }
.rsp-attention-alert__title { }
.rsp-attention-alert__count { }
.rsp-attention-alert__list { }
.rsp-attention-alert__item { }
.rsp-attention-alert__state { }
.rsp-attention-alert__action { }
.rsp-attention-alert__dismiss { }

/* Colour modifiers — applied to cards and badges */
.rsp-neutral  { }
.rsp-positive { }
.rsp-warning  { }
.rsp-critical { }
.rsp-info     { }
```

---

## Operator Dashboard Example

```tsx
import { useRSPPipeline, SignalGrid, AttentionAlert } from '@rsp-protocol/react'
import { createConsent } from '@rsp-protocol/core'

function Dashboard({ nodes }) {
  const pipelines = nodes.map((node) =>
    useRSPPipeline({
      nodeId: node.id,
      consent: node.consent,
      nodeType: 'student',
      signalWindowMinutes: 60,
      onBurn: (receipt) => saveReceipt(receipt),
    })
  )

  const signals = pipelines
    .map((p) => p.signal)
    .filter(Boolean)

  return (
    <div>
      <AttentionAlert
        signals={signals}
        title="Students needing support"
        onDismiss={(nodeId) => console.log('dismissed', nodeId)}
      />
      <SignalGrid signals={signals} />
    </div>
  )
}
```

---

## The Burn Clause

When user behaviour is translated, synchronised, aggregated, or converted into a protocol signal, any identifiable source information must be removed, destroyed, cryptographically erased, or irreversibly decoupled as soon as it is no longer necessary — unless retention is required by law, explicit consent, safety, or legitimate accountability.

**This is not optional. It is the defining clause of RSP compliance.**

---

## Links

- [Protocol page](https://lovekeylink.com/rsp)
- [GitHub](https://github.com/rsp)
- [Core package — `@rsp-protocol/core`](https://www.npmjs.com/package/@rsp-protocol/core)
- Genesis NFT: `0xA1755730C6F66dbe3de29e24F4Db9F448ef3FDD5` (Ethereum)

---

## License

Private — Copyright © 2026 Jack Oswald. All rights reserved unless otherwise licensed in writing.

Use of the RSP name, certification marks, or associated branding in commercial products requires a written Partner Licence.
