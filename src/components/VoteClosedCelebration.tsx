import './VoteClosedCelebration.css'

const COLORS = ['#EF7952', '#F49537', '#DF413A', '#0B0B0B', '#FFFFFF']

// Positions figées : un Math.random() donnerait un HTML serveur différent du
// premier rendu client et casserait l'hydratation.
const PIECES = Array.from({ length: 24 }, (_, index) => ({
  left: `${(index * 4.17 + (index % 3) * 1.6) % 100}%`,
  delay: `${((index * 7) % 32) / 10}s`,
  duration: `${2.6 + ((index * 3) % 12) / 10}s`,
  color: COLORS[index % COLORS.length],
}))

export function VoteClosedCelebration() {
  return (
    <div
      className="awac-celebration rounded-2xl bg-awac-dark px-6 py-8 text-white shadow-lg"
      role="status"
    >
      <div className="awac-celebration-confetti" aria-hidden="true">
        {PIECES.map((piece, index) => (
          <span
            key={index}
            className="awac-confetti-piece"
            style={{
              left: piece.left,
              animationDelay: piece.delay,
              animationDuration: piece.duration,
              backgroundColor: piece.color,
            }}
          />
        ))}
      </div>

      <div className="relative space-y-3">
        <p className="text-3xl" aria-hidden="true">
          🎉
        </p>
        <p className="font-heading text-2xl font-black uppercase tracking-tight md:text-3xl">
          Les votes sont clos.
        </p>
        <p className="font-heading text-sm font-black uppercase tracking-widest text-awac-secondary">
          Félicitations à toutes et à tous les candidat·e·s !
        </p>
        <p className="mx-auto max-w-md font-sans text-sm text-white/70">
          Merci à chaque votant·e du Mono. Le classement est désormais définitif : rendez-vous pour
          l&apos;annonce officielle des lauréat·e·s.
        </p>
      </div>
    </div>
  )
}
