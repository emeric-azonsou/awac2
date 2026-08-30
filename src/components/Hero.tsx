import logoMtn from '../assets/icons/mtn.webp'
import logoMoov from '../assets/icons/moov.webp'
import logoCeltis from '../assets/icons/celtis.svg'
import './Hero.css'

export function Hero() {
  return (
    <header
      id="accueil"
      className="awac-hero relative h-[85vh] max-h-[85vh] bg-[#FBFBFA] overflow-hidden flex items-center justify-center isolation-auto"
    >
      <div className="absolute inset-0 w-full h-full opacity-20 pointer-events-none z-0">
        <div className="absolute top-[10%] left-[15%] w-[70%] h-[80%] rounded-[50%] bg-gradient-to-tr from-awac-primary/40 to-awac-accent/30 filter blur-3xl opacity-70 animate-pulse-slow" />
      </div>

      <div className="container mx-auto px-6 relative z-10 h-full flex flex-col items-center justify-center overflow-y-auto">
        <div className="text-center space-y-6 max-w-2xl mx-auto flex flex-col items-center py-4">
          <div className="animate-fade-down relative inline-flex items-center justify-center px-4 py-1.5 bg-[#FAF9F5] border border-dashed border-gray-400 shadow-[2px_2px_0px_rgba(0,0,0,0.08)] transform -rotate-1 select-none">
            <div className="absolute -left-1 top-1/2 w-2 h-[1px] bg-gray-400 opacity-60" />
            <div className="absolute -right-1 top-1/2 w-2 h-[1px] bg-gray-400 opacity-60" />
            <span className="text-gray-900 font-heading font-black text-[9px] tracking-[0.2em] uppercase">
              ÉDITION OFFICIELLE 2026
            </span>
          </div>

          <div className="space-y-1.5 animate-fade-up" style={{ animationDelay: '0.1s' }}>
            <h1 className="text-gray-900 font-heading font-black text-4xl md:text-6xl tracking-tight leading-none">
              AWAC - MONO
            </h1>

            <p
              className="text-gray-800 font-sans font-semibold text-xs md:text-sm tracking-widest uppercase text-awac-accent animate-fade-up"
              style={{ animationDelay: '0.2s' }}
            >
              Awards des Apprentis Couturiers du Mono
            </p>
          </div>

          <p
            className="text-gray-600 font-sans text-sm md:text-base leading-relaxed max-w-xl animate-fade-up"
            style={{ animationDelay: '0.3s' }}
          >
            Soutenez l&apos;avenir de nos jeunes créateurs ! Propulsez le talent et l&apos;artisanat
            du Mono vers la victoire.
          </p>

          <div
            className="flex flex-col items-center space-y-6 py-2 w-full animate-scale-up"
            style={{ animationDelay: '0.4s' }}
          >
            <div className="flex items-center justify-center gap-4 md:gap-8 bg-awac-primary/10 border border-awac-primary/20 p-5 md:px-10 md:py-6 rounded-2xl shadow-[0_8px_24px_rgba(165,155,140,0.06)] relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-awac-primary/10 to-transparent -translate-x-full animate-shimmer" />

              <div className="text-center">
                <span className="text-2xl md:text-4xl font-heading font-black text-gray-800 tracking-tight">
                  100
                </span>
                <span className="block text-[9px] font-sans font-bold text-awac-primary tracking-widest uppercase mt-0.5">
                  FCFA
                </span>
              </div>

              <div className="w-20 md:w-28 h-6 flex items-center justify-center text-awac-primary opacity-100">
                <svg
                  className="w-full h-full animate-draw-arrow"
                  fill="none"
                  viewBox="0 0 120 30"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5,15 Q15,5 25,15 T45,15 T65,15 T85,15 T105,15" strokeDasharray="4,4" />
                  <path d="M98,5 L108,12 L98,19" />
                </svg>
              </div>

              <div className="text-center">
                <span className="text-2xl md:text-4xl font-heading font-black text-transparent bg-clip-text bg-gradient-to-r from-awac-primary to-awac-accent tracking-tight">
                  1
                </span>
                <span className="block text-[9px] font-sans font-bold text-gray-500 tracking-widest uppercase mt-0.5">
                  VOTE
                </span>
              </div>
            </div>

            <div
              className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 animate-fade-up"
              style={{ animationDelay: '0.5s' }}
            >
              <span className="text-[10px] text-gray-400 font-sans uppercase tracking-widest font-semibold">
                Disponible sur :
              </span>

              <div className="relative px-5 py-2.5 bg-white/50 backdrop-blur-xs border border-white/80 rounded-full shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex items-center gap-5 transition-all duration-300 hover:shadow-[0_4px_20px_rgba(0,0,0,0.05)] hover:border-white group">
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-awac-primary/5 to-awac-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10" />

                <img
                  src={logoMtn}
                  alt="MTN"
                  className="h-6 w-auto object-contain transition-transform duration-300 group-hover:scale-110"
                />

                <div className="h-3 w-[1px] bg-gray-200" />

                <div className="h-5 flex items-center justify-center overflow-hidden bg-transparent transition-transform duration-300 group-hover:scale-110">
                  <img
                    src={logoMoov}
                    alt="MOOV"
                    className="h-full w-auto object-contain"
                    style={{ mixBlendMode: 'darken' }}
                  />
                </div>

                <div className="h-3 w-[1px] bg-gray-200" />

                <img
                  src={logoCeltis}
                  alt="CELTIS"
                  className="h-6 w-auto object-contain transition-transform duration-300 group-hover:scale-110"
                />
              </div>
            </div>
          </div>

          <div
            className="pt-2 w-full sm:w-auto flex justify-center animate-fade-up"
            style={{ animationDelay: '0.6s' }}
          >
            <a href="#candidats" className="btn-awac text-xs py-3.5 px-10 gap-3 w-full sm:w-auto">
              <span>VOIR LES CANDIDATS &amp; VOTER</span>
              <span className="material-icons text-sm animate-bounce-x">arrow_forward</span>
            </a>
          </div>
        </div>
      </div>
    </header>
  )
}
