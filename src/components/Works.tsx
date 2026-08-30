import { useEffect, useRef, useState } from 'react'
import './Works.css'

const REVEAL_BASE = 'opacity-0 translate-y-4 transition-all duration-700 ease-out'
const REVEAL_BASE_LG = 'opacity-0 translate-y-6 transition-all duration-700 ease-out'
const REVEALED = 'opacity-100 translate-y-0'

const STEP_LINE_SVG_CLASS = 'w-full h-24 md:h-28 text-awac-primary/30 -mt-1 -mb-2 z-0 step-line'
const STEP_CIRCLE_BASE =
  'w-11 h-11 rounded-full bg-white border border-gray-300 flex items-center justify-center font-heading font-black text-xs text-gray-900 shadow-xs z-10 transition-all duration-300 relative overflow-hidden step-circle'

export function Works() {
  const sectionRef = useRef<HTMLElement | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsVisible(true)
          observer.unobserve(entry.target)
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -50px 0px' },
    )
    observer.observe(section)
    return () => observer.disconnect()
  }, [])

  const revealed = isVisible ? REVEALED : ''
  const stepVisible = isVisible ? 'step-visible' : ''

  return (
    <section
      id="comment-voter"
      ref={sectionRef}
      className="awac-works bg-awac-accent/10 py-24 md:py-32 border-t border-gray-100 relative overflow-hidden selection:bg-awac-primary/10"
    >
      <div className="absolute inset-0 pointer-events-none z-0 opacity-40">
        <div className="absolute top-[20%] right-[-15%] w-[40rem] h-[40rem] rounded-full bg-gradient-to-tr from-awac-primary/10 via-transparent to-transparent filter blur-3xl animate-pulse-slow" />
      </div>

      <div className="container mx-auto px-6 max-w-6xl relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          <div className="lg:col-span-5 space-y-4 text-center lg:text-left">
            <span
              className={`text-[10px] font-heading font-black tracking-[0.4em] text-awac-primary uppercase block ${REVEAL_BASE} ${revealed}`}
            >
              Le Guide Flash
            </span>

            <h2
              className={`text-gray-900 font-heading font-black text-4xl md:text-6xl tracking-tight uppercase leading-none ${REVEAL_BASE_LG} delay-100 ${revealed}`}
            >
              Comment
              <br className="hidden lg:block" />
              voter ?
            </h2>

            <p
              className={`text-gray-500 font-sans text-sm md:text-base leading-relaxed max-w-sm mx-auto lg:mx-0 ${REVEAL_BASE_LG} delay-200 ${revealed}`}
            >
              Trois mouvements simples pour propulser l&apos;avenir de la couture locale et soutenir
              nos jeunes créateurs.
            </p>
          </div>

          <div className="lg:col-span-7 flex flex-col w-full max-w-xl mx-auto lg:mx-0">
            <div
              className={`flex items-stretch gap-6 md:gap-10 group step-item ${stepVisible}`}
              style={{ transitionDelay: '0.1s' }}
            >
              <div className="flex flex-col items-center flex-shrink-0 relative w-12">
                <div
                  className={`${STEP_CIRCLE_BASE} group-hover:border-awac-primary group-hover:text-awac-primary`}
                >
                  <span className="step-number group-hover:opacity-0 transition-opacity duration-300">
                    01
                  </span>
                  <span className="material-icons text-sm absolute opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-awac-primary">
                    visibility
                  </span>
                </div>

                <div className={STEP_LINE_SVG_CLASS}>
                  <svg
                    className="w-full h-full"
                    fill="none"
                    viewBox="0 0 40 100"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  >
                    <path
                      d="M20,0 Q35,25 20,50 T20,100"
                      strokeDasharray="4,4"
                      style={{ strokeDasharray: '4px, 4px' }}
                    />
                  </svg>
                </div>
              </div>

              <div className="pt-2 pb-8 max-w-md transform transition-transform duration-300 group-hover:translate-x-1 step-content">
                <h3 className="text-gray-900 font-heading font-black text-base md:text-lg uppercase tracking-wider mb-1.5 group-hover:text-awac-primary transition-colors">
                  Choisissez
                </h3>
                <p className="text-gray-600 font-sans text-xs md:text-sm leading-relaxed font-medium">
                  Explorez le défilé des candidats en bas de page pour découvrir les vêtements créés
                  par nos apprentis.
                </p>
              </div>
            </div>

            <div
              className={`flex items-stretch gap-6 md:gap-10 group step-item ${stepVisible}`}
              style={{ transitionDelay: '0.3s' }}
            >
              <div className="flex flex-col items-center flex-shrink-0 relative w-12">
                <div
                  className={`${STEP_CIRCLE_BASE} group-hover:border-awac-accent group-hover:text-awac-accent`}
                >
                  <span className="step-number group-hover:opacity-0 transition-opacity duration-300">
                    02
                  </span>
                  <span className="material-icons text-sm absolute opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-awac-accent">
                    tune
                  </span>
                </div>

                <div className={STEP_LINE_SVG_CLASS}>
                  <svg
                    className="w-full h-full"
                    fill="none"
                    viewBox="0 0 40 100"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  >
                    <path
                      d="M20,0 Q5,25 20,50 T20,100"
                      strokeDasharray="4,4"
                      style={{ strokeDasharray: '4px, 4px' }}
                    />
                  </svg>
                </div>
              </div>

              <div className="pt-2 pb-8 max-w-md transform transition-transform duration-300 group-hover:translate-x-1 step-content">
                <h3 className="text-gray-900 font-heading font-black text-base md:text-lg uppercase tracking-wider mb-1.5 group-hover:text-awac-accent transition-colors">
                  Ajustez
                </h3>
                <p className="text-gray-600 font-sans text-xs md:text-sm leading-relaxed font-medium">
                  Définissez la quantité de vote. Chaque clic supplémentaire augmente son rang dans
                  la compétition.
                </p>
              </div>
            </div>

            <div
              className={`flex items-stretch gap-6 md:gap-10 group step-item ${stepVisible}`}
              style={{ transitionDelay: '0.5s' }}
            >
              <div className="flex flex-col items-center flex-shrink-0 relative w-12">
                <div
                  className={`${STEP_CIRCLE_BASE} group-hover:border-gray-900 group-hover:bg-gray-900 group-hover:text-white`}
                >
                  <span className="step-number group-hover:opacity-0 transition-opacity duration-300">
                    03
                  </span>
                  <span className="material-icons text-sm absolute opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-white">
                    payments
                  </span>
                </div>
              </div>

              <div className="pt-2 max-w-md transform transition-transform duration-300 group-hover:translate-x-1 step-content">
                <h3 className="text-gray-900 font-heading font-black text-base md:text-lg uppercase tracking-wider mb-1.5 group-hover:text-gray-900 transition-colors">
                  Validez
                </h3>
                <p className="text-gray-600 font-sans text-xs md:text-sm leading-relaxed font-medium">
                  Déclenchez le compteur en direct après validation de la transaction avec MTN, Moov
                  ou Celtis.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
