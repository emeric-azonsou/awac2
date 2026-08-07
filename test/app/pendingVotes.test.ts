import { describe, expect, it } from 'vitest'
import {
  listPendingVotes,
  rememberPendingVote,
  forgetPendingVote,
} from '../../src/utils/pendingVotes'
function makeStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial))
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
  } as Storage
}
const entry = { receipt_code: 'AWAC-1700000000000-AB12CD34', candidate_name: 'Awa Bocovo' }
describe('pendingVotes (localStorage)', () => {
  it('mémorise puis liste un vote en attente', () => {
    const storage = makeStorage()
    rememberPendingVote(entry, storage)
    expect(listPendingVotes(storage)).toEqual([entry])
  })
  it('ne duplique pas un même code reçu', () => {
    const storage = makeStorage()
    rememberPendingVote(entry, storage)
    rememberPendingVote(entry, storage)
    expect(listPendingVotes(storage)).toHaveLength(1)
  })
  it('oublie un vote par son code', () => {
    const storage = makeStorage()
    rememberPendingVote(entry, storage)
    forgetPendingVote(entry.receipt_code, storage)
    expect(listPendingVotes(storage)).toEqual([])
  })
  it('survit à un contenu corrompu', () => {
    const storage = makeStorage({ awac_pending_votes: '{pas-du-json' })
    expect(listPendingVotes(storage)).toEqual([])
    rememberPendingVote(entry, storage)
    expect(listPendingVotes(storage)).toHaveLength(1)
  })
  it('survit à un storage indisponible (mode privé)', () => {
    const broken = {
      getItem: () => {
        throw new Error('denied')
      },
      setItem: () => {
        throw new Error('denied')
      },
      removeItem: () => {
        throw new Error('denied')
      },
    } as unknown as Storage
    expect(listPendingVotes(broken)).toEqual([])
    expect(() => rememberPendingVote(entry, broken)).not.toThrow()
    expect(() => forgetPendingVote(entry.receipt_code, broken)).not.toThrow()
  })
})
