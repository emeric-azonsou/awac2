# Design

Système visuel du site public AWAC MONO, capturé depuis le code existant (Tailwind + composants vitrine). La vitrine est stable : hériter de ces règles, ne pas les réinventer.

## Color

| Token | Valeur | Usage |
|---|---|---|
| `awac-primary` | `#EF7952` | Orange signature — CTA, accents, hover, sélection (`selection:bg-awac-primary/10`) |
| `awac-secondary` | `#F49537` | Orange doré — dégradés de CTA (`from-awac-primary to-awac-accent`) |
| `awac-accent` | `#DF413A` | Rouge brique — fin de dégradés, fonds teintés (`bg-awac-accent/10`) |
| `awac-dark` | `#0B0B0B` | Quasi-noir — boutons sombres, footer |
| Fond page | `#F9F8F6` | Sections claires |
| Texte | `text-gray-900` (titres), `text-gray-500` (courant) | |

Stratégie : restrained — neutres clairs + un accent orange qui porte l'identité. Podium : or `#FFD700`, argent `#C0C0C0`, bronze `#CD7F32` (bordures + badges des 3 premiers).

## Typography

- **Titres** : Montserrat (`font-heading`), graisse black (900), `uppercase`, `tracking-tight`, tailles 4xl–6xl.
- **Courant** : Open Sans (`font-sans`), 300–700, `text-sm`/`text-base`.
- **Micro-labels** : 10–11px, `font-black`, `tracking-widest`/`tracking-[0.4em]`, uppercase.

## Components

- **Carte candidat** : fond blanc, coins asymétriques `rounded-[2.5rem_0_2.5rem_0]`, photo 380px `object-cover object-top`, badge N° en pastille `rounded-full` noir/blur en haut à gauche, hover `-translate-y-1` + zoom image 1.05.
- **Boutons CTA** : dégradé `from-awac-primary to-awac-accent` (via `before:`), texte 11px black tracking-widest uppercase, `rounded-xl`, icône Material Icons, `active:scale-[0.98]`.
- **Boutons secondaires** : bordure `border-gray-200`, texte gris, `rounded-xl`, hover `bg-gray-50`.
- **Modals** : overlay `bg-black/50 backdrop-blur-sm`, panneau `bg-white/95 backdrop-blur-xl rounded-3xl`, entrée `animate-slide-up` (0.25s ease-out).
- **Inputs** : `rounded-xl border-gray-200`, focus `border-awac-primary` + ring `awac-primary/20`.

## Layout

- Conteneur : `container mx-auto px-6 max-w-6xl`.
- Sections : `py-24 md:py-32`, séparées par `border-t border-gray-100`.
- Grilles candidats : 1 / 2 / 3 colonnes (`md`/`lg`), `gap-12`.

## Motion

- Entrées au scroll : `IntersectionObserver` → opacity + translate-y, durée 0.7s, délais échelonnés par index (`0.1 + i × 0.08s`).
- Cartes : `cardEntry` 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) — easing signature existant de la vitrine (assumé).
- Icônes/badges : scale + rotation légère à l'apparition.
- À respecter sur toute nouvelle surface : `@media (prefers-reduced-motion: reduce)` → transitions instantanées.

## Iconography

Material Icons (`<span class="material-icons">`) : `how_to_vote`, `close`, `check_circle`, `add`, `remove`.
