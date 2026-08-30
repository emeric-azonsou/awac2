// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useVotePricing } from '../../src/hooks/useVotePricing'

const { getVotePricing } = vi.hoisted(() => ({ getVotePricing: vi.fn() }))

vi.mock('../../src/utils/voteService', () => ({
  voteService: { getVotePricing },
}))

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe('useVotePricing — horloge serveur', () => {
  it("reste ouvert quand l'appareil est en avance mais le serveur est avant la clôture", async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2030-01-01T00:00:00Z'))
    getVotePricing.mockResolvedValue({
      vote_unit_price: 100,
      currency: 'XOF',
      server_time: '2026-08-14T22:59:58.000Z',
      voting_closed: false,
    })
    const { result } = renderHook(() => useVotePricing())

    await act(async () => {
      await result.current.loadVotePricing()
    })

    expect(result.current.votingClosed).toBe(false)
  })

  it('se ferme immédiatement quand le serveur annonce la clôture', async () => {
    getVotePricing.mockResolvedValue({
      vote_unit_price: 100,
      currency: 'XOF',
      server_time: '2026-08-14T22:59:59.000Z',
      voting_closed: true,
    })
    const { result } = renderHook(() => useVotePricing())

    await act(async () => {
      await result.current.loadVotePricing()
    })

    expect(result.current.votingClosed).toBe(true)
  })
})
