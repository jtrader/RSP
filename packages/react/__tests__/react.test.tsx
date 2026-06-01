import React from 'react'
import { describe, test, expect, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { createConsent } from '@rsp/core'
import type { RSPNodeSignal, RSPNormalisedEvent } from '@rsp/core'

import { useRSPTracker } from '../src/hooks/useRSPTracker.js'
import { useNodeSignal } from '../src/hooks/useNodeSignal.js'
import { useRSPPipeline } from '../src/hooks/useRSPPipeline.js'
import { SignalCard } from '../src/components/SignalCard.js'
import { SignalGrid } from '../src/components/SignalGrid.js'
import { AttentionAlert } from '../src/components/AttentionAlert.js'
import { StateBadge } from '../src/components/StateBadge.js'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const validConsent = createConsent({
  id: 'c1',
  nodeId: 'node-test',
  scope: ['analytics'],
  durationDays: 30,
})

const mockSignal: RSPNodeSignal = {
  nodeId: 'node-test',
  nodeType: 'lesson',
  state: 'active',
  intensity: 0.4,
  trend: 'rising',
  signalWindowMinutes: 60,
  windowStart: new Date().toISOString(),
  windowEnd: new Date(Date.now() + 3_600_000).toISOString(),
  sourceStatus: 'burned',
  score: 30,
  eventCount: 4,
}

const frictionSignal: RSPNodeSignal = { ...mockSignal, state: 'friction', nodeId: 'node-friction' }
const supportSignal: RSPNodeSignal  = { ...mockSignal, state: 'support_needed', nodeId: 'node-support' }
const resonantSignal: RSPNodeSignal = { ...mockSignal, state: 'resonant', nodeId: 'node-resonant' }

// ── useRSPTracker ─────────────────────────────────────────────────────────────

describe('useRSPTracker', () => {
  function TrackerHarness({ onEvent }: { onEvent: (e: RSPNormalisedEvent) => void }) {
    const { track, isTracking } = useRSPTracker({
      nodeId: 'node-test',
      consent: validConsent,
      onEvent,
    })
    return (
      <div>
        <span data-testid="tracking">{isTracking ? 'yes' : 'no'}</span>
        <button onClick={track.pageView}>pageView</button>
        <button onClick={track.completionOrConversion}>complete</button>
      </div>
    )
  }

  test('isTracking is true with valid consent', () => {
    render(<TrackerHarness onEvent={() => {}} />)
    expect(screen.getByTestId('tracking').textContent).toBe('yes')
  })

  test('isTracking is false with null consent', () => {
    function NoConsentHarness() {
      const { isTracking } = useRSPTracker({ nodeId: 'n', consent: null })
      return <span data-testid="tracking">{isTracking ? 'yes' : 'no'}</span>
    }
    render(<NoConsentHarness />)
    expect(screen.getByTestId('tracking').textContent).toBe('no')
  })

  test('track.pageView calls onEvent with normalised event', () => {
    const onEvent = vi.fn()
    render(<TrackerHarness onEvent={onEvent} />)
    act(() => { screen.getByText('pageView').click() })
    expect(onEvent).toHaveBeenCalledOnce()
    expect(onEvent.mock.calls[0]?.[0]?.eventType).toBe('pageView')
    expect(onEvent.mock.calls[0]?.[0]?.sourceStatus).toBe('normalised')
  })

  test('track.completionOrConversion fires with weight 25', () => {
    const onEvent = vi.fn()
    render(<TrackerHarness onEvent={onEvent} />)
    act(() => { screen.getByText('complete').click() })
    expect(onEvent.mock.calls[0]?.[0]?.weight).toBe(25)
  })

  test('no events fired when consent is null', () => {
    const onEvent = vi.fn()
    function NullConsentHarness() {
      const { track } = useRSPTracker({ nodeId: 'n', consent: null, onEvent })
      return <button onClick={track.pageView}>click</button>
    }
    render(<NullConsentHarness />)
    act(() => { screen.getByText('click').click() })
    expect(onEvent).not.toHaveBeenCalled()
  })
})

// ── useNodeSignal ─────────────────────────────────────────────────────────────

describe('useNodeSignal', () => {
  function SignalHarness({ onBurn = vi.fn() }: { onBurn?: ReturnType<typeof vi.fn> }) {
    const { signal, push, display } = useNodeSignal({
      nodeId: 'node-test',
      signalWindowMinutes: 60,
      onBurn,
    })
    const event: RSPNormalisedEvent = {
      nodeId: 'node-test',
      nodeType: 'lesson',
      eventType: 'activeMinute',
      weight: 10,
      signalWindowMinutes: 60,
      timestamp: new Date().toISOString(),
      sourceStatus: 'normalised',
    }
    return (
      <div>
        <span data-testid="state">{signal?.state ?? 'null'}</span>
        <span data-testid="display-label">{display?.state.label ?? 'null'}</span>
        <button onClick={() => push(event)}>push</button>
      </div>
    )
  }

  test('signal is null before any events', () => {
    render(<SignalHarness />)
    expect(screen.getByTestId('state').textContent).toBe('null')
  })

  test('signal updates after event is pushed', async () => {
    render(<SignalHarness />)
    await act(async () => { screen.getByText('push').click() })
    expect(screen.getByTestId('state').textContent).not.toBe('null')
  })

  test('display label is populated after event', async () => {
    render(<SignalHarness />)
    await act(async () => { screen.getByText('push').click() })
    expect(screen.getByTestId('display-label').textContent).not.toBe('null')
  })

  test('ignores events for different nodeId', async () => {
    function WrongNodeHarness() {
      const { signal, push } = useNodeSignal({ nodeId: 'node-test' })
      const event: RSPNormalisedEvent = {
        nodeId: 'different-node',
        nodeType: 'lesson',
        eventType: 'pageView',
        weight: 1,
        signalWindowMinutes: 60,
        timestamp: new Date().toISOString(),
        sourceStatus: 'normalised',
      }
      return (
        <div>
          <span data-testid="state">{signal?.state ?? 'null'}</span>
          <button onClick={() => push(event)}>push</button>
        </div>
      )
    }
    render(<WrongNodeHarness />)
    await act(async () => { screen.getByText('push').click() })
    expect(screen.getByTestId('state').textContent).toBe('null')
  })
})

// ── useRSPPipeline ────────────────────────────────────────────────────────────

describe('useRSPPipeline', () => {
  function PipelineHarness() {
    const { track, signal, isTracking } = useRSPPipeline({
      nodeId: 'node-test',
      consent: validConsent,
      nodeType: 'lesson',
    })
    return (
      <div>
        <span data-testid="tracking">{isTracking ? 'yes' : 'no'}</span>
        <span data-testid="state">{signal?.state ?? 'null'}</span>
        <button onClick={track.activeMinute}>active</button>
      </div>
    )
  }

  test('pipeline connects tracker to signal', async () => {
    render(<PipelineHarness />)
    expect(screen.getByTestId('tracking').textContent).toBe('yes')
    await act(async () => { screen.getByText('active').click() })
    expect(screen.getByTestId('state').textContent).not.toBe('null')
  })
})

// ── SignalCard ────────────────────────────────────────────────────────────────

describe('SignalCard', () => {
  test('renders state label', () => {
    render(<SignalCard signal={mockSignal} />)
    expect(screen.getByText('Active')).toBeTruthy()
  })

  test('renders trend', () => {
    render(<SignalCard signal={mockSignal} showTrend />)
    expect(screen.getByText('↑ Rising')).toBeTruthy()
  })

  test('renders suggested action', () => {
    render(<SignalCard signal={mockSignal} showAction />)
    expect(screen.getByText('No intervention needed.')).toBeTruthy()
  })

  test('hides action when showAction=false', () => {
    render(<SignalCard signal={mockSignal} showAction={false} />)
    expect(screen.queryByText('No intervention needed.')).toBeNull()
  })

  test('has correct aria role', () => {
    render(<SignalCard signal={mockSignal} />)
    expect(screen.getByRole('status')).toBeTruthy()
  })

  test('applies data-state attribute', () => {
    const { container } = render(<SignalCard signal={mockSignal} />)
    expect(container.querySelector('[data-state="active"]')).toBeTruthy()
  })
})

// ── SignalGrid ────────────────────────────────────────────────────────────────

describe('SignalGrid', () => {
  const signals = [mockSignal, frictionSignal, supportSignal, resonantSignal]

  test('renders all signals', () => {
    render(<SignalGrid signals={signals} />)
    expect(screen.getAllByRole('listitem').length).toBe(4)
  })

  test('attentionOnly filters to friction and support_needed', () => {
    render(<SignalGrid signals={signals} attentionOnly />)
    expect(screen.getAllByRole('listitem').length).toBe(2)
  })

  test('filterStates limits displayed signals', () => {
    render(<SignalGrid signals={signals} filterStates={['resonant']} />)
    expect(screen.getAllByRole('listitem').length).toBe(1)
  })

  test('shows empty message when no signals match', () => {
    render(<SignalGrid signals={[]} emptyMessage="Nothing here" />)
    expect(screen.getByText('Nothing here')).toBeTruthy()
  })
})

// ── AttentionAlert ────────────────────────────────────────────────────────────

describe('AttentionAlert', () => {
  test('renders nothing when no attention signals', () => {
    const { container } = render(<AttentionAlert signals={[resonantSignal, mockSignal]} />)
    expect(container.firstChild).toBeNull()
  })

  test('renders alert when attention signals present', () => {
    render(<AttentionAlert signals={[supportSignal, frictionSignal]} />)
    expect(screen.getByRole('alert')).toBeTruthy()
  })

  test('shows correct count', () => {
    render(<AttentionAlert signals={[supportSignal, frictionSignal]} />)
    expect(screen.getByText('2 nodes')).toBeTruthy()
  })

  test('calls onDismiss when dismiss clicked', () => {
    const onDismiss = vi.fn()
    render(<AttentionAlert signals={[supportSignal]} onDismiss={onDismiss} />)
    screen.getByText('Dismiss').click()
    expect(onDismiss).toHaveBeenCalledWith('node-support')
  })
})

// ── StateBadge ────────────────────────────────────────────────────────────────

describe('StateBadge', () => {
  test('renders state label', () => {
    render(<StateBadge state="resonant" />)
    expect(screen.getByText('Resonant')).toBeTruthy()
  })

  test('dot variant renders with title not text', () => {
    const { container } = render(<StateBadge state="friction" variant="dot" />)
    const el = container.querySelector('[title="Friction"]')
    expect(el).toBeTruthy()
  })

  test('applies colour class', () => {
    const { container } = render(<StateBadge state="support_needed" />)
    expect(container.querySelector('.rsp-critical')).toBeTruthy()
  })
})
