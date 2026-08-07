import { useEffect, useState } from 'react'
import { timeRemaining, type TimeRemaining } from '../utils/countdown'

// Un seuil sous lequel le ton durcit : à moins de 48 h, le message cesse de
// parler de « derniers jours » et parle d'heures.
const CRITICAL_HOURS = 48

export function FinalWarning() {
  const [remaining, setRemaining] = useState<TimeRemaining | null>(null)

  useEffect(() => {
    setRemaining(timeRemaining())
    const timer = setInterval(() => setRemaining(timeRemaining()), 1000)
    return () => clearInterval(timer)
  }, [])

  if (remaining?.expired) return null

  const totalHours = remaining ? remaining.days * 24 + remaining.hours : null
  const critical = totalHours !== null && totalHours < CRITICAL_HOURS

  return (
    <section
      className="max-w-3xl mx-auto mb-14 rounded-[2rem_0_2rem_0] border-2 border-awac-accent/30 bg-white shadow-[0_20px_50px_rgba(223,65,58,0.08)] overflow-hidden"
      role="alert"
    >
      <div className="bg-awac-accent px-6 py-3 flex items-center justify-center gap-2.5 text-white">
        <span className="material-icons text-lg" aria-hidden="true">
          warning
        </span>
        <span className="font-heading font-black text-[11px] md:text-xs tracking-[0.25em] uppercase">
          {critical ? 'Dernières heures' : 'Avertissement — dernière ligne droite'}
        </span>
      </div>

      <div className="px-6 md:px-10 py-8 space-y-5 text-center">
        <h3 className="text-gray-900 font-heading font-black text-2xl md:text-3xl uppercase tracking-tight leading-none">
          {critical
            ? 'Il ne reste que quelques heures'
            : 'Après le 14 août, plus aucun vote ne comptera'}
        </h3>

        <p className="text-gray-600 font-sans text-sm md:text-base leading-relaxed max-w-xl mx-auto">
          À <span className="font-bold text-gray-900">23h59 précises</span>, le compteur se fige.
          Le classement devient définitif, et il ne pourra plus jamais être modifié — ni par un
          vote de dernière minute, ni par un recours.{' '}
          <span className="font-bold text-awac-accent">
            Les écarts se jouent souvent à quelques voix.
          </span>
        </p>

        <p className="text-gray-500 font-sans text-xs md:text-sm max-w-lg mx-auto">
          Un paiement Mobile Money met parfois plusieurs minutes à être confirmé. Attendre la
          dernière heure, c'est risquer que votre vote arrive après la clôture.
        </p>

        <div className="pt-2">
          <a href="#candidats" className="btn-awac text-xs py-4 px-10 gap-3">
            <span className="material-icons text-lg">how_to_vote</span>
            Voter maintenant, pas demain
          </a>
        </div>
      </div>
    </section>
  )
}
