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

    <main class="container mx-auto px-6 max-w-lg py-16 md:py-24">
      <div v-if="loading" class="flex justify-center py-24">
        <div
          class="animate-spin rounded-full h-8 w-8 border-2 border-awac-primary border-t-transparent"
        ></div>
      </div>

      <div v-else-if="notFound" class="text-center space-y-6 py-12">
        <span class="material-icons text-6xl text-gray-300">receipt_long</span>
        <h1 class="text-gray-900 font-heading font-black text-2xl uppercase tracking-tight">
          Reçu introuvable
        </h1>
        <p class="text-gray-500 font-sans text-sm">
          Vérifiez le code : il ressemble à <span class="font-mono">AWAC-…-XXXXXXXX</span>.
        </p>
      </div>

      <div
        v-else-if="receipt"
        class="bg-white border border-gray-200 rounded-[2.5rem_0_2.5rem_0] shadow-sm overflow-hidden"
      >
        <div class="px-8 pt-8 pb-6 space-y-4 text-center">
          <span
            class="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-heading font-black uppercase tracking-widest"
            :class="statusBadgeClass"
          >
            <span class="material-icons text-base" aria-hidden="true">{{ statusIcon }}</span>
            {{ statusLabel }}
          </span>

          <h1 class="text-gray-900 font-heading font-black text-2xl uppercase tracking-tight">
            Reçu de vote
          </h1>

          <p class="text-gray-500 font-sans text-sm">{{ statusExplanation }}</p>
        </div>

        <div class="h-[1px] bg-gray-100 mx-8"></div>

        <div
          v-if="receipt.votes_before !== null && receipt.votes_after !== null"
          class="votes-impact mx-8 mt-6 rounded-2xl px-6 py-4 flex items-center justify-between gap-4"
        >
          <div class="text-center space-y-0.5">
            <p class="text-[10px] font-heading font-black tracking-widest uppercase text-gray-500">
              Avant
            </p>
            <p class="font-heading font-black text-2xl text-gray-900 tabular-nums">
              {{ receipt.votes_before }}
            </p>
          </div>

          <div class="flex items-center gap-2 text-awac-primary">
            <span
              class="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 font-heading font-black text-sm shadow-sm tabular-nums"
            >
              +{{ receipt.quantity }}
              <span class="material-icons text-base" aria-hidden="true">trending_up</span>
            </span>
          </div>

          <div class="text-center space-y-0.5">
            <p class="text-[10px] font-heading font-black tracking-widest uppercase text-gray-500">
              Après
            </p>
            <p class="font-heading font-black text-2xl text-awac-accent tabular-nums">
              {{ receipt.votes_after }}
            </p>
          </div>
        </div>

        <dl class="px-8 py-6 space-y-3 text-sm">
          <div class="flex justify-between gap-4">
            <dt class="text-gray-500">Candidat·e</dt>
            <dd class="text-gray-900 font-semibold text-right">{{ receipt.candidate_name }}</dd>
          </div>
          <div class="flex justify-between gap-4">
            <dt class="text-gray-500">Nombre de voix</dt>
            <dd class="text-gray-900 font-semibold">{{ receipt.quantity }}</dd>
          </div>
          <div class="flex justify-between gap-4">
            <dt class="text-gray-500">Montant</dt>
            <dd class="text-gray-900 font-semibold">
              {{ formattedAmount }} {{ receipt.currency === 'XOF' ? 'FCFA' : receipt.currency }}
            </dd>
          </div>
          <div class="flex justify-between gap-4">
            <dt class="text-gray-500">Date</dt>
            <dd class="text-gray-900 font-semibold">{{ formattedDate }}</dd>
          </div>
          <div class="flex justify-between gap-4 items-baseline">
            <dt class="text-gray-500 shrink-0">Code reçu</dt>
            <dd class="flex items-baseline gap-2 min-w-0">
              <span class="font-mono text-xs font-bold text-gray-900 break-all text-right">
                {{ receipt.receipt_code }}
              </span>
              <button
                type="button"
                class="shrink-0 inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-[11px] font-semibold text-gray-600 hover:border-awac-primary hover:text-awac-primary transition-colors active:scale-95"
                :aria-label="copied ? 'Code copié' : 'Copier le code reçu'"
                @click="copyReceiptCode"
              >
                <span class="material-icons text-sm" aria-hidden="true">
                  {{ copied ? 'check' : 'content_copy' }}
                </span>
                {{ copied ? 'Copié' : 'Copier' }}
              </button>
            </dd>
          </div>
        </dl>

        <div v-if="receipt.payment_status === 'pending'" class="px-8 pb-8">
          <button
            @click="loadReceipt"
            class="w-full flex items-center justify-center gap-2 border border-gray-200 text-gray-700 font-heading font-black text-[11px] tracking-widest uppercase py-3 rounded-xl transition-all duration-300 hover:border-awac-primary hover:text-awac-primary active:scale-[0.98]"
          >
            <span class="material-icons text-base">refresh</span>
            Actualiser le statut
          </button>
        </div>
      </div>
    </main>

    <Footer />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { voteService } from '~/utils/voteService'
import { forgetPendingVote } from '~/utils/pendingVotes'
import { useCopyToClipboard } from '~/composables/useCopyToClipboard'
const route = useRoute()
const receipt = ref(null)
const loading = ref(true)
const notFound = ref(false)
const { copied, copy } = useCopyToClipboard()
const copyReceiptCode = () => copy(receipt.value?.receipt_code ?? '')
const STATUS_CONTENT = {
  confirmed: {
    label: 'Vote comptabilisé',
    icon: 'check_circle',
    badge: 'bg-green-100 text-green-700',
    explanation:
      'Votre paiement est confirmé et vos voix ont été ajoutées au compteur du candidat.',
  },
  pending: {
    label: 'En attente de paiement',
    icon: 'hourglass_top',
    badge: 'bg-amber-100 text-amber-700',
    explanation:
      "Le paiement n'a pas encore été confirmé par votre opérateur. Si vous avez payé, ce reçu se mettra à jour automatiquement.",
  },
  rejected: {
    label: 'Paiement refusé',
    icon: 'cancel',
    badge: 'bg-red-100 text-red-600',
    explanation:
      "Le paiement a été refusé ou annulé : aucune voix n'a été comptée et aucun montant n'est dû.",
  },
}
const statusContent = computed(
  () => STATUS_CONTENT[receipt.value?.payment_status] ?? STATUS_CONTENT.pending,
)
const statusLabel = computed(() => statusContent.value.label)
const statusIcon = computed(() => statusContent.value.icon)
const statusBadgeClass = computed(() => statusContent.value.badge)
const statusExplanation = computed(() => statusContent.value.explanation)
const formattedAmount = computed(() =>
  new Intl.NumberFormat('fr-FR').format(receipt.value?.amount ?? 0),
)
const formattedDate = computed(() => {
  if (!receipt.value?.created_at) return ''
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'short' }).format(
    new Date(receipt.value.created_at),
  )
})
const loadReceipt = async () => {
  loading.value = true
  notFound.value = false
  try {
    receipt.value = await voteService.getReceipt(String(route.params.code ?? ''))
    if (receipt.value.payment_status !== 'pending') {
      forgetPendingVote(receipt.value.receipt_code)
    }
  } catch {
    notFound.value = true
  } finally {
    loading.value = false
  }
}
onMounted(loadReceipt)
</script>

<style scoped>
.votes-impact {
  background: linear-gradient(135deg, rgba(239, 121, 82, 0.1), rgba(223, 65, 58, 0.08));
  box-shadow: inset 0 0 0 1px rgba(239, 121, 82, 0.25);
}
</style>
