<template>
  <section
    id="comment-voter"
    ref="sectionRef"
    class="bg-awac-accent/10 py-24 md:py-32 border-t border-gray-100 relative overflow-hidden selection:bg-awac-primary/10"
  >
    <div class="absolute inset-0 pointer-events-none z-0 opacity-40">
      <div
        class="absolute top-[20%] right-[-15%] w-[40rem] h-[40rem] rounded-full bg-gradient-to-tr from-awac-primary/10 via-transparent to-transparent filter blur-3xl animate-pulse-slow"
      ></div>
    </div>

    <div class="container mx-auto px-6 max-w-6xl relative z-10">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
        <div class="lg:col-span-5 space-y-4 text-center lg:text-left">
          <span
            class="text-[10px] font-heading font-black tracking-[0.4em] text-awac-primary uppercase block opacity-0 translate-y-4 transition-all duration-700 ease-out"
            :class="isVisible ? 'opacity-100 translate-y-0' : ''"
          >
            Le Guide Flash
          </span>

          <h2
            class="text-gray-900 font-heading font-black text-4xl md:text-6xl tracking-tight uppercase leading-none opacity-0 translate-y-6 transition-all duration-700 ease-out delay-100"
            :class="isVisible ? 'opacity-100 translate-y-0' : ''"
          >
            Comment<br class="hidden lg:block" />
            voter ?
          </h2>

          <p
            class="text-gray-500 font-sans text-sm md:text-base leading-relaxed max-w-sm mx-auto lg:mx-0 opacity-0 translate-y-6 transition-all duration-700 ease-out delay-200"
            :class="isVisible ? 'opacity-100 translate-y-0' : ''"
          >
            Trois mouvements simples pour propulser l'avenir de la couture locale et soutenir nos
            jeunes créateurs.
          </p>
        </div>

        <div class="lg:col-span-7 flex flex-col w-full max-w-xl mx-auto lg:mx-0">
          <!-- ÉTAPE 01 -->
          <div
            class="flex items-stretch gap-6 md:gap-10 group step-item"
            :class="isVisible ? 'step-visible' : ''"
            style="transition-delay: 0.1s"
          >
            <div class="flex flex-col items-center flex-shrink-0 relative w-12">
              <div
                class="w-11 h-11 rounded-full bg-white border border-gray-300 flex items-center justify-center font-heading font-black text-xs text-gray-900 shadow-xs z-10 transition-all duration-300 group-hover:border-awac-primary group-hover:text-awac-primary relative overflow-hidden step-circle"
              >
                <span class="step-number group-hover:opacity-0 transition-opacity duration-300"
                  >01</span
                >
                <span
                  class="material-icons text-sm absolute opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-awac-primary"
                  >visibility</span
                >
              </div>

              <div class="w-full h-24 md:h-28 text-awac-primary/30 -mt-1 -mb-2 z-0 step-line">
                <svg
                  class="w-full h-full"
                  fill="none"
                  viewBox="0 0 40 100"
                  stroke="currentColor"
                  stroke-width="2.5"
                  stroke-linecap="round"
                >
                  <!-- FORÇAGE ULTIME : Le style inline avec !important détruit le bug de DeepSeek -->
                  <path
                    d="M20,0 Q35,25 20,50 T20,100"
                    stroke-dasharray="4,4"
                    style="stroke-dasharray: 4px, 4px !important"
                  />
                </svg>
              </div>
            </div>

            <div
              class="pt-2 pb-8 max-w-md transform transition-transform duration-300 group-hover:translate-x-1 step-content"
            >
              <h3
                class="text-gray-900 font-heading font-black text-base md:text-lg uppercase tracking-wider mb-1.5 group-hover:text-awac-primary transition-colors"
              >
                Choisissez
              </h3>
              <p class="text-gray-600 font-sans text-xs md:text-sm leading-relaxed font-medium">
                Explorez le défilé des candidats en bas de page pour découvrir les vêtements créés
                par nos apprentis.
              </p>
            </div>
          </div>

          <!-- ÉTAPE 02 -->
          <div
            class="flex items-stretch gap-6 md:gap-10 group step-item"
            :class="isVisible ? 'step-visible' : ''"
            style="transition-delay: 0.3s"
          >
            <div class="flex flex-col items-center flex-shrink-0 relative w-12">
              <div
                class="w-11 h-11 rounded-full bg-white border border-gray-300 flex items-center justify-center font-heading font-black text-xs text-gray-900 shadow-xs z-10 transition-all duration-300 group-hover:border-awac-accent group-hover:text-awac-accent relative overflow-hidden step-circle"
              >
                <span class="step-number group-hover:opacity-0 transition-opacity duration-300"
                  >02</span
                >
                <span
                  class="material-icons text-sm absolute opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-awac-accent"
                  >tune</span
                >
              </div>

              <div class="w-full h-24 md:h-28 text-awac-primary/30 -mt-1 -mb-2 z-0 step-line">
                <svg
                  class="w-full h-full"
                  fill="none"
                  viewBox="0 0 40 100"
                  stroke="currentColor"
                  stroke-width="2.5"
                  stroke-linecap="round"
                >
                  <!-- FORÇAGE ULTIME : Le style inline avec !important détruit le bug de DeepSeek -->
                  <path
                    d="M20,0 Q5,25 20,50 T20,100"
                    stroke-dasharray="4,4"
                    style="stroke-dasharray: 4px, 4px !important"
                  />
                </svg>
              </div>
            </div>

            <div
              class="pt-2 pb-8 max-w-md transform transition-transform duration-300 group-hover:translate-x-1 step-content"
            >
              <h3
                class="text-gray-900 font-heading font-black text-base md:text-lg uppercase tracking-wider mb-1.5 group-hover:text-awac-accent transition-colors"
              >
                Ajustez
              </h3>
              <p class="text-gray-600 font-sans text-xs md:text-sm leading-relaxed font-medium">
                Définissez la quantité de vote. Chaque clic supplémentaire augmente son rang dans la
                compétition.
              </p>
            </div>
          </div>

          <!-- ÉTAPE 03 -->
          <div
            class="flex items-stretch gap-6 md:gap-10 group step-item"
            :class="isVisible ? 'step-visible' : ''"
            style="transition-delay: 0.5s"
          >
            <div class="flex flex-col items-center flex-shrink-0 relative w-12">
              <div
                class="w-11 h-11 rounded-full bg-white border border-gray-300 flex items-center justify-center font-heading font-black text-xs text-gray-900 shadow-xs z-10 transition-all duration-300 group-hover:border-gray-900 group-hover:bg-gray-900 group-hover:text-white relative overflow-hidden step-circle"
              >
                <span class="step-number group-hover:opacity-0 transition-opacity duration-300"
                  >03</span
                >
                <span
                  class="material-icons text-sm absolute opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-white"
                  >payments</span
                >
              </div>
            </div>

            <div
              class="pt-2 max-w-md transform transition-transform duration-300 group-hover:translate-x-1 step-content"
            >
              <h3
                class="text-gray-900 font-heading font-black text-base md:text-lg uppercase tracking-wider mb-1.5 group-hover:text-gray-900 transition-colors"
              >
                Validez
              </h3>
              <p class="text-gray-600 font-sans text-xs md:text-sm leading-relaxed font-medium">
                Déclenchez le compteur en direct après validation de la transaction avec MTN, Moov
                ou Celtis.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

const sectionRef = ref(null)
const isVisible = ref(false)

let observer = null

onMounted(() => {
  observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        isVisible.value = true
        observer.unobserve(entry.target)
      }
    },
    {
      threshold: 0.15,
      rootMargin: '0px 0px -50px 0px',
    },
  )

  if (sectionRef.value) {
    observer.observe(sectionRef.value)
  }
})

onBeforeUnmount(() => {
  if (observer) {
    observer.disconnect()
  }
})
</script>

<style scoped>
.step-item {
  opacity: 0;
  transform: translateX(-30px);
  transition: all 0.7s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.step-visible {
  opacity: 1;
  transform: translateX(0);
}

.step-circle {
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.step-item.step-visible .step-circle {
  animation: popCircle 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

@keyframes popCircle {
  0% {
    transform: scale(0.5);
    opacity: 0;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.step-content {
  transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.step-item.step-visible .step-content {
  animation: slideContent 0.6s ease-out both;
}

@keyframes slideContent {
  0% {
    opacity: 0;
    transform: translateX(15px);
  }
  100% {
    opacity: 1;
    transform: translateX(0);
  }
}

.step-line svg path {
  stroke-dasharray: 200;
  stroke-dashoffset: 200;
  transition: stroke-dashoffset 1.2s ease-out;
}

.step-item.step-visible .step-line svg path {
  stroke-dashoffset: 0;
}

.step-item:last-child .step-line {
  opacity: 0;
}

@keyframes pulse-slow {
  0%,
  100% {
    opacity: 0.4;
    transform: scale(1);
  }
  50% {
    opacity: 0.2;
    transform: scale(1.1);
  }
}

.animate-pulse-slow {
  animation: pulse-slow 6s ease-in-out infinite;
}

.step-item:nth-child(1) {
  transition-delay: 0.1s;
}
.step-item:nth-child(2) {
  transition-delay: 0.3s;
}
.step-item:nth-child(3) {
  transition-delay: 0.5s;
}
</style>
