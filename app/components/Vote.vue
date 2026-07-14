<template>
  <section
    id="candidats"
    ref="sectionRef"
    class="bg-[#F9F8F6] py-24 md:py-32 border-t border-gray-100 selection:bg-awac-primary/10"
  >
    <div class="container mx-auto px-6 max-w-6xl">
      <div class="text-center max-w-xl mx-auto mb-24 space-y-4">
        <h2
          class="text-gray-900 font-heading font-black text-4xl md:text-5xl tracking-tight uppercase leading-none opacity-0 translate-y-8 transition-all duration-700 ease-out"
          :class="isVisible ? 'opacity-100 translate-y-0' : ''"
        >
          Qui va gagner les awards ?
        </h2>

        <p
          class="text-gray-500 font-sans text-sm md:text-base font-medium opacity-0 translate-y-8 transition-all duration-700 ease-out delay-150"
          :class="isVisible ? 'opacity-100 translate-y-0' : ''"
        >
          Découvrez les créateurs du Mono et propulsez votre favori en tête.
        </p>
      </div>

      <div v-if="loading" class="flex justify-center py-12">
        <div
          class="animate-spin rounded-full h-8 w-8 border-2 border-awac-primary border-t-transparent"
        ></div>
      </div>

      <div v-else-if="error" class="text-center py-12 text-red-500">
        {{ error }}
      </div>

      <div v-else-if="candidats.length === 0" class="text-center py-12 text-gray-400">
        Aucun candidat pour le moment.
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 max-w-5xl mx-auto">
        <div
          v-for="(candidat, index) in candidats"
          :key="candidat.id"
          class="flex flex-col group relative bg-white border rounded-[2.5rem_0_2.5rem_0] overflow-hidden transition-all duration-500 hover:-translate-y-1"
          :class="[
            isVisible ? 'card-visible' : '',
            index === 0 ? 'card-first' : '',
            index === 1 ? 'card-second' : '',
            index === 2 ? 'card-third' : '',
            index > 2 ? 'card-other' : '',
          ]"
          :style="{ transitionDelay: isVisible ? `${0.1 + index * 0.08}s` : '0s' }"
        >
          <router-link
            :to="`/candidat/${candidat.id}`"
            class="relative block w-full h-[280px] overflow-hidden bg-gradient-to-b from-[#FBF7F4] via-[#F6EFEA] to-[#EFE6DF]"
            :aria-label="`Voir les réalisations de ${candidat.full_name}`"
          >
            <img
              :src="candidat.profile_photo_url || defaultPhoto"
              :alt="candidat.full_name"
              class="w-full h-full object-cover object-top transition-transform duration-700"
              @error="(e) => (e.target.src = defaultPhoto)"
            />

            <div
              class="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white via-white/70 to-transparent"
            ></div>

            <div
              class="absolute top-4 left-4 z-20 bg-black/40 backdrop-blur-md border border-white/20 text-white font-heading font-black text-[10px] tracking-widest px-3 py-1.5 rounded-full shadow-sm rank-badge"
              :class="isVisible ? 'rank-visible' : ''"
              :style="{ transitionDelay: isVisible ? `${0.3 + index * 0.08}s` : '0s' }"
            >
              N<sup>o</sup> {{ formatBadgeNumber(index) }}
            </div>
          </router-link>

          <div class="p-5 space-y-4 bg-white relative">
            <div class="flex justify-between items-end">
              <div class="space-y-0.5">
                <h3 class="text-gray-900 font-heading font-black text-lg uppercase tracking-wide">
                  <router-link
                    :to="`/candidat/${candidat.id}`"
                    class="hover:text-awac-primary transition-colors duration-300"
                  >
                    {{ candidat.full_name }}
                  </router-link>
                </h3>

                <p class="text-gray-500 font-sans font-medium text-xs tracking-wider uppercase">
                  votes obtenus
                </p>
              </div>

              <div
                class="rank-medallion shrink-0 grid place-items-center w-14 h-14 rounded-full font-heading font-black text-base leading-none ring-1 ring-black/5 select-none px-1"
                :aria-label="`${candidat.vote_count || 0} votes obtenus`"
              >
                {{ formatVotes(candidat.vote_count || 0) }}
              </div>
            </div>

            <div class="h-[1px] w-full bg-gray-100"></div>

            <VoteQuantityStepper
              :model-value="getQuantity(candidat.id)"
              :unit-price="unitPrice"
              :currency="currency"
              :candidate-name="candidat.full_name"
              @update:model-value="(value) => setQuantity(candidat.id, value)"
            />

            <div class="flex flex-col gap-3 w-full">
              <router-link
                :to="`/candidat/${candidat.id}`"
                class="w-full border border-gray-200 text-gray-700 font-heading font-bold text-[11px] tracking-widest uppercase py-3 rounded-xl transition-all duration-300 hover:border-awac-primary hover:text-awac-primary flex items-center justify-center gap-2 px-4 active:scale-[0.98]"
              >
                <span class="material-icons text-base shrink-0">photo_library</span>
                <span class="font-heading font-black tracking-wider">Voir ses réalisations</span>
              </router-link>

              <button
                @click="openVoteModal(candidat)"
                class="btn-awac w-full text-[11px] py-3.5 px-4"
              >
                <span class="material-icons text-base shrink-0">how_to_vote</span>
                <span class="font-heading font-black tracking-wider">VOTER</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <VoteModal
      :candidate="selectedCandidate"
      :initial-quantity="selectedCandidate ? getQuantity(selectedCandidate.id) : MIN_VOTE_QUANTITY"
      :unit-price="unitPrice"
      :currency="currency"
      @close="selectedCandidate = null"
      @voted="onVoted"
    />
  </section>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { voteService } from '~/utils/voteService'
import { useVotePricing } from '~/composables/useVotePricing'
import { MIN_VOTE_QUANTITY, clampVoteQuantity } from '~/utils/voteQuantity'
const sectionRef = ref(null)
const isVisible = ref(false)
const loading = ref(true)
const error = ref('')
const selectedCandidate = ref(null)
const defaultPhoto = new URL('../assets/img/candidat/candidat.jpg', import.meta.url).href
const candidats = ref([])
const voteQuantities = ref({})
const { unitPrice, currency, loadVotePricing } = useVotePricing()
const getQuantity = (candidateId) => voteQuantities.value[candidateId] ?? MIN_VOTE_QUANTITY
const setQuantity = (candidateId, value) => {
  voteQuantities.value[candidateId] = clampVoteQuantity(value)
}
const formatBadgeNumber = (index) => String(index + 1).padStart(2, '0')

const formatVotes = (count) => {
  const value = Number(count) || 0
  if (value >= 10000) return `${Math.round(value / 1000)}k`
  if (value >= 1000) return `${(value / 1000).toFixed(1).replace('.', ',').replace(',0', '')}k`
  return String(value)
}
const loadCandidates = async () => {
  loading.value = true
  error.value = ''
  try {
    candidats.value = await voteService.getCandidates()
  } catch (err) {
    console.error('Erreur chargement candidats:', err)
    error.value = 'Impossible de charger les candidats.'
  } finally {
    loading.value = false
  }
}
const openVoteModal = (candidat) => {
  if (!candidat) return
  selectedCandidate.value = candidat
}
const onVoted = (result) => {
  const updatedCandidate = candidats.value.find((c) => c.id === selectedCandidate.value?.id)
  if (updatedCandidate) {
    updatedCandidate.vote_count = result.votes_after
    candidats.value.sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0))
  }
}
let observer = null
onMounted(() => {
  loadCandidates()
  loadVotePricing()
  observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        isVisible.value = true
        observer.unobserve(entry.target)
      }
    },
    { threshold: 0.1, rootMargin: '0px 0px -50px 0px' },
  )
  if (sectionRef.value) observer.observe(sectionRef.value)
})
onBeforeUnmount(() => {
  if (observer) observer.disconnect()
})
</script>

<style scoped>
.card-visible {
  animation: cardEntry 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}
@keyframes cardEntry {
  0% {
    opacity: 0;
    transform: translateY(50px) scale(0.95);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
.rank-badge {
  opacity: 0;
  transform: scale(0.5) rotate(-10deg);
  transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.rank-visible {
  opacity: 1;
  transform: scale(1) rotate(0deg);
}
.card-visible::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  border-radius: 2.5rem 0 2.5rem 0;
  background: linear-gradient(
    135deg,
    transparent 40%,
    rgba(239, 121, 82, 0.03) 50%,
    transparent 60%
  );
  animation: shimmerCard 1.2s ease-out both;
  animation-delay: inherit;
}
@keyframes shimmerCard {
  0% {
    transform: translateX(-100%) rotate(25deg);
  }
  100% {
    transform: translateX(200%) rotate(25deg);
  }
}

.card-first {
  border-color: #ffd700 !important;
  box-shadow:
    0 0 30px rgba(255, 215, 0, 0.15),
    0 15px 40px rgba(0, 0, 0, 0.05) !important;
}
.card-first .rank-badge {
  background: linear-gradient(135deg, #ffd700, #ffa500) !important;
  border-color: #ffd700 !important;
  color: #1a1a1a !important;
}
.card-second {
  border-color: #c0c0c0 !important;
  box-shadow:
    0 0 20px rgba(192, 192, 192, 0.1),
    0 15px 40px rgba(0, 0, 0, 0.05) !important;
}
.card-second .rank-badge {
  background: linear-gradient(135deg, #c0c0c0, #a8a8a8) !important;
  border-color: #c0c0c0 !important;
  color: #1a1a1a !important;
}
.card-third {
  border-color: #cd7f32 !important;
  box-shadow:
    0 0 15px rgba(205, 127, 50, 0.08),
    0 15px 40px rgba(0, 0, 0, 0.05) !important;
}
.card-third .rank-badge {
  background: linear-gradient(135deg, #cd7f32, #b87333) !important;
  border-color: #cd7f32 !important;
  color: #1a1a1a !important;
}
.card-other {
  border-color: #e5e7eb !important;
}
.card-other .rank-badge {
  background: rgba(0, 0, 0, 0.4) !important;
  border-color: rgba(255, 255, 255, 0.2) !important;
  color: white !important;
}

.rank-medallion {
  background: linear-gradient(135deg, #ffd700, #ffa500);
  color: #1a1a1a;
  box-shadow: 0 6px 16px rgba(255, 183, 0, 0.4);
  transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}
.group:hover .rank-medallion {
  transform: scale(1.06) rotate(-3deg);
}

.card-first:hover {
  box-shadow:
    0 0 50px rgba(255, 215, 0, 0.25),
    0 30px 60px rgba(0, 0, 0, 0.08) !important;
  border-color: #ffd700 !important;
}
.card-second:hover {
  box-shadow:
    0 0 35px rgba(192, 192, 192, 0.2),
    0 30px 60px rgba(0, 0, 0, 0.08) !important;
  border-color: #c0c0c0 !important;
}
.card-third:hover {
  box-shadow:
    0 0 25px rgba(205, 127, 50, 0.15),
    0 30px 60px rgba(0, 0, 0, 0.08) !important;
  border-color: #cd7f32 !important;
}

button {
  cursor: pointer;
}
button:active {
  transform: scale(0.95);
}
input[type='number'] {
  transition: all 0.2s ease;
}
input[type='number']:focus {
  color: #ef7952;
}
.group:hover .rank-badge {
  background: rgba(239, 121, 82, 0.9) !important;
  border-color: rgba(239, 121, 82, 0.3) !important;
}
.group:hover img {
  transform: scale(1.05);
}
@media (max-width: 768px) {
  .card-visible {
    animation-duration: 0.6s;
  }
}
</style>
