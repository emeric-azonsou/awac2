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

// Le stockage de session lève dans un navigateur qui l'a désactivé (mode privé
// verrouillé, cookies tiers bloqués). L'avertissement doit se fermer quand même :
// on perd seulement la mémoire du dismiss, jamais l'interaction.
function readDismissed(): boolean {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

function rememberDismissed(): void {
  try {
    sessionStorage.setItem(DISMISS_KEY, '1')
  } catch {
    // Sans persistance, l'avertissement pourra revenir au prochain chargement.
  }
}

export function FinalWarning() {
  const [remaining, setRemaining] = useState<TimeRemaining | null>(null)
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  // Le popup ne doit jamais recouvrir la grille des candidats, ni ce qui vient
  // après elle. On s'efface donc dès qu'elle est atteinte et tant qu'on ne
  // repasse pas au-dessus — pas un dismiss, juste une éclipse.
  const [candidatesReached, setCandidatesReached] = useState(false)

  useEffect(() => {
    setRemaining(timeRemaining())
    const timer = setInterval(() => setRemaining(timeRemaining()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (readDismissed()) {
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
      ([entry]) => {
        if (!entry) return
        // `top < 0` : la grille est sortie par le haut, donc déjà dépassée.
        // Sans cette distinction, ne plus intersecter suffisait à faire
        // revenir le popup par-dessus Le Grand Prix et le footer.
        const passed = entry.boundingClientRect.top < 0
        setCandidatesReached(entry.isIntersecting || passed)
      },
      { rootMargin: '0px 0px -15% 0px' },
    )
    observer.observe(candidats)
    return () => observer.disconnect()
  }, [])

  const close = () => {
    setVisible(false)
    setDismissed(true)
    rememberDismissed()
  }

  if (remaining?.expired) return null
  if (dismissed || !visible || candidatesReached) return null

  const totalHours = remaining ? remaining.days * 24 + remaining.hours : null
  const critical = totalHours !== null && totalHours < CRITICAL_HOURS

  return (
    <div className="fixed inset-x-4 bottom-4 z-50 md:inset-x-auto md:right-6 md:bottom-6 md:w-full md:max-w-md animate-[final-warning-in_0.35s_ease-out]">
      {/* La hauteur est bornée au viewport moins la barre de navigation : sur un
          téléphone en paysage, la carte couvrait tout l'écran et rendait le
          bouton VOTER de la Navbar incliquable. */}
      <section
        className="relative rounded-[2rem_0_2rem_0] border-2 border-awac-accent/30 bg-white shadow-[0_20px_50px_rgba(223,65,58,0.25)] max-h-[calc(100vh-7rem)] overflow-y-auto"
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
              : 'Après le 19 août, plus aucun vote ne comptera'}
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
