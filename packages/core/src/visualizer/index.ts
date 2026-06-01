import type { RSPVisualState, RSPNodeSignal } from '../types.js'

// ── Visualizer ────────────────────────────────────────────────────────────────
// Renders RSP visual states as structured output for dashboards,
// UI components, and AI agent consumption.
// The visualizer never contains source data — only states and metadata.

export interface RSPStateDisplay {
  state: RSPVisualState
  label: string
  description: string
  /** Semantic colour category for UI rendering */
  colour: 'neutral' | 'positive' | 'warning' | 'critical' | 'info'
  /** Suggested action for the system or operator */
  suggestedAction: string
}

export interface RSPSignalDisplay {
  nodeId: string
  nodeType: string
  state: RSPStateDisplay
  intensity: number
  trend: 'rising' | 'stable' | 'falling'
  trendLabel: string
  windowLabel: string
}

// ── State Metadata ────────────────────────────────────────────────────────────

export const STATE_DISPLAY: Record<RSPVisualState, RSPStateDisplay> = {
  dormant: {
    state: 'dormant',
    label: 'Dormant',
    description: 'No meaningful signal in the current window.',
    colour: 'neutral',
    suggestedAction: 'No action required.',
  },
  aware: {
    state: 'aware',
    label: 'Aware',
    description: 'Minimal activity detected.',
    colour: 'neutral',
    suggestedAction: 'Monitor passively.',
  },
  active: {
    state: 'active',
    label: 'Active',
    description: 'Consistent engagement.',
    colour: 'positive',
    suggestedAction: 'No intervention needed.',
  },
  resonant: {
    state: 'resonant',
    label: 'Resonant',
    description: 'Strong, sustained engagement — optimal state.',
    colour: 'positive',
    suggestedAction: 'Reinforce or maintain current conditions.',
  },
  friction: {
    state: 'friction',
    label: 'Friction',
    description: 'Repeated difficulty or resistance signals detected.',
    colour: 'warning',
    suggestedAction: 'Review content or workflow for blockers.',
  },
  overload: {
    state: 'overload',
    label: 'Overload',
    description: 'Activity volume exceeding healthy threshold.',
    colour: 'warning',
    suggestedAction: 'Consider reducing complexity or pacing.',
  },
  drop_off: {
    state: 'drop_off',
    label: 'Drop-off',
    description: 'Engagement declining toward abandonment.',
    colour: 'warning',
    suggestedAction: 'Intervene with support or re-engagement prompt.',
  },
  support_needed: {
    state: 'support_needed',
    label: 'Support Needed',
    description: 'Escalation or distress signals present.',
    colour: 'critical',
    suggestedAction: 'Escalate to human support immediately.',
  },
  cooling: {
    state: 'cooling',
    label: 'Cooling',
    description: 'Engagement declining but stable.',
    colour: 'info',
    suggestedAction: 'Monitor; consider a gentle re-engagement prompt.',
  },
  converting: {
    state: 'converting',
    label: 'Converting',
    description: 'Progressing toward a completion event.',
    colour: 'positive',
    suggestedAction: 'Remove friction from the completion path.',
  },
  mastery: {
    state: 'mastery',
    label: 'Mastery',
    description: 'Sustained high performance across the window.',
    colour: 'positive',
    suggestedAction: 'Offer advanced content or next challenge.',
  },
  coordination_degraded: {
    state: 'coordination_degraded',
    label: 'Coordination Degraded',
    description: 'System-level coordination breakdown signals.',
    colour: 'critical',
    suggestedAction: 'Review system health and agent handoff patterns.',
  },
  coordination_healthy: {
    state: 'coordination_healthy',
    label: 'Coordination Healthy',
    description: 'System-level coordination operating normally.',
    colour: 'positive',
    suggestedAction: 'No action required.',
  },
}

/**
 * Get display metadata for a visual state.
 */
export function getStateDisplay(state: RSPVisualState): RSPStateDisplay {
  return STATE_DISPLAY[state]
}

/**
 * Render a node signal as a display object for UI consumption.
 */
export function renderSignal(signal: RSPNodeSignal): RSPSignalDisplay {
  return {
    nodeId: signal.nodeId,
    nodeType: signal.nodeType,
    state: getStateDisplay(signal.state),
    intensity: Math.round(signal.intensity * 100) / 100,
    trend: signal.trend,
    trendLabel: trendLabel(signal.trend),
    windowLabel: windowLabel(signal.windowStart, signal.windowEnd),
  }
}

/**
 * Render multiple signals as display objects.
 */
export function renderSignals(signals: RSPNodeSignal[]): RSPSignalDisplay[] {
  return signals.map(renderSignal)
}

/**
 * Filter signals by state.
 */
export function filterByState(
  signals: RSPNodeSignal[],
  states: RSPVisualState[],
): RSPNodeSignal[] {
  return signals.filter((s) => states.includes(s.state))
}

/**
 * Get all signals that require attention.
 */
export function getAttentionSignals(signals: RSPNodeSignal[]): RSPNodeSignal[] {
  return filterByState(signals, [
    'support_needed',
    'friction',
    'overload',
    'drop_off',
    'coordination_degraded',
  ])
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function trendLabel(trend: 'rising' | 'stable' | 'falling'): string {
  return { rising: '↑ Rising', stable: '→ Stable', falling: '↓ Falling' }[trend]
}

function windowLabel(start: string, end: string): string {
  const s = new Date(start)
  const e = new Date(end)
  const fmt = (d: Date) =>
    d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  return `${fmt(s)} – ${fmt(e)}`
}
