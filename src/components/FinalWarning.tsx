import { useEffect, useState } from 'react'
import { timeRemaining, type TimeRemaining } from '../utils/countdown'
import './FinalWarning.css'

// Un seuil sous lequel le ton durcit : à moins de 48 h, le message cesse de
// parler de « derniers jours » et parle d'heures.
const CRITICAL_HOURS = 48

// Se déclenche après un léger scroll délibéré. Un seuil fixe en pixels, pas
// un ratio de la hauteur totale ni du viewport : sur cette page, la grille
// des candidats commence tôt (juste après le Hero) et peut compter
// n'importe quel nombre de fiches, donc n'importe quelle longueur totale —
// un seuil proportionnel se ferait rattraper par la grille et déclencherait
// le popup en plein dedans. 250px est franchi bien avant la grille sur tout
// viewport raisonnable ; l'IntersectionObserver sur #candidats prend ensuite
// le relais pour ne jamais la recouvrir une fois dedans.
const SCROLL_TRIGGER_PX = 250
const DISMISS_KEY = 'awac-final-warning-dismissed'

function hasCrossedTrigger(): boolean {
  return window.scrollY > SCROLL_TRIGGER_PX
}

export function FinalWarning() {
  const [remaining, setRemaining] = useState<TimeRemaining | null>(null)
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  // Le popup ne doit jamais recouvrir la grille des candidats : dès qu'elle
  // entre dans le viewport, on s'efface — pas un dismiss, juste une éclipse
  // le temps que l'utilisateur soit dessus.
  const [candidatesInView, setCandidatesInView] = useState(false)

  useEffect(() => {
    setRemaining(timeRemaining())
    const timer = setInterval(() => setRemaining(timeRemaining()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (sessionStorage.getItem(DISMISS_KEY) === '1') {
      setDismissed(true)
      return
    }
    const checkScroll = () => {
      if (hasCrossedTrigger()) {
        setVisible(true)
        window.removeEventListener('scroll', checkScroll)
      }
    }
    checkScroll()
    window.addEventListener('scroll', checkScroll, { passive: true })
    return () => window.removeEventListener('scroll', checkScroll)
  }, [])

  useEffect(() => {
    const candidats = document.getElementById('candidats')
    if (!candidats) return
    const observer = new IntersectionObserver(
      ([entry]) => entry && setCandidatesInView(entry.isIntersecting),
      { rootMargin: '0px 0px -15% 0px' },
    )
    observer.observe(candidats)
    return () => observer.disconnect()
  }, [])

  const close = () => {
    setVisible(false)
    setDismissed(true)
    sessionStorage.setItem(DISMISS_KEY, '1')
  }

  if (remaining?.expired) return null
  if (dismissed || !visible || candidatesInView) return null

  const totalHours = remaining ? remaining.days * 24 + remaining.hours : null
  const critical = totalHours !== null && totalHours < CRITICAL_HOURS

  return (
    <div className="fixed inset-x-4 bottom-4 z-50 md:inset-x-auto md:right-6 md:bottom-6 md:w-full md:max-w-md animate-[final-warning-in_0.35s_ease-out]">
      <section
        className="relative rounded-[2rem_0_2rem_0] border-2 border-awac-accent/30 bg-white shadow-[0_20px_50px_rgba(223,65,58,0.25)] overflow-hidden"
        role="alert"
      >
        <button
          type="button"
          onClick={close}
          aria-label="Fermer l'avertissement"
          className="absolute top-2.5 right-2.5 z-10 text-white/90 hover:text-white"
        >
          <span className="material-icons text-lg" aria-hidden="true">
            close
          </span>
        </button>

        <div className="bg-awac-accent px-6 py-3 flex items-center justify-center gap-2.5 text-white">
          <span className="material-icons text-lg" aria-hidden="true">
            warning
          </span>
          <span className="font-heading font-black text-[11px] md:text-xs tracking-[0.25em] uppercase">
            {critical ? 'Dernières heures' : 'Avertissement — dernière ligne droite'}
          </span>
        </div>

        <div className="px-6 py-6 space-y-4 text-center">
          <h3 className="text-gray-900 font-heading font-black text-xl md:text-2xl uppercase tracking-tight leading-none">
            {critical
              ? 'Il ne reste que quelques heures'
              : 'Après le 14 août, plus aucun vote ne comptera'}
          </h3>

          <p className="text-gray-600 font-sans text-sm leading-relaxed">
            À <span className="font-bold text-gray-900">23h59 précises</span>, le compteur se fige.
            Le classement devient définitif, sans recours possible.{' '}
            <span className="font-bold text-awac-accent">
              Les écarts se jouent souvent à quelques voix.
            </span>
          </p>

          <div className="pt-1">
            <a href="#candidats" onClick={close} className="btn-awac text-xs py-3.5 px-8 gap-3">
              <span className="material-icons text-lg">how_to_vote</span>
              Voter maintenant, pas demain
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
