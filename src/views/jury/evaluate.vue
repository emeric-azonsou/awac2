<template>
  <div class="min-h-screen bg-gradient-to-br from-awac-primary/5 via-[#F9F8F6] to-awac-secondary/5 flex items-center justify-center p-4">
    <div class="w-full max-w-2xl">
      <!-- ===== HEADER ===== -->
      <div class="text-center mb-8">
        <h1 class="text-4xl font-heading font-black text-gray-900">
          Bonjour, <span class="text-awac-primary">{{ userFullName }}</span>
        </h1>
        <p class="text-gray-500 text-sm mt-1">Évaluez les candidats en toute sérénité</p>
      </div>

      <!-- ===== CARTE PRINCIPALE ===== -->
      <div class="bg-white/30 backdrop-blur-xl border border-white/40 rounded-3xl shadow-2xl p-6 md:p-8">
        <!-- ===== COMPTEUR ET INFOS ===== -->
        <div v-if="candidate" class="flex items-center justify-between mb-6 pb-4 border-b border-white/30">
          <div>
            <p class="text-xs text-gray-400 uppercase tracking-wider">Étape</p>
            <p class="font-heading font-bold text-gray-900">{{ stepName }}</p>
          </div>
          <div class="text-center">
            <p class="text-xs text-gray-400 uppercase tracking-wider">Jurés ayant voté</p>
            <p class="text-2xl font-heading font-bold text-awac-primary">
              {{ voteCount }} / {{ totalJurors }}
            </p>
          </div>
          <div class="text-right">
            <p class="text-xs text-gray-400 uppercase tracking-wider">Candidat</p>
            <p class="font-heading font-bold text-gray-900">{{ candidate?.first_name || '' }}</p>
          </div>
        </div>

        <!-- ===== CHARGEMENT ===== -->
        <div v-if="loading" class="text-center py-12">
          <div class="animate-spin h-8 w-8 border-4 border-awac-primary border-t-transparent rounded-full mx-auto"></div>
          <p class="text-gray-400 text-sm mt-4">Chargement...</p>
        </div>

        <!-- ===== PAS DE CANDIDAT ===== -->
        <div v-else-if="!candidate" class="text-center py-12 text-gray-400">
          <span class="material-icons text-5xl">hourglass_empty</span>
          <p class="mt-2 text-lg font-medium">Aucun candidat à évaluer</p>
          <p class="text-sm">Le président n'a pas encore démarré une évaluation.</p>
        </div>

        <!-- ===== FORMULAIRE ===== -->
        <div v-else-if="candidate && !hasSubmitted && !isStepClosed">
          <!-- Info candidat -->
          <div class="bg-white/40 backdrop-blur-sm rounded-xl p-4 mb-6 border border-white/30">
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 rounded-full bg-awac-primary/10 flex items-center justify-center text-awac-primary font-bold text-lg">
                {{ getInitials(candidate.first_name, candidate.last_name) }}
              </div>
              <div>
                <p class="text-lg font-bold text-gray-900">{{ candidate.first_name }} {{ candidate.last_name }}</p>
                <p class="text-xs text-gray-400 font-mono">{{ candidate.unique_code }}</p>
              </div>
            </div>
          </div>

          <!-- Champs du formulaire -->
          <div v-if="loadingFields" class="text-center py-8">
            <div class="animate-spin h-8 w-8 border-3 border-awac-primary border-t-transparent rounded-full mx-auto"></div>
          </div>

          <form v-else @submit.prevent="handleSubmit" class="space-y-5">
            <div v-for="field in formFields" :key="field.id" class="space-y-2">
              <label class="block text-sm font-semibold text-gray-800">
                {{ field.field_name }}
                <span v-if="field.is_required" class="text-red-500">*</span>
              </label>

              <!-- Suggestion -->
              <textarea
                v-if="field.field_type === 'suggestion'"
                v-model="responses[field.id]"
                rows="3"
                class="w-full px-4 py-3 bg-white/50 backdrop-blur-sm border border-white/30 rounded-xl focus:border-awac-primary focus:ring-2 focus:ring-awac-primary/20 outline-none transition-all text-sm"
                placeholder="Écrivez votre suggestion..."
              ></textarea>

              <!-- Checkbox -->
              <div v-else-if="field.field_type === 'checkbox'" class="space-y-2">
                <div
                  v-for="opt in field.field_options"
                  :key="opt.id"
                  class="flex items-center gap-3 p-3 bg-white/40 backdrop-blur-sm border border-white/30 rounded-xl hover:bg-white/60 transition cursor-pointer"
                  @click="toggleCheckbox(field.id, opt.id)"
                >
                  <input type="checkbox" :value="opt.id" v-model="checkboxSelections[field.id]" class="accent-awac-primary" />
                  <span class="flex-1 text-sm">{{ opt.option_label }}</span>
                  <span class="text-xs text-gray-400">{{ opt.option_value }} pts</span>
                </div>
              </div>
            </div>

            <button
              type="submit"
              :disabled="submitting"
              class="w-full py-3.5 bg-gradient-to-r from-awac-primary to-awac-secondary text-white font-bold rounded-xl hover:opacity-90 transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-3"
            >
              <span v-if="submitting" class="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></span>
              <span v-else class="material-icons">how_to_vote</span>
              {{ submitting ? 'Envoi...' : 'Soumettre mon évaluation' }}
            </button>
          </form>
        </div>

        <!-- ===== DÉJÀ SOUMIS ===== -->
        <div v-else-if="hasSubmitted" class="text-center py-8">
          <div class="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <span class="material-icons text-5xl text-green-500">check_circle</span>
          </div>
          <h3 class="text-2xl font-heading font-bold text-gray-900 mt-4">Merci !</h3>
          <p class="text-gray-500">Votre évaluation a bien été enregistrée.</p>
          <p class="text-sm text-gray-400 mt-2">En attente du prochain candidat...</p>
        </div>

        <!-- ===== ÉTAPE CLÔTURÉE ===== -->
        <div v-else-if="isStepClosed" class="text-center py-8">
          <span class="material-icons text-5xl text-gray-300">lock</span>
          <h3 class="text-2xl font-heading font-bold text-gray-900 mt-4">Étape clôturée</h3>
          <p class="text-gray-500">L'évaluation de cette étape est terminée.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { supabase, supabaseAdmin } from '@/services/supabase'
import { useUserStore } from '@/stores/userStore'
import { storeToRefs } from 'pinia'

const userStore = useUserStore()
const { userFullName, user } = storeToRefs(userStore)

// ===== ÉTAT =====
const loading = ref(true)
const loadingFields = ref(true)
const submitting = ref(false)
const hasSubmitted = ref(false)
const isStepClosed = ref(false)

const stepName = ref('')
const stepId = ref(null)
const candidate = ref(null)
const formFields = ref([])
const responses = ref({})          // pour les champs "suggestion"
const checkboxSelections = ref({}) // pour les champs "checkbox"

const stepJuryId = ref(null)       // id de l'assignation du jury
const voteCount = ref(0)
const totalJurors = ref(0)

let realtimeChannel = null

// ===== MÉTHODES =====
const getInitials = (first, last) => {
  return (first?.charAt(0) || '') + (last?.charAt(0) || '')
}

const toggleCheckbox = (fieldId, optionId) => {
  const selected = checkboxSelections.value[fieldId] || []
  const index = selected.indexOf(optionId)
  if (index > -1) selected.splice(index, 1)
  else selected.push(optionId)
}

// Charger toutes les données
const loadData = async () => {
  loading.value = true
  try {
    // 1. Récupérer l'assignation du jury (step_juries) pour l'utilisateur connecté
    const { data: juryAssign, error: assignError } = await supabaseAdmin
      .from('step_juries')
      .select('id, step_id, steps(*)')
      .eq('profile_id', user.value.id)
      .maybeSingle()

    if (assignError || !juryAssign) {
      console.warn('Aucune assignation pour ce jury')
      loading.value = false
      return
    }

    stepJuryId.value = juryAssign.id
    stepId.value = juryAssign.step_id
    const step = juryAssign.steps
    stepName.value = step?.name || ''

    // 2. Vérifier si l'étape est clôturée
    isStepClosed.value = step?.status === 'closed'
    if (isStepClosed.value) {
      loading.value = false
      return
    }

    // 3. Récupérer le candidat actif
    const { data: active, error: activeError } = await supabaseAdmin
      .from('active_candidates')
      .select('candidate_id')
      .eq('step_id', stepId.value)
      .maybeSingle()

    if (activeError || !active) {
      loading.value = false
      return
    }

    const { data: cand, error: candError } = await supabaseAdmin
      .from('candidates')
      .select('*')
      .eq('id', active.candidate_id)
      .single()

    if (!candError && cand) {
      candidate.value = cand
    }

    // 4. Vérifier si le jury a déjà soumis pour ce candidat
    const { data: existing, error: existError } = await supabaseAdmin
      .from('jury_submissions')
      .select('id')
      .eq('step_jury_id', stepJuryId.value)
      .eq('candidate_id', candidate.value?.id)
      .maybeSingle()

    if (!existError && existing) {
      hasSubmitted.value = true
    }

    // 5. Compter le nombre de jurés ayant voté pour ce candidat
    await loadVotes()

    // 6. Compter le nombre total de jurés pour cette étape
    const { count, error: countError } = await supabaseAdmin
      .from('step_juries')
      .select('*', { count: 'exact', head: true })
      .eq('step_id', stepId.value)

    if (!countError) totalJurors.value = count || 0

    // 7. Charger le formulaire si pas encore soumis
    if (!hasSubmitted.value) {
      await loadFormFields(stepId.value)
    }

    // 8. S'abonner aux changements de votes
    subscribeToRealtime()

  } catch (err) {
    console.error('Erreur chargement données:', err)
  } finally {
    loading.value = false
  }
}

const loadVotes = async () => {
  if (!candidate.value) return
  const { data, error } = await supabaseAdmin
    .from('jury_submissions')
    .select('id')
    .eq('step_id', stepId.value)
    .eq('candidate_id', candidate.value.id)

  if (!error) voteCount.value = data?.length || 0
}

const loadFormFields = async (stepId) => {
  loadingFields.value = true
  try {
    const { data: form, error: formError } = await supabaseAdmin
      .from('forms')
      .select('id')
      .eq('step_id', stepId)
      .maybeSingle()

    if (formError || !form) {
      formFields.value = []
      return
    }

    const { data: fields, error: fieldsError } = await supabaseAdmin
      .from('form_fields')
      .select('*, field_options(*)')
      .eq('form_id', form.id)
      .order('field_order')

    if (fieldsError) throw fieldsError

    formFields.value = fields || []
    // Initialiser les réponses
    formFields.value.forEach(f => {
      responses.value[f.id] = ''
      if (f.field_type === 'checkbox') {
        checkboxSelections.value[f.id] = []
      }
    })
  } catch (err) {
    console.error('Erreur chargement champs:', err)
  } finally {
    loadingFields.value = false
  }
}

// Soumission
const handleSubmit = async () => {
  if (!candidate.value || !stepJuryId.value) return

  // Validation
  for (const field of formFields.value) {
    if (field.is_required) {
      if (field.field_type === 'suggestion' && !responses.value[field.id]?.trim()) {
        alert('Veuillez remplir tous les champs obligatoires.')
        return
      }
      if (field.field_type === 'checkbox' && (!checkboxSelections.value[field.id] || checkboxSelections.value[field.id].length === 0)) {
        alert('Veuillez sélectionner au moins une option.')
        return
      }
    }
  }

  submitting.value = true
  try {
    // Construire l'objet scores : clé = field.id, valeur = texte ou tableau d'IDs d'options ou somme ?
    // On stocke un objet avec les valeurs brutes pour une restitution flexible.
    const scores = {}
    formFields.value.forEach(f => {
      if (f.field_type === 'suggestion') {
        scores[f.id] = responses.value[f.id] || ''
      } else if (f.field_type === 'checkbox') {
        const selectedIds = checkboxSelections.value[f.id] || []
        // On peut stocker les IDs sélectionnés et la somme
        const selectedOptions = f.field_options.filter(o => selectedIds.includes(o.id))
        const totalPoints = selectedOptions.reduce((sum, o) => sum + (parseFloat(o.option_value) || 0), 0)
        scores[f.id] = {
          selected: selectedIds,
          points: totalPoints
        }
      }
    })

    // Insertion dans la base
    const { error } = await supabase
      .from('jury_submissions')
      .insert({
        step_jury_id: stepJuryId.value,
        candidate_id: candidate.value.id,
        step_id: stepId.value,
        score: scores,  // objet JSON stocké dans la colonne jsonb "score"
        submitted_at: new Date().toISOString(),
      })

    if (error) throw error

    hasSubmitted.value = true
    voteCount.value += 1
    alert('✅ Évaluation soumise avec succès !')
  } catch (err) {
    console.error('Erreur soumission:', err)
    alert('❌ Erreur : ' + err.message)
  } finally {
    submitting.value = false
  }
}

// ===== REALTIME =====
const subscribeToRealtime = () => {
  if (!stepId.value) return

  realtimeChannel = supabase
    .channel('jury_votes')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'jury_submissions',
      filter: `step_id=eq.${stepId.value}`,
    }, (payload) => {
      // Si le vote concerne le candidat actif, on incrémente
      if (payload.new.candidate_id === candidate.value?.id) {
        voteCount.value += 1
      }
    })
    .subscribe()
}

// ===== INIT & CLEANUP =====
onMounted(() => {
  loadData()
})

onBeforeUnmount(() => {
  if (realtimeChannel) realtimeChannel.unsubscribe()
})
</script>

<style scoped>
.bg-gradient-to-br {
  background-size: 400% 400%;
  animation: gradientMove 15s ease infinite;
}

@keyframes gradientMove {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
</style>