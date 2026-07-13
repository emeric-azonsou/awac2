<template>
  <!-- ===== MODAL DE VOTE ===== -->
  <div
    v-if="candidate && !showThanksModal"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
    @click.self="close"
  >
    <div class="bg-white/95 backdrop-blur-xl rounded-3xl border border-white/30 shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6 animate-slide-up">
      <div class="flex items-center justify-between mb-5">
        <h3 class="text-lg font-heading font-black text-gray-900">
          Voter pour <span class="text-awac-primary">{{ candidate.full_name }}</span>
        </h3>
        <button @click="close" class="p-1 rounded-lg hover:bg-gray-100 transition-colors" aria-label="Fermer">
          <span class="material-icons">close</span>
        </button>
      </div>

      <form @submit.prevent="submitVote" class="space-y-4">
        <div>
          <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Opérateur mobile <span class="text-red-500">*</span></label>
          <select
            v-model="voteForm.operator"
            required
            class="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-awac-primary focus:ring-2 focus:ring-awac-primary/20 outline-none transition-all text-sm"
          >
            <option value="">Sélectionner</option>
            <option value="mtn">MTN</option>
            <option value="moov">MOOV</option>
            <option value="celtis">CELTIS</option>
            <option value="demo">Démo (simulation)</option>
          </select>
        </div>

        <div>
          <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Numéro de téléphone <span class="text-red-500">*</span></label>
          <input
            v-model="voteForm.phone_number"
            type="tel"
            required
            class="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-awac-primary focus:ring-2 focus:ring-awac-primary/20 outline-none transition-all text-sm"
            placeholder="+229 99 99 99 99"
          />
        </div>

        <div>
          <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Nombre de votes <span class="text-red-500">*</span></label>
          <div class="flex items-center gap-3">
            <button
              type="button"
              @click="voteForm.quantity = Math.max(1, voteForm.quantity - 1)"
              class="w-10 h-10 rounded-xl border border-gray-200 hover:bg-gray-50 flex items-center justify-center transition-colors"
              aria-label="Diminuer"
            >
              <span class="material-icons text-sm">remove</span>
            </button>
            <input
              v-model.number="voteForm.quantity"
              type="number"
              min="1"
              required
              class="w-20 text-center px-3 py-2.5 rounded-xl border border-gray-200 focus:border-awac-primary focus:ring-2 focus:ring-awac-primary/20 outline-none transition-all text-sm font-bold"
            />
            <button
              type="button"
              @click="voteForm.quantity += 1"
              class="w-10 h-10 rounded-xl border border-gray-200 hover:bg-gray-50 flex items-center justify-center transition-colors"
              aria-label="Augmenter"
            >
              <span class="material-icons text-sm">add</span>
            </button>
            <span class="text-sm text-gray-500">× {{ unitPrice }} {{ currency }} = {{ formattedTotal }} F</span>
          </div>
        </div>

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
            <span v-if="submitting" class="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
            {{ submitting ? 'Envoi...' : 'Confirmer le vote' }}
          </button>
        </div>
      </form>
    </div>
  </div>

  <!-- ===== MODAL DE REMERCIEMENT ===== -->
  <div
    v-if="showThanksModal"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
    @click.self="closeThanks"
  >
    <div class="bg-white/95 backdrop-blur-xl rounded-3xl border border-green-500/30 shadow-2xl w-full max-w-sm p-8 text-center animate-slide-up">
      <div class="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
        <span class="material-icons text-4xl text-green-500">check_circle</span>
      </div>
      <h3 class="text-2xl font-heading font-black text-gray-900 mb-2">
        Merci pour votre vote !
      </h3>
      <p class="text-sm text-gray-600 mb-6">
        Chaque voix compte. Continuez à voter pour pousser votre candidat favori vers la victoire !
      </p>
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
import { ref, computed, watch } from 'vue'
import { voteService } from '@/services/voteService'

const props = defineProps({
  candidate: { type: Object, default: null },
  unitPrice: { type: Number, required: true },
  currency: { type: String, default: 'FCFA' },
})

const emit = defineEmits(['close', 'voted'])

const emptyVoteForm = () => ({
  phone_number: '',
  operator: '',
  quantity: 1,
})

const voteForm = ref(emptyVoteForm())
const submitting = ref(false)
const showThanksModal = ref(false)

watch(
  () => props.candidate,
  (candidate) => {
    if (candidate) {
      voteForm.value = emptyVoteForm()
      showThanksModal.value = false
    }
  },
)

const formattedTotal = computed(() => {
  const total = (parseInt(voteForm.value.quantity) || 0) * props.unitPrice
  return new Intl.NumberFormat('fr-FR').format(total)
})

const close = () => emit('close')

const closeThanks = () => {
  showThanksModal.value = false
  emit('close')
}

const submitVote = async () => {
  if (!voteForm.value.phone_number?.trim() || !voteForm.value.operator) {
    alert('Veuillez remplir tous les champs obligatoires.')
    return
  }

  submitting.value = true
  try {
    const result = await voteService.submitVote({
      candidateId: props.candidate.id,
      quantity: voteForm.value.quantity,
      paymentProvider: voteForm.value.operator,
      voterPhone: voteForm.value.phone_number.trim(),
    })
    emit('voted', result)
    showThanksModal.value = true
  } catch (err) {
    console.error('Erreur lors du vote:', err)
    alert('❌ Erreur : ' + (err.message || "Impossible d'enregistrer le vote"))
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
@keyframes slideUp { from { transform:translateY(20px) scale(0.98); opacity:0; } to { transform:translateY(0) scale(1); opacity:1; } }
.animate-slide-up { animation:slideUp 0.25s ease-out both; }
@media (prefers-reduced-motion: reduce) {
  .animate-slide-up { animation: none; }
}
</style>
