<template>
  <div
    v-if="candidate && phase !== 'thanks'"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
    @click.self="phase === 'form' && close()"
  >
    <div
      class="bg-white/95 backdrop-blur-xl rounded-3xl border border-white/30 shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6 animate-slide-up"
    >
      <div class="flex items-center justify-between mb-5">
        <h3 class="text-lg font-heading font-black text-gray-900">
          Voter pour <span class="text-awac-primary">{{ candidate.full_name }}</span>
        </h3>
        <button
          v-if="phase === 'form'"
          @click="close"
          class="grid place-items-center w-10 h-10 -mr-2 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Fermer"
        >
          <span class="material-icons">close</span>
        </button>
      </div>

      <form v-if="phase === 'form'" @submit.prevent="submitVote" class="space-y-4">
        <div>
          <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1"
            >Pays <span class="text-red-500">*</span></label
          >
          <div class="relative">
            <select
              v-model="form.country"
              required
              :disabled="metaLoading"
              class="awac-select"
              @change="loadOperators"
            >
              <option
                v-for="country in countries"
                :key="country.country_code"
                :value="country.country_code"
              >
                {{ country.country_name }}
              </option>
            </select>
            <span
              class="material-icons absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              aria-hidden="true"
              >expand_more</span
            >
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1"
            >Moyen de paiement <span class="text-red-500">*</span></label
          >
          <div class="relative">
            <select
              v-model="form.operator"
              required
              :disabled="metaLoading || operators.length === 0"
              class="awac-select"
            >
              <option value="">{{ metaLoading ? 'Chargement…' : 'Sélectionner' }}</option>
              <option
                v-for="operator in operators"
                :key="operator.slug"
                :value="operator.code || operator.slug"
              >
                {{ operator.name }}
              </option>
            </select>
            <span
              class="material-icons absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
              :class="metaLoading || operators.length === 0 ? 'text-gray-300' : 'text-gray-400'"
              aria-hidden="true"
              >expand_more</span
            >
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1"
            >Numéro de téléphone <span class="text-red-500">*</span></label
          >
          <div class="flex items-center gap-2">
            <span
              class="px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-500 font-medium shrink-0"
              >{{ selectedPrefix }}</span
            >
            <input
              v-model="form.phone_number"
              type="tel"
              required
              class="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-awac-primary focus:ring-2 focus:ring-awac-primary/20 outline-none transition-all text-sm"
              placeholder="01 97 00 00 00"
            />
          </div>
        </div>

        <div
          class="flex items-center justify-between rounded-xl bg-gray-50 border border-gray-100 px-4 py-3"
        >
          <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            {{ form.quantity }} voix × {{ unitPrice }} {{ currency }}
          </span>
          <span class="font-heading font-black text-awac-accent tabular-nums"
            >{{ formattedTotal }} F</span
          >
        </div>

        <p v-if="errorMessage" class="text-sm text-red-500">{{ errorMessage }}</p>

        <div class="flex flex-col-reverse sm:flex-row items-center gap-3 pt-2">
          <button
            type="button"
            @click="close"
            class="w-full sm:w-auto px-5 py-2.5 border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 transition-colors text-sm"
          >
            Annuler
          </button>
          <button
            type="submit"
            class="w-full sm:w-auto flex-1 px-5 py-2.5 bg-awac-primary text-white font-semibold rounded-xl hover:bg-awac-primary/90 transition-colors shadow-sm text-sm flex items-center justify-center gap-2 disabled:opacity-70"
            :disabled="submitting"
          >
            <span
              v-if="submitting"
              class="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"
            ></span>
            {{ submitting ? 'Envoi...' : 'Voter' }}
          </button>
        </div>
      </form>

      <div v-else-if="phase === 'awaiting'" class="text-center py-6 space-y-5">
        <div
          class="animate-spin rounded-full h-12 w-12 border-2 border-awac-primary border-t-transparent mx-auto"
        ></div>
        <div class="space-y-2">
          <h4 class="font-heading font-black text-gray-900">Validez le paiement</h4>
          <p class="text-sm text-gray-600">
            Une demande de paiement a été envoyée à votre téléphone
            <span class="font-semibold">{{ selectedPrefix }} {{ form.phone_number }}</span
            >. Confirmez-la pour valider votre vote.
          </p>
        </div>
        <div
          v-if="receiptCode"
          class="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3 text-left space-y-2"
        >
          <p class="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
            Votre code reçu — gardez-le
          </p>
          <div class="flex items-center gap-2">
            <span class="min-w-0 flex-1 font-mono text-xs font-bold text-gray-900 break-all">
              {{ receiptCode }}
            </span>
            <button
              type="button"
              class="shrink-0 inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-gray-600 transition-colors hover:border-awac-primary hover:text-awac-primary active:scale-95"
              :aria-label="copied ? 'Code copié' : 'Copier le code reçu'"
              @click="copy(receiptCode)"
            >
              <span class="material-icons text-sm" aria-hidden="true">
                {{ copied ? 'check' : 'content_copy' }}
              </span>
              {{ copied ? 'Copié' : 'Copier' }}
            </button>
          </div>
          <NuxtLink
            :to="`/recu/${receiptCode}`"
            class="inline-block text-xs text-awac-accent font-semibold hover:underline"
          >
            Vérifier mon vote à tout moment →
          </NuxtLink>
        </div>
        <button @click="cancelPolling" class="text-xs text-gray-400 hover:text-gray-600 underline">
          Annuler l'attente
        </button>
      </div>

      <div v-else-if="phase === 'failed'" class="text-center py-6 space-y-5">
        <div class="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
          <span class="material-icons text-3xl text-red-500">error_outline</span>
        </div>
        <div class="space-y-2">
          <h4 class="font-heading font-black text-gray-900">Paiement non confirmé</h4>
          <p class="text-sm text-gray-600">{{ errorMessage }}</p>
          <NuxtLink
            v-if="receiptCode"
            :to="`/recu/${receiptCode}`"
            class="inline-block text-xs text-awac-accent font-semibold hover:underline"
          >
            Vérifier mon reçu ({{ receiptCode }})
          </NuxtLink>
        </div>
        <div class="flex gap-3">
          <button
            @click="close"
            class="flex-1 px-5 py-2.5 border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 transition-colors text-sm"
          >
            Fermer
          </button>
          <button
            @click="phase = 'form'"
            class="flex-1 px-5 py-2.5 bg-awac-primary text-white font-semibold rounded-xl hover:bg-awac-primary/90 transition-colors text-sm"
          >
            Réessayer
          </button>
        </div>
      </div>
    </div>
  </div>

  <div
    v-if="phase === 'thanks'"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
    @click.self="closeThanks"
  >
    <div
      class="bg-white/95 backdrop-blur-xl rounded-3xl border border-green-500/30 shadow-2xl w-full max-w-sm p-8 text-center animate-slide-up"
    >
      <div
        class="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5"
      >
        <span class="material-icons text-4xl text-green-500">check_circle</span>
      </div>
      <h3 class="text-2xl font-heading font-black text-gray-900 mb-2">Merci pour votre vote !</h3>
      <p class="text-sm text-gray-600 mb-4">
        Votre paiement est confirmé. Chaque voix compte pour pousser votre candidat favori vers la
        victoire !
      </p>
      <NuxtLink
        v-if="receiptCode"
        :to="`/recu/${receiptCode}`"
        class="inline-block text-xs text-awac-accent font-semibold hover:underline mb-6"
      >
        Voir mon reçu →
      </NuxtLink>
      <button
        @click="closeThanks"
        class="px-6 py-2.5 bg-awac-primary text-white font-semibold rounded-xl hover:bg-awac-primary/90 transition-colors"
      >
        Continuer
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { voteService } from '~/utils/voteService'
import { pollPaymentStatus } from '~/composables/usePaymentPolling'
import { clampVoteQuantity } from '~/utils/voteQuantity'
import { rememberPendingVote, forgetPendingVote } from '~/utils/pendingVotes'
import { useCopyToClipboard } from '~/composables/useCopyToClipboard'
const props = defineProps({
  candidate: { type: Object, default: null },
  initialQuantity: { type: Number, default: 1 },
  unitPrice: { type: Number, required: true },
  currency: { type: String, default: 'FCFA' },
})
const emit = defineEmits(['close', 'voted'])
const emptyForm = () => ({
  country: 'BJ',
  operator: '',
  phone_number: '',
  quantity: clampVoteQuantity(props.initialQuantity),
})
const form = ref(emptyForm())
const phase = ref('form')
const submitting = ref(false)
const errorMessage = ref('')
const receiptCode = ref('')
const { copied, copy } = useCopyToClipboard()
const countries = ref([])
const operators = ref([])
const metaLoading = ref(false)
let poller = null
const formattedTotal = computed(() => {
  const total = (parseInt(form.value.quantity) || 0) * props.unitPrice
  return new Intl.NumberFormat('fr-FR').format(total)
})
const selectedCountry = computed(() =>
  countries.value.find((entry) => entry.country_code === form.value.country),
)
const selectedPrefix = computed(() => selectedCountry.value?.prefix || '')
const loadCountries = async () => {
  metaLoading.value = true
  try {
    const { countries: list } = await voteService.getCountries()
    countries.value = list
    if (!list.some((entry) => entry.country_code === form.value.country)) {
      form.value.country = list[0]?.country_code || 'BJ'
    }
    await loadOperators()
  } catch (err) {
    console.error('Erreur chargement moyens de paiement:', err)
  } finally {
    metaLoading.value = false
  }
}
const loadOperators = async () => {
  metaLoading.value = true
  form.value.operator = ''
  try {
    const { operators: list } = await voteService.getOperators(form.value.country)
    operators.value = list
    if (list.length === 1) form.value.operator = list[0].code || list[0].slug
  } catch (err) {
    console.error('Erreur chargement opérateurs:', err)
    operators.value = []
  } finally {
    metaLoading.value = false
  }
}
watch(
  () => props.candidate,
  (candidate) => {
    if (candidate) {
      form.value = emptyForm()
      phase.value = 'form'
      errorMessage.value = ''
      if (countries.value.length === 0) loadCountries()
      else loadOperators()
    }
  },
)
const startPolling = (voteId) => {
  poller = pollPaymentStatus(voteId)
  poller.promise.then((result) => {
    if (result.status === 'confirmed') {
      forgetPendingVote(receiptCode.value)
      emit('voted', { votes_after: result.votesAfter })
      phase.value = 'thanks'
    } else if (result.status === 'rejected') {
      forgetPendingVote(receiptCode.value)
      errorMessage.value = 'Le paiement a été refusé ou annulé.'
      phase.value = 'failed'
    } else {
      errorMessage.value =
        "Nous n'avons pas reçu la confirmation à temps. Si vous avez payé, votre vote sera comptabilisé sous peu."
      phase.value = 'failed'
    }
    poller = null
  })
}
const cancelPolling = () => {
  if (poller) poller.cancel()
  poller = null
  close()
}
const submitVote = async () => {
  if (!form.value.operator || !form.value.phone_number?.trim()) {
    errorMessage.value = 'Veuillez remplir tous les champs obligatoires.'
    return
  }
  submitting.value = true
  errorMessage.value = ''
  try {
    const result = await voteService.submitVote({
      candidateId: props.candidate.id,
      quantity: clampVoteQuantity(form.value.quantity),
      operator: form.value.operator,
      voterPhone: `${selectedPrefix.value}${form.value.phone_number.trim()}`,
      country: form.value.country,
      currency: selectedCountry.value?.currency?.code,
    })
    receiptCode.value = result.receipt_code
    if (result.provider_link) window.open(result.provider_link, '_blank', 'noopener')
    if (result.payment_status === 'confirmed') {
      emit('voted', { votes_after: result.votes_after })
      phase.value = 'thanks'
    } else {
      rememberPendingVote({
        receipt_code: result.receipt_code,
        candidate_name: props.candidate.full_name,
      })
      phase.value = 'awaiting'
      startPolling(result.id)
    }
  } catch (err) {
    console.error('Erreur lors du vote:', err)
    errorMessage.value = err.message || "Impossible d'initier le paiement."
  } finally {
    submitting.value = false
  }
}
const close = () => {
  if (poller) poller.cancel()
  poller = null
  emit('close')
}
const closeThanks = () => {
  phase.value = 'form'
  emit('close')
}
onBeforeUnmount(() => {
  if (poller) poller.cancel()
})
</script>

<style scoped>
@keyframes slideUp {
  from {
    transform: translateY(20px) scale(0.98);
    opacity: 0;
  }
  to {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
}
.animate-slide-up {
  animation: slideUp 0.25s ease-out both;
}
@media (prefers-reduced-motion: reduce) {
  .animate-slide-up {
    animation: none;
  }
}
</style>
