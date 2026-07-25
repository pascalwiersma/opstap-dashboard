import { describe, it, expect } from 'vitest'
import { computeFunnelSteps, computeActivationRate } from '../lib/marketing-calculations'

describe('computeFunnelSteps', () => {
  const events = ['install', 'account_created', 'verification_completed'] as const
  const labels = { install: 'Installs', account_created: 'Accounts', verification_completed: 'Verified' }

  it('telt unieke actors per stap en berekent conversiepercentages', () => {
    const rows = [
      { event_name: 'install', user_id: 'user-1', session_id: null },
      { event_name: 'install', user_id: 'user-2', session_id: null },
      { event_name: 'install', user_id: 'user-3', session_id: null },
      { event_name: 'install', user_id: 'user-4', session_id: null },
      { event_name: 'account_created', user_id: 'user-1', session_id: null },
      { event_name: 'account_created', user_id: 'user-2', session_id: null },
      { event_name: 'verification_completed', user_id: 'user-1', session_id: null },
    ]

    const steps = computeFunnelSteps(rows, events, labels)

    expect(steps).toEqual([
      { event: 'install', label: 'Installs', actors: 4, conversionFromFirst: 100, conversionFromPrevious: 100 },
      { event: 'account_created', label: 'Accounts', actors: 2, conversionFromFirst: 50, conversionFromPrevious: 50 },
      { event: 'verification_completed', label: 'Verified', actors: 1, conversionFromFirst: 25, conversionFromPrevious: 50 },
    ])
  })

  it('telt dubbele events van dezelfde user maar één keer', () => {
    const rows = [
      { event_name: 'install', user_id: 'user-1', session_id: null },
      { event_name: 'install', user_id: 'user-1', session_id: null },
      { event_name: 'install', user_id: 'user-1', session_id: null },
    ]

    const steps = computeFunnelSteps(rows, events, labels)
    expect(steps[0].actors).toBe(1)
  })

  it('gebruikt session_id als actor-sleutel voor anonieme (pre-login) events', () => {
    const rows = [
      { event_name: 'install', user_id: null, session_id: 'session-a' },
      { event_name: 'install', user_id: null, session_id: 'session-b' },
    ]

    const steps = computeFunnelSteps(rows, events, labels)
    expect(steps[0].actors).toBe(2)
  })

  it('negeert rijen zonder user_id én zonder session_id', () => {
    const rows = [
      { event_name: 'install', user_id: null, session_id: null },
      { event_name: 'install', user_id: 'user-1', session_id: null },
    ]

    const steps = computeFunnelSteps(rows, events, labels)
    expect(steps[0].actors).toBe(1)
  })

  it('geeft nullen terug bij lege input, zonder te crashen op delen door nul', () => {
    const steps = computeFunnelSteps([], events, labels)
    expect(steps).toEqual([
      { event: 'install', label: 'Installs', actors: 0, conversionFromFirst: 0, conversionFromPrevious: 100 },
      { event: 'account_created', label: 'Accounts', actors: 0, conversionFromFirst: 0, conversionFromPrevious: 0 },
      { event: 'verification_completed', label: 'Verified', actors: 0, conversionFromFirst: 0, conversionFromPrevious: 0 },
    ])
  })
})

describe('computeActivationRate', () => {
  const DAY_MS = 24 * 60 * 60 * 1000
  const day0 = '2026-01-01T00:00:00.000Z'
  const isoDaysAfter = (days: number) => new Date(new Date(day0).getTime() + days * DAY_MS).toISOString()

  it('telt een gebruiker als geactiveerd wanneer het target-event binnen het venster valt', () => {
    const referenceRows = [{ user_id: 'user-1', created_at: day0 }]
    const targetRows = [{ user_id: 'user-1', created_at: isoDaysAfter(3) }]

    expect(computeActivationRate(referenceRows, targetRows, 7)).toBe(100)
  })

  it('telt een gebruiker NIET als het target-event buiten het venster valt', () => {
    const referenceRows = [{ user_id: 'user-1', created_at: day0 }]
    const targetRows = [{ user_id: 'user-1', created_at: isoDaysAfter(10) }]

    expect(computeActivationRate(referenceRows, targetRows, 7)).toBe(0)
  })

  it('telt een gebruiker NIET zonder enig target-event', () => {
    const referenceRows = [{ user_id: 'user-1', created_at: day0 }]
    expect(computeActivationRate(referenceRows, [], 7)).toBe(0)
  })

  it('gebruikt het VROEGSTE reference-event bij meerdere per gebruiker', () => {
    const referenceRows = [
      { user_id: 'user-1', created_at: isoDaysAfter(5) },
      { user_id: 'user-1', created_at: day0 }, // eerdere, moet deze worden
    ]
    // Precies 7 dagen na day0 (het vroegste moment), dus nog net binnen venster.
    const targetRows = [{ user_id: 'user-1', created_at: isoDaysAfter(7) }]

    expect(computeActivationRate(referenceRows, targetRows, 7)).toBe(100)
  })

  it('rekent het venster inclusief de grens (exact windowDays later telt nog mee)', () => {
    const referenceRows = [{ user_id: 'user-1', created_at: day0 }]
    const targetRows = [{ user_id: 'user-1', created_at: isoDaysAfter(7) }]
    expect(computeActivationRate(referenceRows, targetRows, 7)).toBe(100)
  })

  it('berekent een correct percentage over een gemengde groep', () => {
    const referenceRows = [
      { user_id: 'user-1', created_at: day0 },
      { user_id: 'user-2', created_at: day0 },
      { user_id: 'user-3', created_at: day0 },
    ]
    const targetRows = [
      { user_id: 'user-1', created_at: isoDaysAfter(3) }, // binnen venster
      { user_id: 'user-2', created_at: isoDaysAfter(10) }, // buiten venster
      // user-3: geen target-event
    ]

    expect(computeActivationRate(referenceRows, targetRows, 7)).toBeCloseTo(33.3, 1)
  })

  it('negeert rijen zonder user_id', () => {
    const referenceRows = [{ user_id: null, created_at: day0 }]
    expect(computeActivationRate(referenceRows, [], 7)).toBe(0)
  })

  it('geeft 0 terug bij geen enkele reference-gebruiker', () => {
    expect(computeActivationRate([], [], 7)).toBe(0)
  })
})
