<template>
  <nav
    class="sticky top-0 z-50 bg-white/40 backdrop-blur-md border-b border-white/20 shadow-[0_4px_30px_rgba(0,0,0,0.03)] transition-all duration-300"
    :class="isScrolled ? 'bg-white/70 shadow-md' : 'bg-white/40'"
  >
    <div class="container mx-auto px-4 md:px-6">
      <div class="flex justify-between items-center h-20 md:h-24 xl:h-22 relative">
        <div class="flex items-center flex-shrink-0">
          <a href="#accueil" class="transition-transform duration-200 hover:scale-105 block py-1">
            <img
              :src="awacLogo"
              alt="AWAC-MONO"
              class="h-24 md:h-28 xl:h-[12rem] w-auto max-w-[10rem] md:max-w-[14rem] xl:max-w-none object-contain object-left scale-110 origin-left"
            />
          </a>
        </div>

        <div
          class="hidden md:flex items-center space-x-4 lg:space-x-8 xl:space-x-10 font-sans text-[10px] lg:text-xs tracking-widest uppercase font-semibold"
        >
          <a
            href="#concours"
            class="text-gray-900 hover:text-awac-primary transition-colors duration-200 whitespace-nowrap relative group"
          >
            Le Concours
            <span
              class="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-awac-primary to-awac-accent transition-all duration-300 group-hover:w-full"
            ></span>
          </a>
          <a
            href="#comment-voter"
            class="text-gray-900 hover:text-awac-primary transition-colors duration-200 whitespace-nowrap relative group"
          >
            Comment voter ?
            <span
              class="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-awac-primary to-awac-accent transition-all duration-300 group-hover:w-full"
            ></span>
          </a>
          <a
            href="#grand-prix"
            class="text-gray-900 hover:text-awac-primary transition-colors duration-200 whitespace-nowrap relative group"
          >
            Le Grand Prix
            <span
              class="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-awac-primary to-awac-accent transition-all duration-300 group-hover:w-full"
            ></span>
          </a>
          <NuxtLink
            to="/recu"
            class="text-gray-900 hover:text-awac-primary transition-colors duration-200 whitespace-nowrap relative group"
          >
            Vérifier mon vote
            <span
              class="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-awac-primary to-awac-accent transition-all duration-300 group-hover:w-full"
            ></span>
          </NuxtLink>
        </div>

        <div class="flex items-center gap-2">
          <NuxtLink
            to="/recu"
            class="md:hidden grid place-items-center w-11 h-11 rounded-md border border-gray-200 text-gray-700 hover:text-awac-primary hover:border-awac-primary transition-colors duration-200"
            aria-label="Vérifier mon vote"
          >
            <span class="material-icons text-xl">receipt_long</span>
          </NuxtLink>
          <a
            href="#candidats"
            class="btn-awac text-[10px] lg:text-xs py-3 px-4 lg:px-6 gap-2 lg:gap-3 rounded-md"
          >
            <span class="material-icons text-sm lg:text-base">how_to_vote</span>
            <span class="hidden xl:inline">VOTER RAPIDEMENT</span>
            <span class="xl:hidden">VOTER</span>
          </a>
        </div>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import awacLogo from '../assets/img/awac.png'
const isScrolled = ref(false)
const handleScroll = () => {
  isScrolled.value = window.scrollY > 50
}
onMounted(() => {
  window.addEventListener('scroll', handleScroll, { passive: true })
})
onBeforeUnmount(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<style scoped>
nav {
  animation: slideDown 0.6s ease-out;
}
@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
nav {
  transition:
    background-color 0.3s ease,
    box-shadow 0.3s ease;
}
nav img {
  filter: drop-shadow(0 2px 8px rgba(239, 121, 82, 0.1));
  transition: filter 0.3s ease;
}
nav img:hover {
  filter: drop-shadow(0 4px 16px rgba(239, 121, 82, 0.2));
}
</style>
