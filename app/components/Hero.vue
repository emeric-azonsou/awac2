<template>
  <header
    id="accueil"
    class="relative h-[85vh] max-h-[85vh] bg-[#FBFBFA] overflow-hidden flex items-center justify-center isolation-auto"
  >
    <!-- HALO ARRIÈRE-PLAN AVEC SCINTILLEMENT -->
    <div class="absolute inset-0 w-full h-full opacity-20 pointer-events-none z-0">
      <div
        class="absolute top-[10%] left-[15%] w-[70%] h-[80%] rounded-[50%] bg-gradient-to-tr from-awac-primary/40 to-awac-accent/30 filter blur-3xl opacity-70 animate-pulse-slow"
      ></div>
    </div>

    <div
      class="container mx-auto px-6 relative z-10 h-full flex flex-col items-center justify-center overflow-y-auto"
    >
      <div class="text-center space-y-6 max-w-2xl mx-auto flex flex-col items-center py-4">
        <!-- BADGE AVEC ANIMATION D'ENTRÉE -->
        <div
          class="animate-fade-down relative inline-flex items-center justify-center px-4 py-1.5 bg-[#FAF9F5] border border-dashed border-gray-400 shadow-[2px_2px_0px_rgba(0,0,0,0.08)] transform -rotate-1 select-none"
        >
          <div class="absolute -left-1 top-1/2 w-2 h-[1px] bg-gray-400 opacity-60"></div>
          <div class="absolute -right-1 top-1/2 w-2 h-[1px] bg-gray-400 opacity-60"></div>
          <span class="text-gray-900 font-heading font-black text-[9px] tracking-[0.2em] uppercase">
            ÉDITION OFFICIELLE 2026
          </span>
        </div>

        <!-- TITRE AVEC CASCADE -->
        <div class="space-y-1.5 animate-fade-up" style="animation-delay: 0.1s">
          <h1
            class="text-gray-900 font-heading font-black text-4xl md:text-6xl tracking-tight leading-none"
          >
            AWAC - MONO
          </h1>

          <p
            class="text-gray-800 font-sans font-semibold text-xs md:text-sm tracking-widest uppercase text-awac-accent animate-fade-up"
            style="animation-delay: 0.2s"
          >
            Awards des Apprentis Couturiers du Mono
          </p>
        </div>

        <!-- PHRASE D'ACTION -->
        <p
          class="text-gray-600 font-sans text-sm md:text-base leading-relaxed max-w-xl animate-fade-up"
          style="animation-delay: 0.3s"
        >
          Soutenez l'avenir de nos jeunes créateurs ! Propulsez le talent et l'artisanat du Mono
          vers la victoire.
        </p>

        <!-- SCHÉMA DE PRIX AVEC REBOND -->
        <div
          class="flex flex-col items-center space-y-6 py-2 w-full animate-scale-up"
          style="animation-delay: 0.4s"
        >
          <div
            class="flex items-center justify-center gap-4 md:gap-8 bg-awac-primary/10 border border-awac-primary/20 p-5 md:px-10 md:py-6 rounded-2xl shadow-[0_8px_24px_rgba(165,155,140,0.06)] relative overflow-hidden"
          >
            <!-- ANIMATION DE BRILLANCE SUR LE BORD -->
            <div
              class="absolute inset-0 bg-gradient-to-r from-transparent via-awac-primary/10 to-transparent -translate-x-full animate-shimmer"
            ></div>

            <div class="text-center">
              <span
                class="text-2xl md:text-4xl font-heading font-black text-gray-800 tracking-tight"
                >100</span
              >
              <span
                class="block text-[9px] font-sans font-bold text-awac-primary tracking-widest uppercase mt-0.5"
                >FCFA</span
              >
            </div>

            <!-- FLÈCHE ANIMÉE (DESSIN CONTINU) -->
            <div
              class="w-20 md:w-28 h-6 flex items-center justify-center text-awac-primary opacity-100"
            >
              <svg
                class="w-full h-full animate-draw-arrow"
                fill="none"
                viewBox="0 0 120 30"
                stroke="currentColor"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M5,15 Q15,5 25,15 T45,15 T65,15 T85,15 T105,15" stroke-dasharray="4,4" />
                <path d="M98,5 L108,12 L98,19" />
              </svg>
            </div>

            <div class="text-center">
              <span
                class="text-2xl md:text-4xl font-heading font-black text-transparent bg-clip-text bg-gradient-to-r from-awac-primary to-awac-accent tracking-tight"
                >1</span
              >
              <span
                class="block text-[9px] font-sans font-bold text-gray-500 tracking-widest uppercase mt-0.5"
                >VOTE</span
              >
            </div>
          </div>

          <!-- LOGOS OPÉRATEURS -->
          <div
            class="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 animate-fade-up"
            style="animation-delay: 0.5s"
          >
            <span
              class="text-[10px] text-gray-400 font-sans uppercase tracking-widest font-semibold"
            >
              Disponible sur :
            </span>

            <div
              class="relative px-5 py-2.5 bg-white/50 backdrop-blur-xs border border-white/80 rounded-full shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex items-center gap-5 transition-all duration-300 hover:shadow-[0_4px_20px_rgba(0,0,0,0.05)] hover:border-white group"
            >
              <div
                class="absolute inset-0 rounded-full bg-gradient-to-r from-awac-primary/5 to-awac-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"
              ></div>

              <img
                :src="logoMtn"
                alt="MTN"
                class="h-6 w-auto object-contain transition-transform duration-300 group-hover:scale-110"
              />

              <div class="h-3 w-[1px] bg-gray-200"></div>

              <div
                class="h-5 flex items-center justify-center overflow-hidden bg-transparent transition-transform duration-300 group-hover:scale-110"
              >
                <img
                  :src="logoMoov"
                  alt="MOOV"
                  class="h-full w-auto object-contain"
                  style="mix-blend-mode: darken"
                />
              </div>

              <div class="h-3 w-[1px] bg-gray-200"></div>

              <img
                :src="logoCeltis"
                alt="CELTIS"
                class="h-6 w-auto object-contain transition-transform duration-300 group-hover:scale-110"
              />
            </div>
          </div>
        </div>

        <!-- BOUTON D'ACTION -->
        <div
          class="pt-2 w-full sm:w-auto flex justify-center animate-fade-up"
          style="animation-delay: 0.6s"
        >
          <a
            href="#candidats"
            class="relative inline-flex overflow-hidden bg-awac-dark text-white font-heading font-bold text-xs tracking-widest uppercase py-3.5 px-10 rounded-md transition-all duration-300 transform hover:-translate-y-1 shadow-lg hover:shadow-xl items-center gap-3 isolation-auto z-10 before:absolute before:inset-0 before:-z-10 before:bg-gradient-to-r before:from-awac-primary before:to-awac-accent before:transition-opacity before:duration-300 hover:before:opacity-0 w-full sm:w-auto justify-center hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>VOIR LES CANDIDATS & VOTER</span>
            <span class="material-icons text-sm animate-bounce-x">arrow_forward</span>
          </a>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup>
import logoMtn from '../assets/img/icons/mtn.webp'
import logoMoov from '../assets/img/icons/moov.webp'
import logoCeltis from '../assets/img/icons/celtis.svg'
</script>

<style scoped>
* {
  overflow: hidden;
}
@keyframes fadeDown {
  0% {
    opacity: 0;
    transform: translateY(-20px) rotate(-1deg);
  }
  100% {
    opacity: 1;
    transform: translateY(0) rotate(-1deg);
  }
}

@keyframes fadeUp {
  0% {
    opacity: 0;
    transform: translateY(30px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes scaleUp {
  0% {
    opacity: 0;
    transform: scale(0.85);
  }
  60% {
    transform: scale(1.02);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes pulse-slow {
  0%,
  100% {
    opacity: 0.7;
    transform: scale(1);
  }
  50% {
    opacity: 0.4;
    transform: scale(1.05);
  }
}

@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

@keyframes draw-arrow {
  0% {
    stroke-dashoffset: 100;
    opacity: 0;
  }
  100% {
    stroke-dashoffset: 0;
    opacity: 1;
  }
}

@keyframes bounce-x {
  0%,
  100% {
    transform: translateX(0);
  }
  50% {
    transform: translateX(4px);
  }
}

/* ============================================
   CLASSES D'ANIMATION
   ============================================ */
.animate-fade-down {
  animation: fadeDown 0.7s ease-out both;
}

.animate-fade-up {
  animation: fadeUp 0.7s ease-out both;
}

.animate-scale-up {
  animation: scaleUp 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

.animate-pulse-slow {
  animation: pulse-slow 8s ease-in-out infinite;
}

.animate-shimmer {
  animation: shimmer 3s ease-in-out infinite;
}

.animate-draw-arrow {
  animation: draw-arrow 1.2s ease-out both;
}

.animate-bounce-x {
  animation: bounce-x 1.5s ease-in-out infinite;
}

/* ============================================
   DELAIS PERSONNALISÉS
   ============================================ */
.animate-fade-up:nth-child(1) {
  animation-delay: 0.1s;
}
.animate-fade-up:nth-child(2) {
  animation-delay: 0.2s;
}
.animate-fade-up:nth-child(3) {
  animation-delay: 0.3s;
}
</style>
