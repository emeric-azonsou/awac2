// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FinalWarning } from '../../src/components/FinalWarning'

// Le déclenchement au scroll dépend de scrollHeight/innerHeight, que jsdom
// laisse à zéro par défaut : on les fixe pour simuler une page longue.
function setScrollGeometry({ scrollHeight = 3000, innerHeight = 800, scrollY = 0 }) {
  Object.defineProperty(document.documentElement, 'scrollHeight', {
    configurable: true,
    value: scrollHeight,
  })
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: innerHeight })
  Object.defineProperty(window, 'scrollY', { configurable: true, value: scrollY, writable: true })
}

function scrollTo(scrollY: number) {
  act(() => {
    Object.defineProperty(window, 'scrollY', { configurable: true, value: scrollY })
    window.dispatchEvent(new Event('scroll'))
  })
}

// jsdom n'implémente pas IntersectionObserver : on simule celui que le
// composant utilise pour savoir si la grille des candidats est visible.
let ioCallback: IntersectionObserverCallback | null = null
class FakeIntersectionObserver {
  constructor(cb: IntersectionObserverCallback) {
    ioCallback = cb
  }
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return []
  }
  root = null
  rootMargin = ''
  thresholds: number[] = []
}

function setCandidatesInView(isIntersecting: boolean) {
  // Ne PAS instancier FakeIntersectionObserver ici : son constructeur
  // réécrit `ioCallback`, ce qui écraserait celui capturé par le composant
  // avant même l'appel ci-dessous.
  const callback = ioCallback
  act(() => {
    callback?.([{ isIntersecting } as IntersectionObserverEntry], {} as IntersectionObserver)
  })
}

describe('FinalWarning', () => {
  beforeEach(() => {
    sessionStorage.clear()
    setScrollGeometry({})
    ioCallback = null
    global.IntersectionObserver = FakeIntersectionObserver as unknown as typeof IntersectionObserver
    const candidats = document.createElement('div')
    candidats.id = 'candidats'
    document.body.appendChild(candidats)
  })

  afterEach(() => {
    cleanup()
    document.getElementById('candidats')?.remove()
  })

  it("ne s'affiche pas avant que le visiteur ait suffisamment scrollé", () => {
    render(<FinalWarning />)
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('apparaît en popup une fois le seuil de scroll dépassé', () => {
    render(<FinalWarning />)
    scrollTo(2200 * 0.4) // dépasse largement le ratio de déclenchement
    expect(screen.getByRole('alert')).toBeDefined()
  })

  it('le texte est resserré : le paragraphe Mobile Money a été retiré', () => {
    render(<FinalWarning />)
    scrollTo(2200 * 0.4)
    expect(screen.getByRole('alert')).toBeDefined()
    expect(screen.queryByText(/Mobile Money met parfois plusieurs minutes/)).toBeNull()
  })

  it('se ferme au clic sur le bouton fermer et ne revient pas après un nouveau montage', async () => {
    const user = userEvent.setup({ delay: null })
    const { unmount } = render(<FinalWarning />)
    scrollTo(2200 * 0.4)
    await user.click(screen.getByRole('button', { name: /fermer/i }))
    expect(screen.queryByRole('alert')).toBeNull()

    unmount()
    render(<FinalWarning />)
    scrollTo(2200 * 0.4)
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it("se cache dès que la grille des candidats entre en vue, pour ne jamais la recouvrir", () => {
    render(<FinalWarning />)
    scrollTo(2200 * 0.4)
    expect(screen.getByRole('alert')).toBeDefined()

    setCandidatesInView(true)
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('réapparaît si on remonte au-dessus de la grille des candidats (pas un dismiss définitif)', () => {
    render(<FinalWarning />)
    scrollTo(2200 * 0.4)
    setCandidatesInView(true)
    expect(screen.queryByRole('alert')).toBeNull()

    setCandidatesInView(false)
    expect(screen.getByRole('alert')).toBeDefined()
  })
})
