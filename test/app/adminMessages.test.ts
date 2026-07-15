import { describe, expect, it } from 'vitest'
import { getCandidateSavedMessage } from '../../app/utils/adminMessages'

describe('getCandidateSavedMessage (régression UQA-002)', () => {
  it('messages pour created et updated', () => {
    expect(getCandidateSavedMessage('created')).toBe('Candidat créé.')
    expect(getCandidateSavedMessage('updated')).toBe('Modifications enregistrées.')
    expect(getCandidateSavedMessage('deleted')).toBe('Candidat supprimé.')
  })

  it('fallback vide pour valeur inconnue ou non-string', () => {
    expect(getCandidateSavedMessage('x')).toBe('')
    expect(getCandidateSavedMessage(undefined)).toBe('')
    expect(getCandidateSavedMessage(['created'])).toBe('')
  })
})
