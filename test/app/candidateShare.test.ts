import { describe, expect, it } from 'vitest'
import {
  buildCandidateShareUrl,
  buildFacebookShareUrl,
  buildShareMessage,
  buildShareText,
  buildWhatsAppShareUrl,
  getFirstName,
  resolveSiteOrigin,
  shouldAutoOpenVote,
} from '../../src/utils/candidateShare'

describe('buildCandidateShareUrl', () => {
  it("construit l'URL absolue avec le param vote=1", () => {
    expect(buildCandidateShareUrl('https://awac.example', 'abc-123')).toBe(
      'https://awac.example/candidat/abc-123?vote=1',
    )
  })

  it("encode un id contenant des caracteres speciaux", () => {
    expect(buildCandidateShareUrl('https://awac.example', 'a b/c')).toBe(
      'https://awac.example/candidat/a%20b%2Fc?vote=1',
    )
  })
})

describe('buildShareText / buildShareMessage', () => {
  it("produit le texte d'appel au vote avec le nom complet", () => {
    expect(buildShareText('Afi Kokou')).toBe(
      'Vote pour Afi Kokou aux Awards des Couturier·e·s du Mono 🧵✨',
    )
  })

  it("accole le lien au texte", () => {
    expect(buildShareMessage('Afi Kokou', 'https://awac.example/candidat/1?vote=1')).toBe(
      'Vote pour Afi Kokou aux Awards des Couturier·e·s du Mono 🧵✨ https://awac.example/candidat/1?vote=1',
    )
  })
})

describe('buildWhatsAppShareUrl', () => {
  it("encode le message complet pour wa.me", () => {
    const url = buildWhatsAppShareUrl('Vote pour Afi & Co https://x.test/c/1?vote=1')
    expect(url).toBe(
      'https://wa.me/?text=Vote%20pour%20Afi%20%26%20Co%20https%3A%2F%2Fx.test%2Fc%2F1%3Fvote%3D1',
    )
  })
})

describe('buildFacebookShareUrl', () => {
  it("encode l'URL pour le sharer Facebook", () => {
    expect(buildFacebookShareUrl('https://x.test/candidat/1?vote=1')).toBe(
      'https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fx.test%2Fcandidat%2F1%3Fvote%3D1',
    )
  })
})

describe('shouldAutoOpenVote', () => {
  it('vrai uniquement pour vote=1', () => {
    expect(shouldAutoOpenVote({ vote: '1' })).toBe(true)
  })

  it('faux pour autre valeur, absence, ou tableau', () => {
    expect(shouldAutoOpenVote({})).toBe(false)
    expect(shouldAutoOpenVote({ vote: '2' })).toBe(false)
    expect(shouldAutoOpenVote({ vote: ['1'] })).toBe(false)
  })
})

describe('getFirstName', () => {
  it('retourne le premier mot du nom complet', () => {
    expect(getFirstName('Awa Bocovo')).toBe('Awa')
  })

  it('gère nom vide ou simple', () => {
    expect(getFirstName('')).toBe('')
    expect(getFirstName('Awa')).toBe('Awa')
  })
})

describe('resolveSiteOrigin', () => {
  it('préfère l’URL canonique configurée', () => {
    expect(resolveSiteOrigin('https://awacmono.com', 'https://xxx.up.railway.app')).toBe(
      'https://awacmono.com',
    )
  })

  it('retire les slashs finaux de l’URL configurée', () => {
    expect(resolveSiteOrigin('https://awacmono.com//', 'https://x.test')).toBe(
      'https://awacmono.com',
    )
  })

  it('retombe sur l’origine de la requête si non configurée', () => {
    expect(resolveSiteOrigin('', 'http://localhost:3000')).toBe('http://localhost:3000')
    expect(resolveSiteOrigin('   ', 'http://localhost:3000')).toBe('http://localhost:3000')
  })
})
