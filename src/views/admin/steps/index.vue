<template>
  <div class="space-y-4 md:space-y-6">
    <!-- ===== EN-TÊTE ===== -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 md:gap-4">
      <div>
        <h1 class="text-xl md:text-2xl lg:text-3xl font-heading font-black text-gray-900">
          Gestion des Étapes
        </h1>
        <p class="text-xs md:text-sm text-gray-500 font-sans mt-0.5">
          Gérez les étapes de votre concours et leurs formulaires d'évaluation.
        </p>
      </div>
      <button
        @click="openCreateModal"
        class="flex items-center justify-center gap-2 px-4 py-2.5 md:px-5 md:py-2.5 bg-awac-primary text-white text-xs md:text-sm font-semibold rounded-xl hover:bg-awac-primary/90 transition-colors shadow-sm w-full sm:w-auto"
      >
        <span class="material-icons text-sm md:text-base">add</span>
        Nouvelle Étape
      </button>
    </div>

    <!-- ===== RECHERCHE ===== -->
    <div class="bg-white/60 backdrop-blur-xl border border-white/30 rounded-2xl p-3 md:p-4 shadow-sm">
      <div class="flex flex-col sm:flex-row gap-2 md:gap-3">
        <div class="flex-1 relative">
          <span class="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">search</span>
          <input
            v-model="searchQuery"
            @input="loadSteps"
            type="text"
            placeholder="Rechercher une étape..."
            class="w-full pl-9 pr-3 md:pr-4 py-2 md:py-2.5 rounded-xl border border-gray-200 focus:border-awac-primary focus:ring-2 focus:ring-awac-primary/20 outline-none transition-all bg-white/50 text-sm"
          />
        </div>
        <button
          @click="resetSearch"
          class="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
          title="Réinitialiser"
        >
          <span class="material-icons text-sm">clear</span>
        </button>
      </div>
    </div>

    <!-- ===== LISTE ===== -->
    <div class="bg-white/60 backdrop-blur-xl border border-white/30 rounded-2xl p-3 md:p-5 shadow-sm overflow-hidden">
      <!-- ... (même liste que précédemment) ... -->
      <div v-if="loading" class="flex justify-center py-8 md:py-12">
        <div class="animate-spin rounded-full h-6 w-6 md:h-8 md:w-8 border-2 border-awac-primary border-t-transparent"></div>
      </div>
      <div v-else-if="error" class="text-center py-8 md:py-12 text-red-500 text-sm md:text-base">{{ error }}</div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-200">
              <th class="text-left py-3 font-heading font-bold text-gray-400 tracking-widest text-[10px]">Nom</th>
              <th class="text-left py-3 font-heading font-bold text-gray-400 tracking-widest text-[10px]">Ordre</th>
              <th class="text-left py-3 font-heading font-bold text-gray-400 tracking-widest text-[10px]">%</th>
              <th class="text-left py-3 font-heading font-bold text-gray-400 tracking-widest text-[10px]">Statut</th>
              <th class="text-center py-3 font-heading font-bold text-gray-400 tracking-widest text-[10px]">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="step in steps" :key="step.id" class="border-b border-gray-50 hover:bg-white/20 transition-colors">
              <td class="py-3 font-medium text-gray-800">{{ step.name }}</td>
              <td class="py-3 text-gray-500">{{ step.step_order }}</td>
              <td class="py-3 text-gray-500">{{ step.percentage }}%</td>
              <td class="py-3">
                <span class="px-3 py-1 rounded-full text-[10px] font-medium" :class="getStatusBadge(step.status)">
                  {{ getStatusLabel(step.status) }}
                </span>
              </td>
              <td class="py-3 text-center">
                <div class="flex items-center justify-center gap-1">
                  <button @click="openQuestionsModal(step)" class="p-1.5 rounded-lg hover:bg-purple-500/10 text-gray-400 hover:text-purple-500 transition-colors" title="Gérer les questions">
                    <span class="material-icons text-sm">quiz</span>
                  </button>
                  <button @click="editStep(step)" class="p-1.5 rounded-lg hover:bg-blue-500/10 text-gray-400 hover:text-blue-500 transition-colors" title="Modifier">
                    <span class="material-icons text-sm">edit</span>
                  </button>
                  <button @click="openDeleteModal(step)" class="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-500 transition-colors" title="Supprimer">
                    <span class="material-icons text-sm">delete</span>
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="steps.length === 0">
              <td colspan="5" class="py-8 md:py-12 text-center text-gray-400 text-sm">Aucune étape trouvée</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="totalPages > 1" class="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-4 border-t border-gray-200">
        <div class="text-xs md:text-sm text-gray-500">
          {{ (currentPage - 1) * pageSize + 1 }} - {{ Math.min(currentPage * pageSize, total) }} sur {{ total }}
        </div>
        <div class="flex gap-2">
          <button @click="prevPage" :disabled="currentPage === 1" class="px-3 md:px-4 py-1.5 md:py-2 rounded-lg border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors text-xs md:text-sm">Précédent</button>
          <button @click="nextPage" :disabled="currentPage === totalPages" class="px-3 md:px-4 py-1.5 md:py-2 rounded-lg border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors text-xs md:text-sm">Suivant</button>
        </div>
      </div>
    </div>

    <!-- ===== MODAL CRÉATION / ÉDITION ÉTAPE ===== -->
    <!-- ... (inchangée) ... -->
    <div
      v-if="showModal"
      class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-2 sm:p-4"
      @click.self="closeModal"
    >
      <div class="bg-white/95 backdrop-blur-xl rounded-t-3xl sm:rounded-3xl border border-white/30 shadow-2xl w-full max-w-lg max-h-[95vh] overflow-y-auto p-4 sm:p-6 animate-slide-up">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg sm:text-xl font-heading font-black text-gray-900">
            {{ editingStep ? 'Modifier l\'étape' : 'Nouvelle étape' }}
          </h2>
          <button @click="closeModal" class="p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <span class="material-icons">close</span>
          </button>
        </div>
        <form @submit.prevent="saveStep" class="space-y-4">
          <div>
            <label class="block text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Nom <span class="text-red-500">*</span></label>
            <input v-model="form.name" type="text" required class="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-gray-200 focus:border-awac-primary focus:ring-2 focus:ring-awac-primary/20 outline-none transition-all text-sm" placeholder="Ex: Pré-sélection" />
          </div>
          <div>
            <label class="block text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Description</label>
            <textarea v-model="form.description" rows="2" class="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-gray-200 focus:border-awac-primary focus:ring-2 focus:ring-awac-primary/20 outline-none transition-all text-sm resize-none" placeholder="Description de l'étape (optionnel)"></textarea>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Ordre <span class="text-red-500">*</span></label>
              <input v-model.number="form.step_order" type="number" required min="1" class="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-gray-200 focus:border-awac-primary focus:ring-2 focus:ring-awac-primary/20 outline-none transition-all text-sm" />
            </div>
            <div>
              <label class="block text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Pourcentage <span class="text-red-500">*</span></label>
              <input v-model.number="form.percentage" type="number" required min="1" max="100" class="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-gray-200 focus:border-awac-primary focus:ring-2 focus:ring-awac-primary/20 outline-none transition-all text-sm" />
              <p v-if="percentageError" class="text-xs text-red-500 mt-1">{{ percentageError }}</p>
            </div>
          </div>
          <div>
            <label class="block text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Statut</label>
            <select v-model="form.status" class="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-gray-200 focus:border-awac-primary focus:ring-2 focus:ring-awac-primary/20 outline-none transition-all text-sm">
              <option value="draft">Brouillon</option>
              <option value="active">Active</option>
              <option value="closed">Clôturée</option>
            </select>
          </div>
          <div class="flex flex-col-reverse sm:flex-row items-center gap-3 pt-2">
            <button type="button" @click="closeModal" class="w-full sm:w-auto px-6 py-2.5 border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 transition-colors text-sm">Annuler</button>
            <button type="submit" class="w-full sm:w-auto flex-1 sm:flex-none px-6 py-2.5 bg-awac-primary text-white font-semibold rounded-xl hover:bg-awac-primary/90 transition-colors shadow-sm text-sm disabled:opacity-70" :disabled="saving">
              <span v-if="saving" class="flex items-center justify-center gap-2">
                <span class="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
                Enregistrement...
              </span>
              <span v-else>{{ editingStep ? 'Mettre à jour' : 'Créer' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ============================================================ -->
    <!-- ===== MODALE FORM BUILDER AVEC APERÇU ===== -->
    <!-- ============================================================ -->
    <div
      v-if="showQuestionsModal"
      class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-2 sm:p-4"
      @click.self="closeQuestionsModal"
    >
      <div class="bg-white/95 backdrop-blur-xl rounded-t-3xl sm:rounded-3xl border border-white/30 shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-y-auto p-4 sm:p-6 animate-slide-up">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h2 class="text-lg sm:text-xl font-heading font-black text-gray-900">
              Formulaire : {{ selectedStepForQuestions?.name }}
            </h2>
            <p class="text-xs text-gray-400 mt-0.5">
              Ajoutez des questions d'évaluation (suggestions ou cases à cocher).
            </p>
          </div>
          <button @click="closeQuestionsModal" class="p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <span class="material-icons">close</span>
          </button>
        </div>

        <!-- ===== CHARGEMENT ===== -->
        <div v-if="loadingQuestions" class="flex justify-center py-8">
          <div class="animate-spin rounded-full h-6 w-6 border-2 border-awac-primary border-t-transparent"></div>
        </div>

        <!-- ===== CONTENU : ÉDITEUR + APERÇU ===== -->
        <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- ===== COLONNE GAUCHE : ÉDITEUR ===== -->
          <div class="space-y-4">
            <!-- BOUTON CRÉER LE FORMULAIRE (si aucune question) -->
            <div v-if="questions.length === 0" class="text-center py-12">
              <span class="material-icons text-6xl text-gray-300">quiz</span>
              <p class="text-gray-400 mt-3 text-sm">Ce formulaire est vide.</p>
              <p class="text-gray-400 text-sm mb-6">Ajoutez votre première question pour commencer.</p>
              <button
                @click="addQuestion"
                class="px-6 py-3 bg-awac-primary text-white rounded-xl font-semibold hover:bg-awac-primary/90 transition-colors flex items-center gap-2 mx-auto"
              >
                <span class="material-icons text-sm">add</span>
                Créer le formulaire
              </button>
            </div>

            <!-- LISTE DES QUESTIONS (éditeur) -->
            <div v-else class="space-y-4">
              <div class="flex items-center justify-between">
                <span class="text-sm text-gray-500">{{ questions.length }} question(s)</span>
                <button
                  @click="addQuestion"
                  class="px-3 py-1.5 bg-awac-primary/10 text-awac-primary rounded-lg text-sm font-medium hover:bg-awac-primary/20 transition-colors flex items-center gap-1"
                >
                  <span class="material-icons text-sm">add</span>
                  Ajouter
                </button>
              </div>

              <div
                v-for="(question, index) in questions"
                :key="index"
                class="border border-gray-100 rounded-xl p-4 hover:shadow-sm transition bg-white/50"
              >
                <div class="flex items-start justify-between gap-3">
                  <div class="flex-1 space-y-3">
                    <div class="flex flex-wrap items-center gap-2">
                      <span class="text-xs font-bold text-gray-400 mr-1">#{{ index + 1 }}</span>
                      <select
                        v-model="question.field_type"
                        @change="onFieldTypeChange(question)"
                        class="px-3 py-1.5 rounded-lg border border-gray-200 focus:border-awac-primary focus:ring-2 focus:ring-awac-primary/20 outline-none transition-all text-xs bg-white/50"
                      >
                        <option value="suggestion">Suggestion</option>
                        <option value="checkbox">Case à cocher</option>
                      </select>

                      <input
                        v-model="question.field_name"
                        type="text"
                        placeholder="Libellé de la question"
                        class="flex-1 min-w-[150px] px-3 py-1.5 rounded-lg border border-gray-200 focus:border-awac-primary focus:ring-2 focus:ring-awac-primary/20 outline-none transition-all text-sm bg-white/50"
                      />

                      <label class="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
                        <input type="checkbox" v-model="question.is_required" class="accent-awac-primary" />
                        Obligatoire
                      </label>
                    </div>

                    <!-- Options pour checkbox -->
                    <div v-if="question.field_type === 'checkbox'" class="ml-6 space-y-1.5">
                      <div class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Options & points</div>
                      <div
                        v-for="(option, optIndex) in question.options"
                        :key="optIndex"
                        class="flex items-center gap-2"
                      >
                        <input
                          v-model="option.label"
                          type="text"
                          placeholder="Libellé"
                          class="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 focus:border-awac-primary focus:ring-2 focus:ring-awac-primary/20 outline-none transition-all text-sm bg-white/50"
                        />
                        <input
                          v-model.number="option.value"
                          type="number"
                          placeholder="Points"
                          class="w-20 px-3 py-1.5 rounded-lg border border-gray-200 focus:border-awac-primary focus:ring-2 focus:ring-awac-primary/20 outline-none transition-all text-sm bg-white/50"
                        />
                        <button
                          @click="removeOption(question, optIndex)"
                          class="p-1 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <span class="material-icons text-sm">close</span>
                        </button>
                      </div>
                      <button
                        @click="addOption(question)"
                        class="text-xs text-awac-primary hover:text-awac-primary/80 font-medium flex items-center gap-1"
                      >
                        <span class="material-icons text-sm">add</span>
                        Ajouter une option
                      </button>
                    </div>

                    <!-- Suggestion : texte long -->
                    <div v-if="question.field_type === 'suggestion'" class="ml-6 text-xs text-gray-400">
                      <span class="material-icons text-sm align-middle">description</span>
                      Texte long (réponse libre)
                    </div>
                  </div>

                  <button
                    @click="removeQuestion(index)"
                    class="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                    title="Supprimer cette question"
                  >
                    <span class="material-icons text-sm">delete</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- ===== COLONNE DROITE : APERÇU ===== -->
          <div class="border-l border-gray-200 pl-6 hidden lg:block">
            <div class="sticky top-4">
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-sm font-heading font-bold text-gray-700 uppercase tracking-wider">
                  <span class="material-icons text-sm align-middle mr-1">visibility</span>
                  Aperçu
                </h3>
                <span class="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">en direct</span>
              </div>

              <!-- Formulaire aperçu -->
              <div v-if="questions.length === 0" class="text-center py-12 text-gray-400">
                <span class="material-icons text-4xl">description</span>
                <p class="text-sm mt-2">Aucune question à afficher</p>
              </div>

              <div v-else class="space-y-4 bg-gray-50/70 rounded-xl p-4 border border-gray-100">
                <div
                  v-for="(question, index) in questions"
                  :key="index"
                  class="bg-white rounded-lg p-3 border border-gray-200 shadow-sm"
                >
                  <div class="flex items-start gap-2">
                    <span class="text-xs font-bold text-gray-400 mt-0.5">{{ index + 1 }}.</span>
                    <div class="flex-1">
                      <p class="text-sm font-medium text-gray-800">
                        {{ question.field_name || 'Nouvelle question' }}
                        <span v-if="question.is_required" class="text-red-500 text-xs ml-1">*</span>
                      </p>

                      <!-- Aperçu Suggestion -->
                      <div v-if="question.field_type === 'suggestion'" class="mt-2">
                        <textarea
                          disabled
                          placeholder="Votre réponse..."
                          class="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-400 cursor-not-allowed resize-none"
                          rows="2"
                        ></textarea>
                      </div>

                      <!-- Aperçu Checkbox -->
                      <div v-if="question.field_type === 'checkbox'" class="mt-2 space-y-1.5">
                        <div
                          v-for="option in question.options"
                          :key="option.id || option.label"
                          class="flex items-center gap-2"
                        >
                          <input
                            type="checkbox"
                            disabled
                            class="w-4 h-4 accent-awac-primary rounded disabled:opacity-60"
                          />
                          <span class="text-sm text-gray-600">{{ option.label || 'Option' }}</span>
                          <span class="text-xs text-gray-400 ml-auto">{{ option.value || 0 }} pts</span>
                        </div>
                        <div v-if="!question.options || question.options.length === 0" class="text-xs text-gray-400">
                          Aucune option
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ===== BOUTONS DE SAUVEGARDE ===== -->
        <div class="flex flex-col-reverse sm:flex-row items-center gap-3 pt-4 mt-4 border-t border-gray-100">
          <button
            type="button"
            @click="closeQuestionsModal"
            class="w-full sm:w-auto px-6 py-2.5 border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 transition-colors text-sm"
          >
            Fermer
          </button>
          <button
            @click="saveQuestions"
            class="w-full sm:w-auto flex-1 sm:flex-none px-6 py-2.5 bg-awac-primary text-white font-semibold rounded-xl hover:bg-awac-primary/90 transition-colors shadow-sm text-sm flex items-center justify-center gap-2 disabled:opacity-70"
            :disabled="savingQuestions"
          >
            <span v-if="savingQuestions" class="flex items-center justify-center gap-2">
              <span class="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
              Enregistrement...
            </span>
            <span v-else>
              <span class="material-icons text-sm mr-1">save</span>
              Enregistrer le formulaire
            </span>
          </button>
        </div>
      </div>
    </div>

    <!-- ===== MODALE DE SUPPRESSION ===== -->
    <div
      v-if="showDeleteModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      @click.self="showDeleteModal = false"
    >
      <div class="bg-white/95 backdrop-blur-xl rounded-3xl border border-white/30 shadow-2xl w-full max-w-sm p-6 animate-slide-up">
        <div class="text-center">
          <div class="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <span class="material-icons text-3xl text-red-500">warning</span>
          </div>
          <h3 class="text-lg font-heading font-bold text-gray-900 mb-2">Confirmer la suppression</h3>
          <p class="text-sm text-gray-500 mb-6">
            Vous êtes sur le point de supprimer définitivement <br>
            <span class="font-semibold text-gray-800">{{ deleteStepData?.name }}</span>.
            <br><span class="text-red-500 font-semibold">Cette action est irréversible.</span>
          </p>
          <div class="flex flex-col-reverse sm:flex-row items-center gap-3">
            <button
              @click="showDeleteModal = false"
              class="w-full sm:w-auto px-5 py-2.5 border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 transition-colors text-sm"
            >
              Annuler
            </button>
            <button
              @click="confirmDelete"
              class="w-full sm:w-auto px-5 py-2.5 bg-red-500 text-white font-semibold rounded-xl hover:bg-red-600 transition-colors shadow-sm text-sm flex items-center justify-center gap-2"
              :disabled="deleting"
            >
              <span v-if="deleting" class="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
              {{ deleting ? 'Suppression...' : 'Supprimer définitivement' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { supabaseAdmin } from '@/services/supabase'

// ============================================================
// ÉTAT ÉTAPES
// ============================================================
const loading = ref(true)
const error = ref('')
const steps = ref([])
const showModal = ref(false)
const showDeleteModal = ref(false)
const editingStep = ref(null)
const deleteStepData = ref(null)
const saving = ref(false)
const deleting = ref(false)
const percentageError = ref('')
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)
const searchQuery = ref('')
let searchTimeout = null

const form = reactive({
  name: '',
  description: '',
  step_order: 1,
  percentage: 10,
  status: 'draft',
  competition_id: '',
})

// ============================================================
// ÉTAT QUESTIONS (FORM BUILDER)
// ============================================================
const showQuestionsModal = ref(false)
const selectedStepForQuestions = ref(null)
const questions = ref([])
const loadingQuestions = ref(false)
const savingQuestions = ref(false)

// ============================================================
// COMPUTED
// ============================================================
const totalPages = computed(() => Math.ceil(total.value / pageSize.value))

// ============================================================
// MÉTHODES ÉTAPES
// ============================================================
const getStatusLabel = (status) => {
  const map = { draft: 'Brouillon', active: 'Active', closed: 'Clôturée' }
  return map[status] || status
}

const getStatusBadge = (status) => {
  const map = {
    draft: 'bg-gray-100 text-gray-700',
    active: 'bg-green-100 text-green-700',
    closed: 'bg-red-100 text-red-700'
  }
  return map[status] || 'bg-gray-100 text-gray-700'
}

const resetSearch = () => {
  searchQuery.value = ''
  currentPage.value = 1
  loadSteps()
}

const getActiveCompetition = async () => {
  const { data, error } = await supabaseAdmin
    .from('competitions')
    .select('id')
    .eq('is_active', true)
    .limit(1)
  if (error) throw error
  if (!data || data.length === 0) return null
  return data[0].id
}

const loadSteps = async () => {
  loading.value = true
  error.value = ''
  try {
    let query = supabaseAdmin
      .from('steps')
      .select('*', { count: 'exact' })
      .order('step_order', { ascending: true })
      .range((currentPage.value - 1) * pageSize.value, currentPage.value * pageSize.value - 1)

    if (searchQuery.value.trim()) {
      query = query.ilike('name', `%${searchQuery.value.trim()}%`)
    }

    const { data, count, error: err } = await query
    if (err) throw err
    steps.value = data || []
    total.value = count || 0
  } catch (err) {
    console.error('Erreur chargement étapes:', err)
    error.value = err.message || 'Erreur'
  } finally {
    loading.value = false
  }
}

const openCreateModal = () => {
  editingStep.value = null
  percentageError.value = ''
  Object.assign(form, {
    name: '',
    description: '',
    step_order: steps.value.length + 1 || 1,
    percentage: 10,
    status: 'draft',
    competition_id: '',
  })
  showModal.value = true
}

const editStep = (step) => {
  editingStep.value = step
  percentageError.value = ''
  Object.assign(form, {
    name: step.name,
    description: step.description || '',
    step_order: step.step_order,
    percentage: step.percentage,
    status: step.status || 'draft',
    competition_id: '',
  })
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  editingStep.value = null
  percentageError.value = ''
}

const openDeleteModal = (step) => {
  deleteStepData.value = step
  showDeleteModal.value = true
}

const saveStep = async () => {
  percentageError.value = ''
  if (form.percentage < 1 || form.percentage > 100) {
    percentageError.value = 'Le pourcentage doit être compris entre 1 et 100.'
    return
  }

  let competitionId
  try {
    const id = await getActiveCompetition()
    if (!id) {
      alert('Aucune compétition active. Créez une compétition d\'abord.')
      return
    }
    competitionId = id
  } catch (err) {
    console.error('Erreur récupération compétition:', err)
    alert('Erreur lors de la récupération de la compétition active.')
    return
  }

  try {
    const { data: existingSteps, error } = await supabaseAdmin
      .from('steps')
      .select('percentage, id')
      .eq('competition_id', competitionId)

    if (error) throw error

    const totalPercentage = existingSteps.reduce((sum, s) => {
      if (editingStep.value && s.id === editingStep.value.id) return sum
      return sum + s.percentage
    }, 0) + form.percentage

    if (totalPercentage > 100) {
      percentageError.value = `La somme des pourcentages ne peut pas dépasser 100%. Actuel : ${totalPercentage}%`
      return
    }
  } catch (err) {
    console.error('Erreur validation:', err)
    return
  }

  saving.value = true
  try {
    const dataToSave = {
      name: form.name,
      description: form.description || null,
      step_order: form.step_order,
      percentage: form.percentage,
      status: form.status || 'draft',
      competition_id: competitionId,
    }

    let result
    if (editingStep.value) {
      result = await supabaseAdmin.from('steps').update(dataToSave).eq('id', editingStep.value.id).select()
    } else {
      result = await supabaseAdmin.from('steps').insert(dataToSave).select()
    }
    if (result.error) throw result.error

    closeModal()
    await loadSteps()
  } catch (err) {
    console.error('Erreur sauvegarde:', err)
    alert('Erreur : ' + (err.message || 'Erreur lors de la sauvegarde'))
  } finally {
    saving.value = false
  }
}

const confirmDelete = async () => {
  const step = deleteStepData.value
  if (!step) return
  deleting.value = true
  try {
    const { error } = await supabaseAdmin.from('steps').delete().eq('id', step.id)
    if (error) throw error
    showDeleteModal.value = false
    await loadSteps()
  } catch (err) {
    console.error('Erreur suppression:', err)
    alert('Erreur : ' + (err.message || 'Erreur lors de la suppression'))
  } finally {
    deleting.value = false
    deleteStepData.value = null
  }
}

const prevPage = () => {
  if (currentPage.value > 1) { currentPage.value--; loadSteps() }
}

const nextPage = () => {
  if (currentPage.value < totalPages.value) { currentPage.value++; loadSteps() }
}

// ============================================================
// MÉTHODES QUESTIONS (FORM BUILDER)
// ============================================================
const openQuestionsModal = async (step) => {
  selectedStepForQuestions.value = step
  showQuestionsModal.value = true
  await loadQuestions(step.id)
}

const closeQuestionsModal = () => {
  showQuestionsModal.value = false
  selectedStepForQuestions.value = null
  questions.value = []
}

const loadQuestions = async (stepId) => {
  loadingQuestions.value = true
  try {
    const { data: formData, error: formError } = await supabaseAdmin
      .from('forms')
      .select('id')
      .eq('step_id', stepId)
      .maybeSingle()

    if (formError) throw formError
    if (!formData) {
      questions.value = []
      return
    }

    const { data: fields, error: fieldsError } = await supabaseAdmin
      .from('form_fields')
      .select('*, field_options(*)')
      .eq('form_id', formData.id)
      .order('field_order', { ascending: true })

    if (fieldsError) throw fieldsError

    questions.value = (fields || []).map(f => ({
      id: f.id,
      field_name: f.field_name || '',
      field_type: f.field_type || 'suggestion',
      is_required: f.is_required || false,
      min_value: f.min_value || 0,
      max_value: f.max_value || 20,
      options: (f.field_options || []).map(o => ({
        id: o.id,
        label: o.option_label,
        value: parseFloat(o.option_value) || 0
      }))
    }))
  } catch (err) {
    console.error('Erreur chargement questions:', err)
    alert('Erreur : ' + err.message)
  } finally {
    loadingQuestions.value = false
  }
}

const addQuestion = () => {
  questions.value.push({
    id: null,
    field_name: '',
    field_type: 'suggestion',
    is_required: false,
    min_value: 0,
    max_value: 20,
    options: []
  })
}

const removeQuestion = (index) => {
  if (!confirm('Supprimer cette question ?')) return
  questions.value.splice(index, 1)
}

const addOption = (question) => {
  if (!question.options) question.options = []
  question.options.push({ id: null, label: '', value: 0 })
}

const removeOption = (question, index) => {
  question.options.splice(index, 1)
}

const onFieldTypeChange = (question) => {
  if (question.field_type !== 'checkbox') {
    question.options = []
  }
}

const saveQuestions = async () => {
  if (!selectedStepForQuestions.value) return

  savingQuestions.value = true
  try {
    let formId = null
    const { data: existingForm, error: formError } = await supabaseAdmin
      .from('forms')
      .select('id')
      .eq('step_id', selectedStepForQuestions.value.id)
      .maybeSingle()

    if (formError) throw formError

    if (existingForm) {
      formId = existingForm.id
    } else {
      const { data: newForm, error: createError } = await supabaseAdmin
        .from('forms')
        .insert({
          step_id: selectedStepForQuestions.value.id,
          name: `Formulaire - ${selectedStepForQuestions.value.name}`,
          description: `Formulaire d'évaluation pour ${selectedStepForQuestions.value.name}`,
          form_type: 'scoring',
          is_active: true
        })
        .select()
      if (createError) throw createError
      formId = newForm[0].id
    }

    const { data: oldFields, error: oldFieldsError } = await supabaseAdmin
      .from('form_fields')
      .select('id')
      .eq('form_id', formId)
    if (oldFieldsError) throw oldFieldsError

    for (const field of oldFields || []) {
      await supabaseAdmin.from('field_options').delete().eq('form_field_id', field.id)
    }
    await supabaseAdmin.from('form_fields').delete().eq('form_id', formId)

    for (let i = 0; i < questions.value.length; i++) {
      const q = questions.value[i]
      if (!q.field_name.trim()) continue

      const { data: newField, error: fieldError } = await supabaseAdmin
        .from('form_fields')
        .insert({
          form_id: formId,
          field_name: q.field_name,
          field_type: q.field_type || 'suggestion',
          is_required: q.is_required || false,
          min_value: q.min_value || 0,
          max_value: q.max_value || 20,
          field_order: i
        })
        .select()
      if (fieldError) throw fieldError

      const fieldId = newField[0].id

      if (q.field_type === 'checkbox' && q.options && q.options.length > 0) {
        for (const opt of q.options) {
          if (!opt.label.trim()) continue
          await supabaseAdmin
            .from('field_options')
            .insert({
              form_field_id: fieldId,
              option_label: opt.label,
              option_value: String(opt.value || 0),
              option_order: 0
            })
        }
      }
    }

    alert('Questions enregistrées avec succès !')
    await loadQuestions(selectedStepForQuestions.value.id)
  } catch (err) {
    console.error('Erreur sauvegarde questions:', err)
    alert('Erreur : ' + err.message)
  } finally {
    savingQuestions.value = false
  }
}

// ============================================================
// LIFECYCLE
// ============================================================
onMounted(() => {
  loadSteps()
})

watch(searchQuery, () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    currentPage.value = 1
    loadSteps()
  }, 300)
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

::-webkit-scrollbar {
  width: 3px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 9999px;
}
::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}

.backdrop-blur-xl {
  backdrop-filter: blur(16px) saturate(180%);
  -webkit-backdrop-filter: blur(16px) saturate(180%);
}
</style>