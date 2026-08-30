// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const getCountriesMock = vi.fn()
const getOperatorsMock = vi.fn()
const submitVoteMock = vi.fn()

vi.mock('../../src/utils/voteService', () => ({
  voteService: {
    getCountries: () => getCountriesMock(),
    getOperators: (country: string) => getOperatorsMock(country),
    submitVote: (payload: unknown) => submitVoteMock(payload),
    getVoteStatus: vi.fn(),
  },
}))

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}))

const CANDIDATE = {
  id: 'c-1',
  full_name: 'KPATCHO J. Huriel',
  atelier: null,
  commune: null,
  profile_photo_url: null,
  vote_count: 232,
  category: 'homme',
}

beforeEach(() => {
  getCountriesMock.mockReset().mockResolvedValue({
    countries: [
      {
        country_code: 'BJ',
        country_name: 'Bénin',
        prefix: '+229',
        currency: { code: 'XOF', name: 'Franc CFA' },
      },
    ],
  })
  // Deux opérateurs : avec un seul, le composant le présélectionne et le champ
  // ne peut plus être laissé vide, ce qui masquerait le défaut testé ici.
  getOperatorsMock.mockReset().mockResolvedValue({
    operators: [
      { slug: 'mtn_bj', name: 'MTN Bénin', otp_required: false },
      { slug: 'moov_bj', name: 'Moov Bénin', otp_required: false },
    ],
  })
  submitVoteMock.mockReset()
})

afterEach(cleanup)

describe('VoteModal — validation des champs obligatoires', () => {
  it('affiche le message français quand on valide avec des champs vides', async () => {
    const { VoteModal } = await import('../../src/components/VoteModal')
    render(
      <VoteModal
        candidate={CANDIDATE}
        unitPrice={100}
        onClose={vi.fn()}
        onVoted={vi.fn()}
      />,
    )

    await waitFor(() => expect(screen.getByRole('option', { name: 'MTN Bénin' })).toBeDefined())

    await userEvent.click(screen.getByRole('button', { name: 'Voter' }))

    await waitFor(() =>
      expect(screen.getByText('Veuillez remplir tous les champs obligatoires.')).toBeDefined(),
    )
    expect(submitVoteMock).not.toHaveBeenCalled()
  })

  it("n'appelle pas le service quand seul le téléphone manque", async () => {
    const { VoteModal } = await import('../../src/components/VoteModal')
    render(
      <VoteModal
        candidate={CANDIDATE}
        unitPrice={100}
        onClose={vi.fn()}
        onVoted={vi.fn()}
      />,
    )

    await waitFor(() => expect(screen.getByRole('option', { name: 'MTN Bénin' })).toBeDefined())

    const selects = screen.getAllByRole('combobox')
    const operatorSelect = selects[1]
    if (!operatorSelect) throw new Error('select opérateur introuvable')
    await userEvent.selectOptions(operatorSelect, 'mtn_bj')

    await userEvent.click(screen.getByRole('button', { name: 'Voter' }))

    await waitFor(() =>
      expect(screen.getByText('Veuillez remplir tous les champs obligatoires.')).toBeDefined(),
    )
    expect(submitVoteMock).not.toHaveBeenCalled()
  })
})
