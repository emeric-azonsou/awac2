<template>
  <div
    class="min-h-screen bg-gradient-to-br from-awac-primary/5 via-[#F9F8F6] to-awac-secondary/5 flex items-center justify-center p-4"
  >
    <div class="w-full max-w-5xl">
      <!-- HEADER -->
      <div class="text-center mb-8">
        <h1 class="text-4xl font-heading font-black text-gray-900">
          Bonjour, <span class="text-awac-primary">{{ userFullName }}</span>
        </h1>
        <p class="text-gray-500 text-sm mt-1">Pilotez les évaluations en temps réel</p>
      </div>

      <!-- CARTE PRINCIPALE -->
      <div
        class="bg-white/30 backdrop-blur-xl border border-white/40 rounded-3xl shadow-2xl p-6 md:p-8"
      >
        <!-- Sélection de l'étape -->
        <div class="mb-6">
          <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2"
            >Étape</label
          >
          <select
            v-model="selectedStepId"
            @change="onStepChange"
            class="w-full px-4 py-3 bg-white/50 backdrop-blur-sm border border-white/30 rounded-xl focus:border-awac-primary focus:ring-2 focus:ring-awac-primary/20 outline-none transition-all text-sm"
          >
            <option value="">Sélectionner une étape</option>
            <option v-for="step in presidentSteps" :key="step.id" :value="step.id">
              {{ step.name }}
            </option>
          </select>
        </div>

        <!-- Liste des candidats -->
        <div v-if="selectedStepId">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-heading font-bold text-gray-900">Candidats</h2>
            <span class="text-sm text-gray-400 bg-white/30 px-3 py-1 rounded-full">{{
              candidates.length
            }}</span>
          </div>

          <!-- Loader -->
          <div v-if="loading" class="text-center py-12">
            <div
              class="animate-spin h-8 w-8 border-4 border-awac-primary border-t-transparent rounded-full mx-auto"
            ></div>
          </div>

          <!-- Pas de candidats -->
          <div v-else-if="candidates.length === 0" class="text-center py-12 text-gray-400">
            <span class="material-icons text-5xl">people_outline</span>
            <p class="mt-2">Aucun candidat approuvé pour cette étape.</p>
          </div>

          <!-- Liste -->
          <div v-else class="space-y-3">
            <div
              v-for="candidate in candidates"
              :key="candidate.id"
              class="flex items-center justify-between p-4 rounded-xl transition-all duration-200"
              :class="[
                candidate.id === activeCandidateId
                  ? 'bg-awac-primary/10 border-2 border-awac-primary/30 shadow-md'
                  : 'bg-white/40 backdrop-blur-sm border border-white/50 hover:bg-white/60 hover:shadow-md',
              ]"
            >
              <div class="flex items-center gap-4">
                <div
                  class="w-10 h-10 rounded-full bg-awac-primary/10 flex items-center justify-center text-awac-primary font-bold"
                >
                  {{ getInitials(candidate.first_name, candidate.last_name) }}
                </div>
                <div>
                  <p class="font-semibold text-gray-900">
                    {{ candidate.first_name }} {{ candidate.last_name }}
                  </p>
                  <p class="text-xs text-gray-400 font-mono">{{ candidate.unique_code }}</p>
                </div>
              </div>

              <div class="flex items-center gap-3">
                <!-- Statut -->
                <span
                  v-if="candidate.id === activeCandidateId"
                  class="text-xs px-3 py-1 bg-amber-100 text-amber-700 rounded-full font-medium flex items-center gap-1"
                >
                  <span class="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
                  En cours
                  <span class="ml-1 text-amber-600 font-bold">
                    ({{ getVoteCount(candidate.id) }}/{{ totalJurors }})
                  </span>
                </span>

                <!-- Bouton Démarrer / Évaluer -->
                <button
                  v-if="candidate.id === activeCandidateId"
                  @click="openEvaluationModal(candidate)"
                  class="px-5 py-2 bg-gradient-to-r from-awac-primary to-awac-secondary text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-all shadow-sm hover:shadow-md"
                >
                  Évaluer
                </button>
                <button
                  v-else
                  @click="setActiveCandidate(candidate.id)"
                  class="px-5 py-2 bg-gradient-to-r from-awac-primary to-awac-secondary text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-all shadow-sm hover:shadow-md"
                >
                  Démarrer
                </button>
              </div>
            </div>
          </div>

          <!-- Clôturer -->
          <div
            v-if="selectedStepId && candidates.length > 0"
            class="mt-6 pt-4 border-t border-white/30 flex gap-3"
          >
            <button
              v-if="allCandidatesCompleted"
              @click="closeStep"
              class="px-6 py-2.5 bg-green-500 text-white rounded-xl text-sm font-semibold hover:bg-green-600 transition-all shadow-sm flex items-center gap-2"
            >
              <span class="material-icons text-sm">lock</span>
              Clôturer l'étape
            </button>
          </div>
        </div>

        <!-- Aucune étape sélectionnée -->
        <div v-else class="text-center py-12 text-gray-400">
          <span class="material-icons text-5xl">event</span>
          <p class="mt-2">Sélectionnez une étape pour commencer.</p>
        </div>
      </div>
    </div>

    <!-- ===== MODALE D'ÉVALUATION ===== -->
    <div
      v-if="showEvaluationModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      @click.self="closeEvaluationModal"
    >
      <div
        class="bg-white/95 backdrop-blur-xl rounded-3xl border border-white/30 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 animate-slide-up"
      >
        <div class="flex items-center justify-between mb-4">
          <div>
            <h2 class="text-xl font-heading font-black text-gray-900">
              Évaluation de
              <span class="text-awac-primary"
                >{{ selectedCandidate?.first_name }} {{ selectedCandidate?.last_name }}</span
              >
            </h2>
            <p class="text-xs text-gray-400 font-mono">{{ selectedCandidate?.unique_code }}</p>
          </div>
          <button
            @click="closeEvaluationModal"
            class="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <span class="material-icons text-gray-500">close</span>
          </button>
        </div>

        <!-- Compteur de votes en temps réel -->
        <div
          class="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 flex items-center justify-between"
        >
          <span class="text-sm font-medium text-amber-700">
            👥 Jurés ayant voté : {{ getVoteCount(selectedCandidate?.id) }} / {{ totalJurors }}
          </span>
          <span
            v-if="hasPresidentVoted"
            class="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full"
          >
            ✅ Vous avez voté
          </span>
          <span v-else class="text-xs bg-amber-100 text-amber-700 px-3 py-1 rounded-full">
            ⏳ En attente de votre vote
          </span>
        </div>

        <!-- Dynamique : Formulaire d'évaluation -->
        <form @submit.prevent="submitEvaluation" class="space-y-4">
          <div v-for="field in formFields" :key="field.id" class="space-y-1">
            <label class="block text-sm font-semibold text-gray-700">
              {{ field.field_name }}
              <span v-if="field.is_required" class="text-red-500 text-xs">*</span>
            </label>

            <!-- Suggestion : textarea -->
            <div v-if="field.field_type === 'suggestion'">
              <textarea
                v-model="formData[field.id]"
                :required="field.is_required"
                rows="3"
                class="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-awac-primary focus:ring-2 focus:ring-awac-primary/20 outline-none transition-all text-sm"
                placeholder="Votre commentaire..."
              ></textarea>
            </div>

            <!-- Checkbox (transformé en radio pour sélection unique) -->
            <div
              v-else-if="field.field_type === 'checkbox' && field.options && field.options.length"
            >
              <div class="space-y-2">
                <div
                  v-for="option in field.options"
                  :key="option.id"
                  class="flex items-center gap-3"
                >
                  <input
                    type="radio"
                    :name="'field_' + field.id"
                    :value="option.value"
                    v-model="formData[field.id]"
                    :required="field.is_required"
                    class="w-4 h-4 text-awac-primary focus:ring-awac-primary border-gray-300"
                  />
                  <span class="text-sm text-gray-700">{{ option.label }}</span>
                  <span class="text-xs text-gray-400 ml-auto">{{ option.value }} pts</span>
                </div>
              </div>
            </div>

            <!-- Si aucune option (fallback) -->
            <div v-else class="text-xs text-gray-400 italic">Aucune option disponible</div>
          </div>

          <div
            class="flex flex-col-reverse sm:flex-row items-center gap-3 pt-2 border-t border-gray-200"
          >
            <button
              type="button"
              @click="closeEvaluationModal"
              class="w-full sm:w-auto px-6 py-2.5 border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 transition-colors text-sm"
            >
              Annuler
            </button>
            <button
              type="submit"
              class="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-awac-primary to-awac-secondary text-white font-semibold rounded-xl hover:opacity-90 transition-all shadow-sm text-sm disabled:opacity-70"
              :disabled="submitting || hasPresidentVoted"
            >
              <span v-if="submitting" class="flex items-center justify-center gap-2">
                <span
                  class="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                ></span>
                Envoi...
              </span>
              <span v-else-if="hasPresidentVoted">✅ Déjà voté</span>
              <span v-else>📤 Soumettre mes notes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { supabase, supabaseAdmin } from '@/services/supabase'
import { useUserStore } from '@/stores/userStore'
import { storeToRefs } from 'pinia'

const userStore = useUserStore()
const { userFullName, user } = storeToRefs(userStore)

// ============================================================
// ÉTAT
// ============================================================
const loading = ref(false)
const selectedStepId = ref('')
const presidentSteps = ref([])
const candidates = ref([])
const activeCandidateId = ref(null)
const voteCounts = ref({})
const stepClosed = ref(false)
const totalJurors = ref(0)

// Modale d'évaluation
const showEvaluationModal = ref(false)
const selectedCandidate = ref(null)
const submitting = ref(false)
const hasPresidentVoted = ref(false)
const formFields = ref([])
const formData = ref({})
const currentStepJuryId = ref(null) // on stocke le step_jury_id du président

let voteSubscription = null

// ============================================================
// COMPUTED
// ============================================================
const canGoToNext = computed(() => {
  if (!activeCandidateId.value) return false
  const currentIdx = candidates.value.findIndex((c) => c.id === activeCandidateId.value)
  return currentIdx < candidates.value.length - 1
})

const allCandidatesCompleted = computed(() => {
  return stepClosed.value
})

// ============================================================
// MÉTHODES
// ============================================================
const getInitials = (first, last) => {
  return (first?.charAt(0) || '') + (last?.charAt(0) || '')
}

// Charger les étapes où l'utilisateur est président
const loadPresidentSteps = async () => {
  try {
    const { data, error } = await supabaseAdmin
      .from('step_juries')
      .select('step_id, steps(*)')
      .eq('profile_id', user.value.id)
      .eq('is_president', true)

    if (error) throw error
    presidentSteps.value = (data || []).map((item) => item.steps).filter(Boolean)

    if (presidentSteps.value.length > 0 && !selectedStepId.value) {
      selectedStepId.value = presidentSteps.value[0].id
      await loadCandidates()
    }
  } catch (err) {
    console.error('Erreur chargement étapes président:', err)
  }
}

// Récupérer le step_jury_id pour un profile_id et step_id donnés
const getStepJuryId = async (profileId, stepId) => {
  const { data, error } = await supabaseAdmin
    .from('step_juries')
    .select('id')
    .eq('profile_id', profileId)
    .eq('step_id', stepId)
    .maybeSingle()
  if (error) throw error
  return data?.id || null
}

// Charger les candidats et le compteur de jurés
const loadCandidates = async () => {
  if (!selectedStepId.value) {
    candidates.value = []
    return
  }

  loading.value = true
  try {
    // Récupérer le step_jury_id du président pour cette étape
    currentStepJuryId.value = await getStepJuryId(user.value.id, selectedStepId.value)

    // 1. Récupérer les candidats approuvés
    const { data: candidatesData } = await supabaseAdmin
      .from('candidates')
      .select('*')
      .eq('status', 'approved')
      .order('created_at')

    candidates.value = candidatesData || []

    // 2. Récupérer le candidat actif
    const { data: active } = await supabaseAdmin
      .from('active_candidates')
      .select('candidate_id')
      .eq('step_id', selectedStepId.value)
      .maybeSingle()

    activeCandidateId.value = active?.candidate_id || null

    // 3. Vérifier si l'étape est clôturée
    const step = presidentSteps.value.find((s) => s.id === selectedStepId.value)
    stepClosed.value = step?.status === 'closed'

    // 4. Charger le nombre total de jurés pour cette étape
    const { count, error: countError } = await supabaseAdmin
      .from('step_juries')
      .select('*', { count: 'exact', head: true })
      .eq('step_id', selectedStepId.value)

    if (!countError) totalJurors.value = count || 0

    // 5. Charger les votes
    await loadVotes()

    // 6. S'abonner aux votes en temps réel
    subscribeToVotes()
  } catch (err) {
    console.error('Erreur chargement candidats:', err)
  } finally {
    loading.value = false
  }
}

// Charger les votes
const loadVotes = async () => {
  if (candidates.value.length === 0) return

  const { data, error } = await supabaseAdmin
    .from('jury_submissions')
    .select('candidate_id')
    .eq('step_id', selectedStepId.value)
    .in(
      'candidate_id',
      candidates.value.map((c) => c.id),
    )

  if (error) {
    console.error('Erreur chargement votes:', error)
    return
  }

  const counts = {}
  data?.forEach((row) => {
    counts[row.candidate_id] = (counts[row.candidate_id] || 0) + 1
  })
  voteCounts.value = counts

  // Vérifier si le président a déjà voté pour le candidat actif
  if (activeCandidateId.value && currentStepJuryId.value) {
    const { data: myVote } = await supabaseAdmin
      .from('jury_submissions')
      .select('id')
      .eq('step_id', selectedStepId.value)
      .eq('candidate_id', activeCandidateId.value)
      .eq('step_jury_id', currentStepJuryId.value) // ✅ utilisation de step_jury_id
      .maybeSingle()

    hasPresidentVoted.value = !!myVote
  }
}

// Obtenir le nombre de votes pour un candidat
const getVoteCount = (candidateId) => {
  return voteCounts.value[candidateId] || 0
}

// S'abonner aux votes en temps réel
const subscribeToVotes = () => {
  if (voteSubscription) {
    supabase.removeChannel(voteSubscription)
  }

  voteSubscription = supabase
    .channel('jury_submissions_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'jury_submissions',
        filter: `step_id=eq.${selectedStepId.value}`,
      },
      () => {
        loadVotes()
      },
    )
    .subscribe()
}

// Changer d'étape
const onStepChange = async () => {
  if (voteSubscription) {
    supabase.removeChannel(voteSubscription)
    voteSubscription = null
  }
  await loadCandidates()
}

// Définir le candidat actif
const setActiveCandidate = async (candidateId) => {
  if (!selectedStepId.value) return

  try {
    const { data: existing, error: checkError } = await supabaseAdmin
      .from('active_candidates')
      .select('id')
      .eq('step_id', selectedStepId.value)
      .maybeSingle()

    if (checkError) throw checkError

    if (existing) {
      await supabaseAdmin
        .from('active_candidates')
        .update({ candidate_id: candidateId })
        .eq('id', existing.id)
    } else {
      await supabaseAdmin
        .from('active_candidates')
        .insert({ step_id: selectedStepId.value, candidate_id: candidateId })
    }

    activeCandidateId.value = candidateId
    hasPresidentVoted.value = false
    await loadVotes()
  } catch (err) {
    console.error('Erreur setActiveCandidate:', err)
    alert("Erreur lors du démarrage de l'évaluation : " + err.message)
  }
}

// Ouvrir la modale d'évaluation
const openEvaluationModal = async (candidate) => {
  selectedCandidate.value = candidate
  showEvaluationModal.value = true

  await loadFormFields(selectedStepId.value)

  const initialData = {}
  formFields.value.forEach((f) => {
    initialData[f.id] = f.field_type === 'checkbox' ? null : ''
  })
  formData.value = initialData

  // Vérifier si le président a déjà voté pour ce candidat
  if (currentStepJuryId.value) {
    const { data: myVote } = await supabaseAdmin
      .from('jury_submissions')
      .select('id, score')
      .eq('step_id', selectedStepId.value)
      .eq('candidate_id', candidate.id)
      .eq('step_jury_id', currentStepJuryId.value) // ✅ utilisation de step_jury_id
      .maybeSingle()

    if (myVote) {
      hasPresidentVoted.value = true
      // Si score contient un JSON, on le parse
      try {
        const scores = typeof myVote.score === 'string' ? JSON.parse(myVote.score) : myVote.score
        if (scores) {
          for (const [fieldId, value] of Object.entries(scores)) {
            if (formData.value.hasOwnProperty(fieldId)) {
              formData.value[fieldId] = value
            }
          }
        }
      } catch (e) {
        console.warn('Impossible de parser les scores:', e)
      }
    } else {
      hasPresidentVoted.value = false
    }
  }
}

// Charger les champs du formulaire pour une étape
const loadFormFields = async (stepId) => {
  try {
    const { data: form, error: formError } = await supabaseAdmin
      .from('forms')
      .select('id')
      .eq('step_id', stepId)
      .maybeSingle()

    if (formError) throw formError
    if (!form) {
      formFields.value = []
      return
    }

    const { data: fields, error: fieldsError } = await supabaseAdmin
      .from('form_fields')
      .select(
        `
        id,
        field_name,
        field_type,
        is_required,
        field_options (
          id,
          option_label,
          option_value
        )
      `,
      )
      .eq('form_id', form.id)
      .order('field_order', { ascending: true })

    if (fieldsError) throw fieldsError

    formFields.value = (fields || []).map((f) => ({
      id: f.id,
      field_name: f.field_name,
      field_type: f.field_type || 'suggestion',
      is_required: f.is_required || false,
      options: (f.field_options || []).map((o) => ({
        id: o.id,
        label: o.option_label,
        value: parseFloat(o.option_value) || 0,
      })),
    }))
  } catch (err) {
    console.error('Erreur chargement formulaire:', err)
    formFields.value = []
  }
}

// Fermer la modale d'évaluation
const closeEvaluationModal = () => {
  showEvaluationModal.value = false
  selectedCandidate.value = null
  formFields.value = []
  formData.value = {}
  hasPresidentVoted.value = false
}

// Soumettre l'évaluation du président
const submitEvaluation = async () => {
  if (!selectedCandidate.value || !selectedStepId.value || !currentStepJuryId.value) {
    alert('Erreur : données manquantes.')
    return
  }

  const missingRequired = formFields.value.some((f) => {
    if (f.is_required) {
      const val = formData.value[f.id]
      return (
        val === null || val === undefined || val === '' || (Array.isArray(val) && val.length === 0)
      )
    }
    return false
  })

  if (missingRequired) {
    alert('Veuillez remplir tous les champs obligatoires.')
    return
  }

  submitting.value = true
  try {
    const scores = {}
    formFields.value.forEach((f) => {
      const val = formData.value[f.id]
      if (val !== null && val !== undefined && val !== '') {
        scores[f.id] = val
      }
    })

    const submissionData = {
      step_id: selectedStepId.value,
      candidate_id: selectedCandidate.value.id,
      step_jury_id: currentStepJuryId.value,
      score: scores, // ✅ on envoie l'objet directement, Supabase le convertit en jsonb
      submitted_at: new Date().toISOString(),
    }

    const { error: insertError } = await supabase.from('jury_submissions').insert(submissionData)

    if (insertError) throw insertError

    hasPresidentVoted.value = true
    await loadVotes()

    const currentVotes = getVoteCount(selectedCandidate.value.id)
    if (currentVotes >= totalJurors.value) {
      alert('✅ Tous les jurés ont voté ! Passage au candidat suivant.')
      closeEvaluationModal()
      await goToNextCandidate()
    } else {
      alert('✅ Votre vote a été enregistré. En attente des autres jurés...')
      closeEvaluationModal()
    }
  } catch (err) {
    console.error('Erreur soumission évaluation:', err)
    alert('Erreur lors de la soumission : ' + err.message)
  } finally {
    submitting.value = false
  }
}

// Passer au candidat suivant
const goToNextCandidate = async () => {
  if (!canGoToNext.value) {
    alert("🏁 C'est le dernier candidat ! Vous pouvez clôturer l'étape.")
    return
  }
  const currentIdx = candidates.value.findIndex((c) => c.id === activeCandidateId.value)
  const nextIdx = currentIdx + 1
  await setActiveCandidate(candidates.value[nextIdx].id)
}

// Clôturer l'étape
const closeStep = async () => {
  if (!confirm('Clôturer définitivement cette étape ? Les jurés ne pourront plus voter.')) return

  try {
    const { error } = await supabaseAdmin
      .from('steps')
      .update({ status: 'closed' })
      .eq('id', selectedStepId.value)

    if (error) throw error

    stepClosed.value = true
    alert('✅ Étape clôturée avec succès.')
  } catch (err) {
    console.error('Erreur clôture étape:', err)
    alert('Erreur lors de la clôture : ' + err.message)
  }
}

// ============================================================
// INIT & CLEANUP
// ============================================================
onMounted(() => {
  loadPresidentSteps()
})

onUnmounted(() => {
  if (voteSubscription) {
    supabase.removeChannel(voteSubscription)
    voteSubscription = null
  }
})
</script>

<style scoped>
.bg-gradient-to-br {
  background-size: 400% 400%;
  animation: gradientMove 15s ease infinite;
}

@keyframes gradientMove {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

.animate-slide-up {
  animation: slideUp 0.3s ease-out both;
}

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
</style>
