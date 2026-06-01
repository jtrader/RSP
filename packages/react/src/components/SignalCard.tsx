import React from 'react'
import type { RSPNodeSignal, RSPSignalDisplay } from '@rsp/core'
import { renderSignal } from '@rsp/core'

// ── SignalCard ────────────────────────────────────────────────────────────────
// Displays a single RSP node signal as a card.
// Renders state, intensity, trend, and suggested action.
// Unstyled by default — bring your own CSS or pass a className.

export interface SignalCardProps {
  /** The node signal to display */
  signal: RSPNodeSignal
  /** Show the suggested action */
  showAction?: boolean
  /** Show intensity bar */
  showIntensity?: boolean
  /** Show trend indicator */
  showTrend?: boolean
  /** Show node ID (only enable for debugging — never show real user IDs) */
  showNodeId?: boolean
  className?: string
  style?: React.CSSProperties
}

const COLOUR_MAP: Record<RSPSignalDisplay['state']['colour'], string> = {
  neutral:  'rsp-neutral',
  positive: 'rsp-positive',
  warning:  'rsp-warning',
  critical: 'rsp-critical',
  info:     'rsp-info',
}

export function SignalCard({
  signal,
  showAction = true,
  showIntensity = true,
  showTrend = true,
  showNodeId = false,
  className,
  style,
}: SignalCardProps) {
  const display = renderSignal(signal)
  const colourClass = COLOUR_MAP[display.state.colour]

  return (
    <div
      className={['rsp-signal-card', colourClass, className].filter(Boolean).join(' ')}
      data-state={signal.state}
      data-colour={display.state.colour}
      style={style}
      role="status"
      aria-label={`Signal: ${display.state.label}`}
    >
      <div className="rsp-signal-card__header">
        <span className="rsp-signal-card__state">{display.state.label}</span>
        {showTrend && (
          <span className="rsp-signal-card__trend" aria-label={display.trendLabel}>
            {display.trendLabel}
          </span>
        )}
      </div>

      {showIntensity && (
        <div className="rsp-signal-card__intensity" role="meter" aria-valuenow={display.intensity} aria-valuemin={0} aria-valuemax={1}>
          <div
            className="rsp-signal-card__intensity-bar"
            style={{ width: `${Math.round(display.intensity * 100)}%` }}
          />
        </div>
      )}

      <p className="rsp-signal-card__description">{display.state.description}</p>

      {showAction && (
        <p className="rsp-signal-card__action">{display.state.suggestedAction}</p>
      )}

      <span className="rsp-signal-card__window">{display.windowLabel}</span>

      {showNodeId && (
        <span className="rsp-signal-card__node-id">{signal.nodeId}</span>
      )}
    </div>
  )
}
