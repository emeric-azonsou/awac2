import { useEffect, useState } from 'react'
import { timeRemaining, type TimeRemaining } from '../utils/countdown'
import './UrgencyBanner.css'

const MESSAGE =
  "CHAQUE HEURE QUI PASSE, UN·E AUTRE CANDIDAT·E PREND DE L'AVANCE — UN VOTE AUJOURD'HUI VAUT MIEUX QU'UN REGRET DEMAIN."
const DEADLINE_LABEL = 'CLÔTURE LE 14 AOÛT À 23H59'

const UNITS: { key: keyof Omit<TimeRemaining, 'expired'>; label: string }[] = [
  { key: 'days', label: 'JOURS' },
  { key: 'hours', label: 'H' },
  { key: 'minutes', label: 'MIN' },
  { key: 'seconds', label: 'SEC' },
]

export function UrgencyBanner() {
  // Le rendu serveur et le premier rendu client doivent produire le même HTML,
  // sinon React signale une divergence d'hydratation. Le décompte ne démarre
  // donc qu'après le montage.
  const [remaining, setRemaining] = useState<TimeRemaining | null>(null)

  useEffect(() => {
    setRemaining(timeRemaining())
    const timer = setInterval(() => setRemaining(timeRemaining()), 1000)
    return () => clearInterval(timer)
  }, [])

  if (remaining?.expired) {
    return (
      <div className="bg-awac-dark text-white text-center py-3 px-4" role="status">
        <span className="font-heading font-black text-xs md:text-sm tracking-widest uppercase">
          Les votes sont clos. Le classement est définitif.
        </span>
      </div>
    )
  }

  const scrolling = `${MESSAGE}  •  ${DEADLINE_LABEL}  •  `

  return (
    <div className="awac-urgency relative z-40 flex items-stretch overflow-hidden text-white">
      <div className="flex-1 min-w-0 overflow-hidden py-2.5">
        <div className="awac-urgency-track">
          {/* Deux copies : la seconde comble le vide laissé par la première
              pendant qu'elle sort de l'écran. */}
          <span className="whitespace-nowrap font-heading font-black text-[11px] md:text-sm tracking-wider px-4">
            {scrolling.repeat(2)}
          </span>
          <span
            className="whitespace-nowrap font-heading font-black text-[11px] md:text-sm tracking-wider px-4"
            aria-hidden="true"
          >
            {scrolling.repeat(2)}
          </span>
        </div>
      </div>

      <div
        className="shrink-0 flex items-center gap-1.5 md:gap-5 bg-black/20 px-2 md:px-6"
        role="timer"
        aria-live="off"
        aria-label={
          remaining
            ? `Il reste ${remaining.days} jours, ${remaining.hours} heures et ${remaining.minutes} minutes pour voter`
            : 'Décompte avant la clôture des votes'
        }
      >
        {UNITS.map((unit, index) => (
          <div key={unit.key} className="flex items-center gap-1.5 md:gap-5">
            <div className="text-center leading-none">
              <div className="font-heading font-black text-base md:text-2xl tabular-nums">
                {remaining ? String(remaining[unit.key]).padStart(2, '0') : '--'}
              </div>
              <div className="text-[7px] md:text-[9px] font-bold tracking-[0.1em] md:tracking-[0.2em] opacity-80 mt-1">
                {unit.label}
              </div>
            </div>
            {index < UNITS.length - 1 ? (
              <span className="awac-urgency-pulse font-heading font-black text-lg md:text-2xl opacity-60">
                :
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}
