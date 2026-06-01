import React from 'react'
import type { RSPNodeSignal, RSPVisualState } from '@rsp/core'
import { getAttentionSignals, filterByState } from '@rsp/core'
import { SignalCard } from './SignalCard.js'

// ── SignalGrid ────────────────────────────────────────────────────────────────
// Renders a grid of SignalCards for multiple nodes.
// Optionally filters to show only attention-required signals.

export interface SignalGridProps {
  signals: RSPNodeSignal[]
  /** Only show signals in these states */
  filterStates?: RSPVisualState[]
  /** Only show signals that need attention */
  attentionOnly?: boolean
  /** Show card actions */
  showActions?: boolean
  /** Show intensity bars */
  showIntensity?: boolean
  /** Empty state message */
  emptyMessage?: string
  className?: string
  style?: React.CSSProperties
}

export function SignalGrid({
  signals,
  filterStates,
  attentionOnly = false,
  showActions = true,
  showIntensity = true,
  emptyMessage = 'No signals in current window.',
  className,
  style,
}: SignalGridProps) {
  let filtered = signals

  if (attentionOnly) {
    filtered = getAttentionSignals(filtered)
  } else if (filterStates && filterStates.length > 0) {
    filtered = filterByState(filtered, filterStates)
  }

  if (filtered.length === 0) {
    return (
      <div className={['rsp-signal-grid', 'rsp-signal-grid--empty', className].filter(Boolean).join(' ')} style={style}>
        <p className="rsp-signal-grid__empty">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div
      className={['rsp-signal-grid', className].filter(Boolean).join(' ')}
      style={style}
      role="list"
      aria-label="Signal grid"
    >
      {filtered.map((signal) => (
        <div key={signal.nodeId} role="listitem">
          <SignalCard
            signal={signal}
            showAction={showActions}
            showIntensity={showIntensity}
          />
        </div>
      ))}
    </div>
  )
}
