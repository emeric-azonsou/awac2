<template>
  <div
    v-if="confirmedVotes.length > 0"
    class="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:right-6 sm:max-w-sm z-40 space-y-2"
    role="status"
  >
    <div
      v-for="vote in confirmedVotes"
      :key="vote.receipt_code"
      class="banner-enter flex items-start gap-3 bg-white border border-green-500/30 rounded-2xl shadow-xl px-4 py-3"
    >
      <span class="material-icons text-green-500 shrink-0" aria-hidden="true">check_circle</span>
      <div class="min-w-0 flex-1 space-y-1">
        <p class="text-sm text-gray-900 font-semibold">
          Votre vote pour {{ vote.candidate_name }} a bien été comptabilisé !
        </p>
        <NuxtLink
          :to="`/recu/${vote.receipt_code}`"
          class="inline-block text-xs text-awac-primary font-semibold hover:underline"
        >
          Voir mon reçu →
        </NuxtLink>
      </div>
      <button
        class="p-1 rounded-lg hover:bg-gray-100 transition-colors shrink-0"
        aria-label="Fermer la notification"
        @click="dismiss(vote.receipt_code)"
      >
        <span class="material-icons text-base text-gray-400" aria-hidden="true">close</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { voteService } from '~/utils/voteService'
import { listPendingVotes, forgetPendingVote } from '~/utils/pendingVotes'

const confirmedVotes = ref([])

const dismiss = (code) => {
  confirmedVotes.value = confirmedVotes.value.filter((vote) => vote.receipt_code !== code)
}

// Au retour sur le site : re-vérifie les votes laissés en attente lors d'une
// visite précédente et prouve au votant que son paiement a bien été compté.
onMounted(async () => {
  for (const pending of listPendingVotes()) {
    try {
      const receipt = await voteService.getReceipt(pending.receipt_code)
      if (receipt.payment_status === 'confirmed') {
        confirmedVotes.value.push({
          receipt_code: receipt.receipt_code,
          candidate_name: receipt.candidate_name,
        })
        forgetPendingVote(pending.receipt_code)
      } else if (receipt.payment_status === 'rejected') {
        forgetPendingVote(pending.receipt_code)
      }
      // pending : on garde la trace, revérifiée à la prochaine visite.
    } catch {
      // Reçu introuvable ou réseau : on réessaiera à la prochaine visite.
    }
  }
})
</script>

<style scoped>
.banner-enter {
  animation: bannerSlide 0.4s cubic-bezier(0.22, 1, 0.36, 1) both;
}
@keyframes bannerSlide {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@media (prefers-reduced-motion: reduce) {
  .banner-enter {
    animation: none;
  }
}
</style>
