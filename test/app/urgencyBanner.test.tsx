// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { UrgencyBanner } from '../../src/components/UrgencyBanner'

const css = readFileSync(resolve('src/components/UrgencyBanner.css'), 'utf8')

// Sur un téléphone, l'horloge et le message se partagent la même ligne. Les
// deux règles ci-dessous garantissent qu'il reste au message assez de largeur,
// et assez de temps, pour être lu — un fragment coupé en plein mot qui défile
// en deux secondes ne transmet pas l'échéance.
describe('UrgencyBanner — lisibilité du message sur écran étroit', () => {
  afterEach(cleanup)

  it("comprime l'horloge sur mobile et ne reprend de l'espace qu'à partir de md", () => {
    render(<UrgencyBanner />)
    const clock = screen.getByRole('timer')

    // Chaque classe compacte doit avoir son pendant `md:` : sans cela, la
    // compression fuiterait sur le rendu desktop, qui lui n'a pas le problème.
    for (const [compact, wide] of [
      ['gap-1.5', 'md:gap-5'],
      ['px-2', 'md:px-6'],
    ]) {
      expect(clock.className).toContain(compact)
      expect(clock.className).toContain(wide)
    }
  })

  it('ralentit le défilement sous le point de rupture md', () => {
    const base = /\.awac-urgency-track\s*\{[^}]*animation:[^;]*?([\d.]+)s/.exec(css)
    expect(base, 'durée de défilement de base introuvable').not.toBeNull()

    const override =
      /@media\s*\(max-width:[^)]*\)\s*\{\s*\.awac-urgency-track\s*\{[^}]*animation-duration:\s*([\d.]+)s/.exec(
        css,
      )
    expect(override, 'aucune règle ne ralentit la piste sur écran étroit').not.toBeNull()

    // Le message doit rester à l'écran nettement plus longtemps, pas
    // marginalement : on exige au moins le double du temps de lecture.
    expect(Number(override![1])).toBeGreaterThanOrEqual(2 * Number(base![1]))
  })
})
