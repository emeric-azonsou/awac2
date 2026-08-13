// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { Vote } from '../../src/components/Vote'

const { loadVotePricing, hookState } = vi.hoisted(() => ({
  loadVotePricing: vi.fn(),
  hookState: { votingClosed: true },
}))

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, ...props }: { children: ReactNode }) => <a {...props}>{children}</a>,
}))

vi.mock('../../src/utils/voteService', () => ({
  voteService: {
    getCandidates: vi.fn().mockResolvedValue([
      {
        id: '6a3c0e1f-2b4d-4f5a-9c8e-1d2f3a4b5c6d',
        full_name: 'Candidate Test',
        category: 'homme',
        vote_count: 12,
        profile_photo_url: null,
      },
    ]),
  },
}))

vi.mock('../../src/hooks/useVotePricing', () => ({
  useVotePricing: () => ({
    unitPrice: 100,
    currency: 'FCFA',
    votingClosed: hookState.votingClosed,
    loadVotePricing,
  }),
}))

vi.mock('../../src/components/CandidateShareCompact', () => ({
  CandidateShareCompact: () => null,
}))

vi.mock('../../src/components/VoteModal', () => ({
  VoteModal: ({ candidate }: { candidate: { full_name: string } | null }) => (
    <div data-testid="vote-modal-state">{candidate?.full_name ?? 'closed'}</div>
  ),
}))

class FakeIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe('Vote — clôture', () => {
  beforeEach(() => {
    hookState.votingClosed = true
    global.IntersectionObserver = FakeIntersectionObserver as unknown as typeof IntersectionObserver
  })

  afterEach(() => {
    cleanup()
  })

  it('annonce la clôture et désactive chaque bouton de vote à la seconde limite', async () => {
    render(<Vote />)
    await act(async () => {
      await Promise.resolve()
    })

    expect(screen.getByText('Les votes sont clos.')).toBeDefined()
    expect(screen.getByRole('button', { name: 'VOTER' }).hasAttribute('disabled')).toBe(true)
  })

  it('ferme une modal ouverte lorsque la clôture est atteinte', async () => {
    hookState.votingClosed = false
    const { rerender } = render(<Vote />)
    await act(async () => {
      await Promise.resolve()
    })

    act(() => {
      screen.getByRole('button', { name: 'VOTER' }).click()
    })
    expect(screen.getByTestId('vote-modal-state').textContent).toBe('Candidate Test')

    await act(async () => {
      hookState.votingClosed = true
      rerender(<Vote />)
    })

    expect(screen.getByTestId('vote-modal-state').textContent).toBe('closed')
    expect(screen.getByRole('button', { name: 'VOTER' }).hasAttribute('disabled')).toBe(true)
  })
})
