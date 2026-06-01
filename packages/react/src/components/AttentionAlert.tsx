import React from 'react'
import type { RSPNodeSignal } from '@rsp/core'
import { getAttentionSignals, getStateDisplay } from '@rsp/core'

// ── AttentionAlert ────────────────────────────────────────────────────────────
// Surfaces signals that require immediate attention.
// Designed for dashboards, instructor views, and support operator panels.
// Renders nothing if no attention signals are present.

export interface AttentionAlertProps {
  signals: RSPNodeSignal[]
  /** Called when an alert is dismissed */
  onDismiss?: (nodeId: string) => void
  /** Custom title */
  title?: string
  className?: string
  style?: React.CSSProperties
}

export function AttentionAlert({
  signals,
  onDismiss,
  title = 'Attention required',
  className,
  style,
}: AttentionAlertProps) {
  const attention = getAttentionSignals(signals)

  if (attention.length === 0) return null

  return (
    <div
      className={['rsp-attention-alert', className].filter(Boolean).join(' ')}
      role="alert"
      aria-live="polite"
      style={style}
    >
      <div className="rsp-attention-alert__header">
        <span className="rsp-attention-alert__title">{title}</span>
        <span className="rsp-attention-alert__count">
          {attention.length} {attention.length === 1 ? 'node' : 'nodes'}
        </span>
      </div>
      <ul className="rsp-attention-alert__list" role="list">
        {attention.map((signal) => {
          const display = getStateDisplay(signal.state)
          return (
            <li key={signal.nodeId} className="rsp-attention-alert__item" role="listitem">
              <span className={`rsp-attention-alert__state rsp-${display.colour}`}>
                {display.label}
              </span>
              <span className="rsp-attention-alert__node">{signal.nodeType}</span>
              <span className="rsp-attention-alert__action">{display.suggestedAction}</span>
              {onDismiss && (
                <button
                  className="rsp-attention-alert__dismiss"
                  onClick={() => onDismiss(signal.nodeId)}
                  aria-label={`Dismiss alert for ${signal.nodeId}`}
                >
                  Dismiss
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
