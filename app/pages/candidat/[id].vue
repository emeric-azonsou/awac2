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
          class="hidden sm:flex items-center gap-1.5 text-gray-500 hover:text-awac-primary font-sans font-semibold text-xs uppercase tracking-wider transition-colors"
        >
          <span class="material-icons text-base">arrow_back</span>
          Tous les candidats
        </router-link>

        <button v-if="candidate" @click="showVote = true" class="btn-awac text-[11px] py-2.5 px-5">
          <span class="material-icons text-base">how_to_vote</span>
          Voter
        </button>
      </div>
    </header>

    <div v-if="loading" class="flex justify-center py-40">
      <div
        class="animate-spin rounded-full h-8 w-8 border-2 border-awac-primary border-t-transparent"
      ></div>
    </div>

    <div v-else-if="notFound" class="container mx-auto px-6 max-w-xl text-center py-32 space-y-6">
      <span class="material-icons text-6xl text-gray-300">person_search</span>
      <h1 class="text-gray-900 font-heading font-black text-3xl uppercase tracking-tight">
        Candidat introuvable
      </h1>
      <p class="text-gray-500 font-sans text-sm">
        Ce profil n'existe pas ou n'est plus en compétition.
      </p>
      <router-link
        to="/#candidats"
        class="inline-flex items-center gap-2 px-6 py-3 bg-awac-primary text-white font-heading font-black text-[11px] tracking-widest uppercase rounded-xl hover:bg-awac-primaryDark transition-colors"
      >
        <span class="material-icons text-base">arrow_back</span>
        Voir tous les candidats
      </router-link>
    </div>

    <div v-else-if="error" class="container mx-auto px-6 max-w-xl text-center py-32 space-y-6">
      <span class="material-icons text-6xl text-gray-300">wifi_off</span>
      <p class="text-gray-500 font-sans text-sm">{{ error }}</p>
      <button
        @click="loadCandidate"
        class="inline-flex items-center gap-2 px-6 py-3 bg-awac-primary text-white font-heading font-black text-[11px] tracking-widest uppercase rounded-xl hover:bg-awac-primaryDark transition-colors"
      >
        <span class="material-icons text-base">refresh</span>
        Réessayer
      </button>
    </div>

    <main v-else-if="candidate">
      <section class="container mx-auto px-6 max-w-6xl pt-12 md:pt-20 pb-16">
        <div class="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-16 items-end">
          <div class="md:col-span-5 profile-reveal">
            <div
              class="relative w-full max-w-sm mx-auto md:mx-0 h-[420px] overflow-hidden bg-gray-100 rounded-[2.5rem_0_2.5rem_0] border border-gray-200"
            >
              <img
                :src="candidate.profile_photo_url || defaultPhoto"
                :alt="`Portrait de ${candidate.full_name}`"
                class="w-full h-full object-cover object-top"
                @error="(e) => (e.target.src = defaultPhoto)"
              />
            </div>
          </div>

          <div
            class="md:col-span-7 space-y-5 text-center md:text-left profile-reveal profile-reveal-delayed"
          >
            <h1
              class="text-gray-900 font-heading font-black text-4xl md:text-6xl tracking-tight uppercase leading-none"
              style="text-wrap: balance"
            >
              {{ candidate.full_name }}
            </h1>

            <p
              v-if="candidate.atelier || candidate.commune"
              class="text-gray-500 font-sans font-medium text-sm md:text-base tracking-wider uppercase"
            >
              <span v-if="candidate.atelier" class="text-gray-900 font-semibold">{{
                candidate.atelier
              }}</span>
              <span v-if="candidate.atelier && candidate.commune"> · </span>
              <span v-if="candidate.commune">{{ candidate.commune }}</span>
            </p>

            <div class="flex items-center justify-center md:justify-start gap-3">
              <span
                class="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-full px-5 py-2.5 shadow-sm"
              >
                <span class="material-icons text-awac-primary text-lg">how_to_vote</span>
                <span class="font-heading font-black text-2xl text-gray-900">{{
                  candidate.vote_count
                }}</span>
                <span class="text-gray-500 font-sans font-medium text-xs tracking-wider uppercase"
                  >votes</span
                >
              </span>
            </div>

            <p
              class="text-gray-500 font-sans text-sm md:text-base leading-relaxed max-w-md mx-auto md:mx-0"
            >
              Chaque vote de 100 F rapproche {{ firstName }} de la victoire aux Awards des
              Couturier·e·s du Mono.
            </p>

            <VoteQuantityStepper
              v-model="voteQuantity"
              :unit-price="unitPrice"
              :currency="currency"
              :candidate-name="candidate.full_name"
              class="max-w-xs mx-auto md:mx-0"
            />

            <button @click="showVote = true" class="btn-awac text-xs py-4 px-8">
              <span class="material-icons text-lg">how_to_vote</span>
              Voter pour {{ firstName }}
            </button>
          </div>
        </div>
      </section>

      <section class="border-t border-gray-100 bg-white">
        <div class="container mx-auto px-6 max-w-6xl py-16 md:py-24">
          <h2
            class="text-gray-900 font-heading font-black text-3xl md:text-4xl tracking-tight uppercase leading-none mb-12"
          >
            Ses réalisations
          </h2>

          <div v-if="candidate.photos.length === 0" class="text-center py-16 space-y-4">
            <span class="material-icons text-5xl text-gray-200">checkroom</span>
            <p class="text-gray-500 font-sans text-sm">
              Les créations de {{ firstName }} arrivent bientôt. Vous pouvez déjà voter pour
              soutenir {{ firstName }} !
            </p>
          </div>

          <div v-else class="space-y-10">
            <figure class="gallery-item">
              <div
                class="w-full max-h-[70vh] overflow-hidden rounded-[2.5rem_0_2.5rem_0] bg-gray-100"
              >
                <img
                  :src="candidate.photos[0].photo_url"
                  :alt="candidate.photos[0].caption || `Réalisation de ${candidate.full_name}`"
                  class="w-full h-full object-cover"
                  loading="eager"
                />
              </div>
              <figcaption
                v-if="candidate.photos[0].caption"
                class="mt-3 text-gray-500 font-sans text-sm"
              >
                {{ candidate.photos[0].caption }}
              </figcaption>
            </figure>

            <div
              v-if="candidate.photos.length > 1"
              class="grid gap-8"
              style="grid-template-columns: repeat(auto-fit, minmax(280px, 1fr))"
            >
              <figure
                v-for="photo in candidate.photos.slice(1)"
                :key="photo.id"
                class="gallery-item"
              >
                <div class="w-full h-[380px] overflow-hidden rounded-2xl bg-gray-100">
                  <img
                    :src="photo.photo_url"
                    :alt="photo.caption || `Réalisation de ${candidate.full_name}`"
                    class="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                    loading="lazy"
                  />
                </div>
                <figcaption v-if="photo.caption" class="mt-3 text-gray-500 font-sans text-sm">
                  {{ photo.caption }}
                </figcaption>
              </figure>
            </div>
          </div>
        </div>
      </section>

      <section class="bg-awac-dark py-16 md:py-20">
        <div class="container mx-auto px-6 max-w-3xl text-center space-y-6">
          <h2
            class="text-white font-heading font-black text-3xl md:text-4xl tracking-tight uppercase leading-none"
            style="text-wrap: balance"
          >
            Propulsez {{ firstName }} vers la victoire
          </h2>
          <button @click="showVote = true" class="btn-awac text-xs px-8 py-4">
            <span class="material-icons text-lg">how_to_vote</span>
            Voter pour {{ firstName }}
          </button>
        </div>
      </section>

      <div
        class="sm:hidden fixed bottom-0 inset-x-0 z-30 p-4 bg-gradient-to-t from-white via-white/95 to-transparent pointer-events-none"
      >
        <button
          @click="showVote = true"
          class="btn-awac w-full py-3.5 text-[11px] pointer-events-auto"
        >
          <span class="material-icons text-base">how_to_vote</span>
          Voter pour {{ firstName }} — {{ candidate.vote_count }} votes
        </button>
      </div>

      <VoteModal
        :candidate="showVote ? candidate : null"
        :initial-quantity="voteQuantity"
        :unit-price="unitPrice"
        :currency="currency"
        @close="showVote = false"
        @voted="onVoted"
      />
    </main>

    <Footer />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { voteService } from '~/utils/voteService'
import { useVotePricing } from '@/composables/useVotePricing'
import { ApiError } from '~/utils/api'
import { MIN_VOTE_QUANTITY } from '~/utils/voteQuantity'
const route = useRoute()
const defaultPhoto = new URL('../../assets/img/candidat/candidat.jpg', import.meta.url).href
const candidate = ref(null)
const loading = ref(true)
const notFound = ref(false)
const error = ref('')
const showVote = ref(false)
const voteQuantity = ref(MIN_VOTE_QUANTITY)
const { unitPrice, currency, loadVotePricing } = useVotePricing()
const firstName = computed(() => candidate.value?.full_name.split(' ')[0] || '')
const loadCandidate = async () => {
  loading.value = true
  error.value = ''
  notFound.value = false
  try {
    candidate.value = await voteService.getCandidate(route.params.id)
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      notFound.value = true
    } else {
      console.error('Erreur chargement candidat:', err)
      error.value = 'Impossible de charger ce profil. Vérifiez votre connexion.'
    }
  } finally {
    loading.value = false
  }
}
const onVoted = (result) => {
  if (candidate.value) candidate.value.vote_count = result.votes_after
}
onMounted(() => {
  loadCandidate()
  loadVotePricing()
})
</script>

<style scoped>
.profile-reveal {
  animation: profileReveal 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;
}
.profile-reveal-delayed {
  animation-delay: 0.15s;
}
@keyframes profileReveal {
  from {
    opacity: 0;
    transform: translateY(24px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.gallery-item {
  animation: profileReveal 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;
}
@media (prefers-reduced-motion: reduce) {
  .profile-reveal,
  .profile-reveal-delayed,
  .gallery-item {
    animation: none;
  }
}
button {
  cursor: pointer;
}
</style>
