import { useEffect, useRef, useState } from 'react'

const CARD_STAGGER_MS = 200
const CARD_COUNT = 3

const HIDDEN_CARD = 'opacity-0 translate-y-16'

export function Prix() {
  const headerRef = useRef<HTMLDivElement | null>(null)
  const podiumRef = useRef<HTMLDivElement | null>(null)
  const [headerVisible, setHeaderVisible] = useState(false)
  const [visibleCards, setVisibleCards] = useState<boolean[]>(() => Array(CARD_COUNT).fill(false))

  // La version Vue retirait les classes à la main via classList. Ici l'état
  // pilote le rendu ; la cascade de 200 ms entre les cartes est conservée.
  useEffect(() => {
    const header = headerRef.current
    const podium = podiumRef.current
    const timers: ReturnType<typeof setTimeout>[] = []

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          if (entry.target === header) {
            setHeaderVisible(true)
          } else if (entry.target === podium) {
            for (let index = 0; index < CARD_COUNT; index += 1) {
              timers.push(
                setTimeout(() => {
                  setVisibleCards((current) =>
                    current.map((visible, position) => (position === index ? true : visible)),
                  )
                }, index * CARD_STAGGER_MS),
              )
            }
          }
          observer.unobserve(entry.target)
        })
      },
      { root: null, threshold: 0.1, rootMargin: '0px 0px -50px 0px' },
    )

    if (header) observer.observe(header)
    if (podium) observer.observe(podium)

    return () => {
      observer.disconnect()
      timers.forEach(clearTimeout)
    }
  }, [])

  const cardHidden = (index: number) => (visibleCards[index] ? '' : HIDDEN_CARD)

  return (
    <section
      id="grand-prix"
      className="bg-awac-primary/10 py-28 md:py-36 border-t border-gray-100 overflow-hidden relative selection:bg-awac-primary/20"
    >
      <div className="absolute inset-0 pointer-events-none z-0 opacity-30">
        <div className="absolute top-[30%] left-[-10%] w-[40rem] h-[40rem] rounded-full bg-gradient-to-tr from-awac-primary/10 via-transparent to-transparent filter blur-3xl" />
      </div>

      <div className="container mx-auto px-6 max-w-6xl relative z-10">
        <div
          ref={headerRef}
          className={`flex flex-col lg:flex-row items-start justify-between gap-12 lg:gap-16 mb-28 transition-all duration-1000 ease-out ${
            headerVisible ? '' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="max-w-xl space-y-3">
            <span className="text-xs font-heading font-black tracking-[0.4em] text-awac-primary uppercase block">
              La Dotation Exceptionnelle
            </span>
            <h2 className="text-gray-900 font-heading font-black text-5xl md:text-7xl tracking-tighter uppercase leading-none">
              Le Grand
              <br />
              Prix
            </h2>
          </div>
          <div className="max-w-sm lg:pt-10">
            <p className="text-gray-500 font-sans text-sm md:text-base leading-relaxed font-medium">
              Découvrez les récompenses majeures conçues pour propulser concrètement la carrière de
              nos jeunes apprentis du Mono.
            </p>
          </div>
        </div>

        <div
          ref={podiumRef}
          className="flex flex-col lg:flex-row items-stretch justify-center gap-12 lg:gap-8 max-w-5xl mx-auto"
        >
          <div
            className={`carte-prix w-full lg:w-[320px] bg-white border border-gray-150 p-8 rounded-[2rem_0_2rem_0] shadow-[0_15px_40px_rgba(0,0,0,0.01)] flex flex-col justify-between h-[360px] lg:h-[400px] transition-all duration-[1000ms] ease-out hover:-translate-y-2 hover:shadow-[0_25px_50px_rgba(0,0,0,0.04)] hover:border-awac-primary/30 group relative overflow-hidden ${cardHidden(0)}`}
          >
            <div className="absolute -right-6 -top-8 font-heading font-black text-9xl text-gray-100/70 select-none tracking-tighter group-hover:text-awac-primary/5 group-hover:scale-105 transition-all duration-500">
              A
            </div>

            <div className="w-11 h-11 rounded-xl bg-awac-primary/5 border border-awac-primary/10 flex items-center justify-center text-awac-primary relative z-10 transition-transform duration-500 group-hover:rotate-12">
              <span className="material-icons text-xl">content_cut</span>
            </div>

            <div className="space-y-3 relative z-10">
              <h3 className="text-gray-900 font-heading font-black text-xl uppercase tracking-wider">
                Machines &amp; Matériel
              </h3>
              <div className="w-12 h-[2px] border-t-2 border-dashed border-awac-primary/40 transition-all duration-500 group-hover:w-20" />
              <p className="text-gray-600 font-sans text-xs md:text-sm leading-relaxed font-medium">
                Une dotation complète de{' '}
                <span className="text-gray-900 font-bold">machines à coudre professionnelles</span>{' '}
                et d’équipements de couture de haute qualité pour s’installer.
              </p>
            </div>
          </div>

          <div
            className={`carte-prix w-full lg:w-[340px] bg-white border border-gray-200 p-8 rounded-[0_2rem_0_2rem] shadow-[0_25px_60px_rgba(165,155,140,0.08)] flex flex-col justify-between h-[380px] lg:h-[440px] transition-all duration-[1000ms] delay-200 ease-out lg:-translate-y-8 hover:!border-awac-accent/30 group relative overflow-hidden lg:hover:-translate-y-10 hover:shadow-[0_35px_70px_rgba(0,0,0,0.06)] ${cardHidden(1)}`}
          >
            <div className="absolute -right-8 -top-8 font-heading font-black text-[11rem] leading-none text-gray-150/40 select-none tracking-tighter group-hover:text-awac-accent/5 group-hover:scale-105 transition-all duration-500">
              T
            </div>

            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-awac-primary to-awac-accent flex items-center justify-center text-white relative z-10 shadow-sm transition-transform duration-500 group-hover:scale-110">
              <span className="material-icons text-xl">emoji_events</span>
            </div>

            <div className="space-y-3 relative z-10">
              <span className="text-[9px] font-heading font-black tracking-widest text-awac-primary uppercase">
                Récompense Suprême
              </span>
              <h3 className="text-gray-900 font-heading font-black text-2xl uppercase tracking-wider">
                Le Trophée Awac
              </h3>
              <div className="w-16 h-[2px] border-t-2 border-dashed border-awac-accent/40 transition-all duration-500 group-hover:w-24" />
              <p className="text-gray-600 font-sans text-sm leading-relaxed font-semibold">
                Le{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-awac-primary to-awac-accent font-black">
                  Trophée Officiel du Mono
                </span>{' '}
                accompagné de distinctions honorifiques uniques gravées pour l&apos;histoire.
              </p>
            </div>
          </div>

          <div
            className={`carte-prix w-full lg:w-[320px] bg-white border border-gray-150 p-8 rounded-[2rem_0_2rem_0] shadow-[0_15px_40px_rgba(0,0,0,0.01)] flex flex-col justify-between h-[360px] lg:h-[400px] transition-all duration-[1000ms] delay-400 ease-out hover:-translate-y-2 hover:shadow-[0_25px_50px_rgba(0,0,0,0.04)] hover:border-gray-900 group relative overflow-hidden ${cardHidden(2)}`}
          >
            <div className="absolute -right-6 -top-8 font-heading font-black text-9xl text-gray-100/70 select-none tracking-tighter group-hover:text-gray-900/5 group-hover:scale-105 transition-all duration-500">
              V
            </div>

            <div className="w-11 h-11 rounded-xl bg-gray-900/5 border border-gray-900/10 flex items-center justify-center text-gray-900 relative z-10 transition-transform duration-500 group-hover:scale-110">
              <span className="material-icons text-xl">campaign</span>
            </div>

            <div className="space-y-3 relative z-10">
              <h3 className="text-gray-900 font-heading font-black text-xl uppercase tracking-wider">
                Visibilité Nationale
              </h3>
              <div className="w-12 h-[2px] border-t-2 border-dashed border-gray-900/20 transition-all duration-500 group-hover:w-20" />
              <p className="text-gray-600 font-sans text-xs md:text-sm leading-relaxed font-medium">
                Un déploiement de{' '}
                <span className="text-gray-900 font-bold">visibilité professionnelle</span> à
                l’échelle nationale pour propulser sa marque sur le devant de la scène de la mode.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
