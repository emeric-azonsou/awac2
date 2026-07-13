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
        <div class="animate-spin rounded-full h-8 w-8 border-2 border-awac-primary border-t-transparent"></div>
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
            index > 2 ? 'card-other' : ''
          ]"
          :style="{ transitionDelay: isVisible ? `${0.1 + index * 0.08}s` : '0s' }"
        >
          <router-link
            :to="`/candidat/${candidat.id}`"
            class="relative block w-full h-[380px] overflow-hidden bg-gray-50"
            :aria-label="`Voir les réalisations de ${candidat.full_name}`"
          >
            <img
              :src="candidat.profile_photo_url || defaultPhoto"
              :alt="candidat.full_name"
              class="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-102"
              @error="(e) => e.target.src = defaultPhoto"
            />

            <div
              class="absolute top-4 left-4 z-20 bg-black/40 backdrop-blur-md border border-white/20 text-white font-heading font-black text-[10px] tracking-widest px-3 py-1.5 rounded-full shadow-sm rank-badge"
              :class="isVisible ? 'rank-visible' : ''"
              :style="{ transitionDelay: isVisible ? `${0.3 + index * 0.08}s` : '0s' }"
            >
              N<sup>o</sup> {{ formatBadgeNumber(index) }}
            </div>
          </router-link>

          <div class="p-6 space-y-5 bg-white relative">
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
                  <span class="text-gray-900 font-heading font-black text-sm">{{
                    candidat.vote_count || 0
                  }}</span>
                  votes obtenus
                </p>
              </div>

              <span
                class="font-heading font-black text-4xl text-awac-primary group-hover:text-awac-primary transition-colors duration-300 select-none"
              >
                {{ index === 0 ? '🏆' :  + (index + 1) }}
              </span>
            </div>

            <div class="h-[1px] w-full bg-gray-100"></div>

            <div class="flex flex-col gap-3 w-full">
              <button
                @click="openVoteModal(candidat)"
                class="relative w-full overflow-hidden bg-awac-dark text-white font-heading font-bold text-[11px] tracking-widest uppercase py-3.5 rounded-xl shadow-sm transition-all duration-300 transform hover:-translate-y-0.5 isolation-auto z-10 before:absolute before:inset-0 before:-z-10 before:bg-gradient-to-r before:from-awac-primary before:to-awac-accent before:transition-opacity before:duration-300 hover:before:opacity-0 flex items-center justify-center gap-2 px-4 hover:shadow-lg active:scale-[0.98]"
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
      :unit-price="unitPrice"
      :currency="currency"
      @close="selectedCandidate = null"
      @voted="onVoted"
    />
  </section>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { voteService } from '@/services/voteService'
import { useVotePricing } from '@/composables/useVotePricing'
import VoteModal from '@/components/VoteModal.vue'

const sectionRef = ref(null)
const isVisible = ref(false)
const loading = ref(true)
const error = ref('')
const selectedCandidate = ref(null)

const defaultPhoto = new URL('../assets/img/candidat/candidat.jpg', import.meta.url).href
const candidats = ref([])
const { unitPrice, currency, loadVotePricing } = useVotePricing()

const formatBadgeNumber = (index) => String(index + 1).padStart(2, '0')

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
  const updatedCandidate = candidats.value.find(c => c.id === selectedCandidate.value?.id)
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
    { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
  )
  if (sectionRef.value) observer.observe(sectionRef.value)
})

onBeforeUnmount(() => {
  if (observer) observer.disconnect()
})
</script>

<style scoped>
/* ... (mêmes styles que précédemment) ... */
.card-visible { animation: cardEntry 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
@keyframes cardEntry { 0% { opacity:0; transform:translateY(50px) scale(0.95); } 100% { opacity:1; transform:translateY(0) scale(1); } }
.rank-badge { opacity:0; transform:scale(0.5) rotate(-10deg); transition: all 0.5s cubic-bezier(0.34,1.56,0.64,1); }
.rank-visible { opacity:1; transform:scale(1) rotate(0deg); }
.card-visible::before { content:''; position:absolute; inset:0; z-index:1; pointer-events:none; border-radius:2.5rem 0 2.5rem 0; background:linear-gradient(135deg,transparent 40%,rgba(239,121,82,0.03) 50%,transparent 60%); animation:shimmerCard 1.2s ease-out both; animation-delay:inherit; }
@keyframes shimmerCard { 0% { transform:translateX(-100%) rotate(25deg); } 100% { transform:translateX(200%) rotate(25deg); } }

.card-first { border-color: #FFD700 !important; box-shadow: 0 0 30px rgba(255,215,0,0.15), 0 15px 40px rgba(0,0,0,0.05) !important; }
.card-first .rank-badge { background: linear-gradient(135deg, #FFD700, #FFA500) !important; border-color: #FFD700 !important; color: #1a1a1a !important; }
.card-second { border-color: #C0C0C0 !important; box-shadow: 0 0 20px rgba(192,192,192,0.1), 0 15px 40px rgba(0,0,0,0.05) !important; }
.card-second .rank-badge { background: linear-gradient(135deg, #C0C0C0, #A8A8A8) !important; border-color: #C0C0C0 !important; color: #1a1a1a !important; }
.card-third { border-color: #CD7F32 !important; box-shadow: 0 0 15px rgba(205,127,50,0.08), 0 15px 40px rgba(0,0,0,0.05) !important; }
.card-third .rank-badge { background: linear-gradient(135deg, #CD7F32, #B87333) !important; border-color: #CD7F32 !important; color: #1a1a1a !important; }
.card-other { border-color: #e5e7eb !important; }
.card-other .rank-badge { background: rgba(0,0,0,0.4) !important; border-color: rgba(255,255,255,0.2) !important; color: white !important; }

.card-first:hover { box-shadow: 0 0 50px rgba(255,215,0,0.25), 0 30px 60px rgba(0,0,0,0.08) !important; border-color: #FFD700 !important; }
.card-second:hover { box-shadow: 0 0 35px rgba(192,192,192,0.2), 0 30px 60px rgba(0,0,0,0.08) !important; border-color: #C0C0C0 !important; }
.card-third:hover { box-shadow: 0 0 25px rgba(205,127,50,0.15), 0 30px 60px rgba(0,0,0,0.08) !important; border-color: #CD7F32 !important; }

button { cursor:pointer; }
button:active { transform:scale(0.95); }
input[type='number'] { transition:all 0.2s ease; }
input[type='number']:focus { color:#ef7952; }
.group:hover .rank-badge { background:rgba(239,121,82,0.9) !important; border-color:rgba(239,121,82,0.3) !important; }
.group:hover img { transform:scale(1.05); }
@media (max-width:768px) { .card-visible { animation-duration:0.6s; } }
</style>