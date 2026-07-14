<template>
  <div class="min-h-screen bg-[#F9F8F6] selection:bg-awac-primary/10">
    <header class="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-100">
      <div class="container mx-auto px-6 max-w-6xl h-16 flex items-center justify-between gap-4">
        <router-link
          to="/"
          class="flex items-center gap-2 shrink-0"
          aria-label="Retour à l'accueil AWAC"
        >
          <img
            src="@/assets/img/awac.png"
            alt="AWAC — Awards des Couturier·e·s du Mono"
            class="h-9 w-auto"
          />
        </router-link>
        <router-link
          to="/#candidats"
          class="flex items-center gap-1.5 text-gray-500 hover:text-awac-primary font-sans font-semibold text-xs uppercase tracking-wider transition-colors"
        >
          <span class="material-icons text-base">arrow_back</span>
          Tous les candidats
        </router-link>
      </div>
    </header>

    <main class="container mx-auto px-6 max-w-lg py-16 md:py-24 space-y-10">
      <div class="text-center space-y-4">
        <h1
          class="text-gray-900 font-heading font-black text-3xl md:text-4xl tracking-tight uppercase leading-none"
        >
          Vérifier mon vote
        </h1>
        <p class="text-gray-500 font-sans text-sm md:text-base">
          Saisissez le code reçu affiché lors de votre vote pour vérifier qu'il a bien été
          comptabilisé.
        </p>
      </div>

      <form
        class="bg-white border border-gray-200 rounded-[2.5rem_0_2.5rem_0] shadow-sm p-8 space-y-4"
        @submit.prevent="openReceipt"
      >
        <label
          for="receipt-code"
          class="block text-xs font-semibold text-gray-500 uppercase tracking-wider"
        >
          Code reçu
        </label>
        <input
          id="receipt-code"
          v-model="code"
          type="text"
          autocomplete="off"
          autocapitalize="characters"
          spellcheck="false"
          placeholder="AWAC-0000000000000-XXXXXXXX"
          class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-awac-primary focus:ring-2 focus:ring-awac-primary/20 outline-none transition-all font-mono text-sm"
        />
        <p v-if="errorMessage" class="text-sm text-red-500">{{ errorMessage }}</p>
        <button
          type="submit"
          class="w-full flex items-center justify-center gap-2 bg-awac-dark text-white font-heading font-black text-[11px] tracking-widest uppercase py-3.5 rounded-xl shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98] relative overflow-hidden isolation-auto z-10 before:absolute before:inset-0 before:-z-10 before:bg-gradient-to-r before:from-awac-primary before:to-awac-accent before:transition-opacity before:duration-300 hover:before:opacity-0"
        >
          <span class="material-icons text-base">receipt_long</span>
          Voir mon reçu
        </button>
      </form>

      <div v-if="recentVotes.length > 0" class="space-y-3">
        <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">
          Vos votes récents sur cet appareil
        </p>
        <NuxtLink
          v-for="vote in recentVotes"
          :key="vote.receipt_code"
          :to="`/recu/${vote.receipt_code}`"
          class="flex items-center justify-between gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3 hover:border-awac-primary transition-colors group"
        >
          <div class="min-w-0">
            <p class="text-sm text-gray-900 font-semibold">{{ vote.candidate_name }}</p>
            <p class="font-mono text-[11px] text-gray-500 break-all">{{ vote.receipt_code }}</p>
          </div>
          <span
            class="material-icons text-gray-300 group-hover:text-awac-primary transition-colors shrink-0"
            aria-hidden="true"
          >
            chevron_right
          </span>
        </NuxtLink>
      </div>
    </main>

    <Footer />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { listPendingVotes } from '~/utils/pendingVotes'

const router = useRouter()
const code = ref('')
const errorMessage = ref('')
const recentVotes = ref([])

const openReceipt = () => {
  const normalized = code.value.trim().toUpperCase()
  if (!normalized.startsWith('AWAC-') || normalized.length < 15) {
    errorMessage.value = 'Le code ressemble à AWAC-…-XXXXXXXX, vérifiez votre saisie.'
    return
  }
  errorMessage.value = ''
  router.push(`/recu/${normalized}`)
}

onMounted(() => {
  recentVotes.value = listPendingVotes()
})
</script>
