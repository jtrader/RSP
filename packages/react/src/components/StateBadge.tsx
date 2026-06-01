import React from 'react'
import type { RSPVisualState } from '@rsp/core'
import { getStateDisplay } from '@rsp/core'

// ── StateBadge ────────────────────────────────────────────────────────────────
// Compact inline badge showing an RSP visual state.
// Use inside tables, lists, or any dense UI.

export interface StateBadgeProps {
  state: RSPVisualState
  /** Show full label or abbreviated dot only */
  variant?: 'full' | 'dot'
  className?: string
  style?: React.CSSProperties
}

export function StateBadge({ state, variant = 'full', className, style }: StateBadgeProps) {
  const display = getStateDisplay(state)

  if (variant === 'dot') {
    return (
      <span
        className={['rsp-state-badge', 'rsp-state-badge--dot', `rsp-${display.colour}`, className].filter(Boolean).join(' ')}
        title={display.label}
        aria-label={display.label}
        style={style}
      />
    )
  }

  return (
    <span
      className={['rsp-state-badge', `rsp-${display.colour}`, className].filter(Boolean).join(' ')}
      data-state={state}
      style={style}
    >
      {display.label}
    </span>
  )
}
