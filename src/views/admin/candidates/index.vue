<template>
  <div class="space-y-4 md:space-y-6">
    <!-- ===== EN-TÊTE ===== -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 md:gap-4">
      <div>
        <h1 class="text-xl md:text-2xl lg:text-3xl font-heading font-black text-gray-900">
          Candidats
        </h1>
        <p class="text-xs md:text-sm text-gray-500 font-sans mt-0.5">
          Gérez les candidats et suivez leurs votes.
        </p>
      </div>
      <button
        @click="openCreateModal"
        class="flex items-center justify-center gap-2 px-4 py-2.5 md:px-5 md:py-2.5 bg-awac-primary text-white text-xs md:text-sm font-semibold rounded-xl hover:bg-awac-primary/90 transition-colors shadow-sm w-full sm:w-auto"
      >
        <span class="material-icons text-sm md:text-base">add</span>
        Nouveau Candidat
      </button>
    </div>

    <!-- ===== FILTRES ===== -->
    <div class="bg-white/60 backdrop-blur-xl border border-white/30 rounded-2xl p-3 md:p-4 shadow-sm">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap gap-2 md:gap-3">
        <div class="w-full sm:col-span-2 lg:flex-1 min-w-[140px]">
          <div class="relative">
            <span class="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">search</span>
            <input
              v-model="filters.search"
              @input="loadCandidates"
              type="text"
              placeholder="Rechercher (nom, prénom, code)"
              class="w-full pl-9 pr-3 md:pr-4 py-2 md:py-2.5 rounded-xl border border-gray-200 focus:border-awac-primary focus:ring-2 focus:ring-awac-primary/20 outline-none transition-all bg-white/50 text-sm"
            />
          </div>
        </div>
        <div class="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 w-full sm:w-auto">
          <select
            v-model="filters.status"
            @change="loadCandidates"
            class="px-3 md:px-4 py-2 md:py-2.5 rounded-xl border border-gray-200 focus:border-awac-primary focus:ring-2 focus:ring-awac-primary/20 outline-none transition-all bg-white/50 text-xs md:text-sm w-full sm:w-auto"
          >
            <option value="">Statut</option>
            <option value="registered">Inscrit</option>
            <option value="approved">Approuvé</option>
            <option value="rejected">Rejeté</option>
            <option value="withdrawn">Retiré</option>
          </select>
          <select
            v-model="filters.gender"
            @change="loadCandidates"
            class="px-3 md:px-4 py-2 md:py-2.5 rounded-xl border border-gray-200 focus:border-awac-primary focus:ring-2 focus:ring-awac-primary/20 outline-none transition-all bg-white/50 text-xs md:text-sm w-full sm:w-auto"
          >
            <option value="">Genre</option>
            <option value="male">Homme</option>
            <option value="female">Femme</option>
          </select>
          <button
            @click="resetFilters"
            class="px-3 md:px-4 py-2 md:py-2.5 text-xs md:text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
          >
            Réinitialiser
          </button>
        </div>
      </div>
    </div>

    <!-- ===== GRILLE DE CARTES ===== -->
    <div class="bg-white/60 backdrop-blur-xl border border-white/30 rounded-2xl p-3 md:p-5 shadow-sm overflow-hidden">
      <div v-if="loading" class="flex justify-center py-8 md:py-12">
        <div class="animate-spin rounded-full h-6 w-6 md:h-8 md:w-8 border-2 border-awac-primary border-t-transparent"></div>
      </div>

      <div v-else-if="error" class="text-center py-8 md:py-12 text-red-500 text-sm md:text-base">
        {{ error }}
      </div>

      <div v-else class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
        <div
          v-for="candidate in candidates"
          :key="candidate.id"
          class="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 border border-gray-100"
        >
          <!-- PHOTO -->
          <div class="relative w-full h-56 md:h-64 bg-gray-100 overflow-hidden">
            <img
              v-if="candidate.photo_url"
              :src="candidate.photo_url"
              :alt="candidate.first_name"
              class="w-full h-full object-cover object-center"
            />
            <div v-else class="w-full h-full flex items-center justify-center text-gray-300 bg-gray-50">
              <span class="material-icons text-6xl">person</span>
            </div>
            <span
              class="absolute top-3 right-3 px-3 py-1 rounded-full text-[10px] font-medium shadow-sm"
              :class="getStatusBadge(candidate.status)"
            >
              {{ getStatusLabel(candidate.status) }}
            </span>
          </div>

          <!-- INFOS -->
          <div class="p-4 md:p-5">
            <div class="flex items-start justify-between">
              <div>
                <h3 class="font-heading font-bold text-gray-900 text-base md:text-lg">
                  {{ candidate.first_name }} {{ candidate.last_name }}
                </h3>
                <p class="font-mono text-xs text-gray-400">{{ candidate.unique_code }}</p>
              </div>
              <span class="text-xs text-gray-400">{{ candidate.commune || '—' }}</span>
            </div>

            <!-- COMPTEUR DE VOTES -->
            <div class="mt-3 flex items-center gap-4 bg-gray-50/70 rounded-xl px-4 py-2.5 border border-gray-100">
              <div class="flex items-center gap-2">
                <span class="material-icons text-awac-primary text-sm">how_to_vote</span>
                <span class="text-sm font-semibold text-gray-800">{{ candidate.vote_count || 0 }}</span>
                <span class="text-xs text-gray-400">votes</span>
              </div>
              <div class="w-px h-5 bg-gray-200"></div>
              <div class="flex items-center gap-1">
                <span class="text-sm font-semibold text-gray-800">
                  {{ formatAmount(candidate.vote_total || 0) }}
                </span>
                <span class="text-xs text-gray-400">FCFA</span>
              </div>
            </div>

            <!-- ACTIONS -->
            <div class="mt-4 flex items-center gap-2">
              <button
                @click="viewCandidate(candidate)"
                class="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-awac-primary/10 text-awac-primary rounded-xl text-xs font-semibold hover:bg-awac-primary hover:text-white transition-all duration-200"
              >
                <span class="material-icons text-sm">visibility</span>
                Voir détails
              </button>
              <button
                @click="editCandidate(candidate)"
                class="p-2 rounded-xl hover:bg-blue-500/10 text-gray-400 hover:text-blue-500 transition-colors"
                title="Modifier"
              >
                <span class="material-icons text-sm">edit</span>
              </button>
              <button
                @click="openDeleteModal(candidate)"
                class="p-2 rounded-xl hover:bg-red-500/10 text-gray-400 hover:text-red-500 transition-colors"
                title="Supprimer"
              >
                <span class="material-icons text-sm">delete</span>
              </button>
            </div>
          </div>
        </div>

        <div v-if="candidates.length === 0" class="col-span-full text-center py-12 text-gray-400 text-sm">
          Aucun candidat trouvé
        </div>
      </div>

      <!-- PAGINATION -->
      <div v-if="totalPages > 1" class="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-4 border-t border-gray-200">
        <div class="text-xs md:text-sm text-gray-500">
          {{ (currentPage - 1) * pageSize + 1 }} - {{ Math.min(currentPage * pageSize, total) }} sur {{ total }}
        </div>
        <div class="flex gap-2">
          <button
            @click="prevPage"
            :disabled="currentPage === 1"
            class="px-3 md:px-4 py-1.5 md:py-2 rounded-lg border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors text-xs md:text-sm"
          >
            Précédent
          </button>
          <button
            @click="nextPage"
            :disabled="currentPage === totalPages"
            class="px-3 md:px-4 py-1.5 md:py-2 rounded-lg border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors text-xs md:text-sm"
          >
            Suivant
          </button>
        </div>
      </div>
    </div>

    <!-- ===== MODAL CRÉATION / ÉDITION (plus large) ===== -->
    <div
      v-if="showModal"
      class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-2 sm:p-4"
      @click.self="closeModal"
    >
      <div class="bg-white/95 backdrop-blur-xl rounded-t-3xl sm:rounded-3xl border border-white/30 shadow-2xl w-full max-w-3xl max-h-[95vh] overflow-y-auto p-4 sm:p-6 animate-slide-up">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg sm:text-xl font-heading font-black text-gray-900">
            {{ editingCandidate ? 'Modifier le candidat' : 'Nouveau candidat' }}
          </h2>
          <button @click="closeModal" class="p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <span class="material-icons">close</span>
          </button>
        </div>

        <form @submit.prevent="saveCandidate" class="space-y-4">
          <!-- Ligne 1 : Prénom + Nom -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Prénom <span class="text-red-500">*</span></label>
              <input
                v-model="form.first_name"
                type="text"
                required
                class="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-gray-200 focus:border-awac-primary focus:ring-2 focus:ring-awac-primary/20 outline-none transition-all text-sm"
              />
            </div>
            <div>
              <label class="block text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Nom <span class="text-red-500">*</span></label>
              <input
                v-model="form.last_name"
                type="text"
                required
                class="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-gray-200 focus:border-awac-primary focus:ring-2 focus:ring-awac-primary/20 outline-none transition-all text-sm"
              />
            </div>
          </div>

          <!-- Ligne 2 : Téléphone + Genre -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Téléphone</label>
              <input
                v-model="form.phone"
                type="tel"
                class="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-gray-200 focus:border-awac-primary focus:ring-2 focus:ring-awac-primary/20 outline-none transition-all text-sm"
              />
            </div>
            <div>
              <label class="block text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Genre <span class="text-red-500">*</span></label>
              <select
                v-model="form.gender"
                required
                class="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-gray-200 focus:border-awac-primary focus:ring-2 focus:ring-awac-primary/20 outline-none transition-all text-sm"
              >
                <option value="">Sélectionner</option>
                <option value="male">Homme</option>
                <option value="female">Femme</option>
              </select>
            </div>
          </div>

          <!-- Ligne 3 : Atelier + Commune -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Atelier</label>
              <input
                v-model="form.workshop_name"
                type="text"
                class="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-gray-200 focus:border-awac-primary focus:ring-2 focus:ring-awac-primary/20 outline-none transition-all text-sm"
                placeholder="Nom de l'atelier"
              />
            </div>
            <div>
              <label class="block text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Commune <span class="text-red-500">*</span></label>
              <select
                v-model="form.commune"
                required
                class="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-gray-200 focus:border-awac-primary focus:ring-2 focus:ring-awac-primary/20 outline-none transition-all text-sm"
              >
                <option value="">Sélectionner</option>
                <option value="Lokossa">Lokossa</option>
                <option value="Athiémé">Athiémé</option>
                <option value="Bopa">Bopa</option>
                <option value="Comè">Comè</option>
                <option value="Grand-Popo">Grand-Popo</option>
                <option value="Houéyogbé">Houéyogbé</option>
              </select>
            </div>
          </div>

          <!-- Ligne 4 : Statut -->
          <div>
            <label class="block text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Statut</label>
            <select
              v-model="form.status"
              class="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-gray-200 focus:border-awac-primary focus:ring-2 focus:ring-awac-primary/20 outline-none transition-all text-sm"
            >
              <option value="registered">Inscrit</option>
              <option value="approved">Approuvé</option>
              <option value="rejected">Rejeté</option>
              <option value="withdrawn">Retiré</option>
            </select>
          </div>

          <!-- Ligne 5 : PHOTO -->
          <div>
            <label class="block text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Photo</label>
            <div class="flex flex-col sm:flex-row items-start gap-3">
              <div class="flex-1 w-full">
                <input
                  type="file"
                  accept="image/*"
                  @change="handleFileUpload"
                  class="w-full text-sm file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-awac-primary/10 file:text-awac-primary hover:file:bg-awac-primary/20 transition-colors"
                />
                <p v-if="photoError" class="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <span class="material-icons text-xs">error</span>
                  {{ photoError }}
                </p>
              </div>
              <!-- Aperçu -->
              <div v-if="form.photo_preview" class="w-32 h-32 sm:w-40 sm:h-40 rounded-xl overflow-hidden border-2 border-awac-primary/20 flex-shrink-0 bg-gray-50">
                <img :src="form.photo_preview" alt="Aperçu" class="w-full h-full object-cover" />
              </div>
            </div>
            <p v-if="form.photo_url" class="text-xs text-green-600 mt-1 flex items-center gap-1">
              <span class="material-icons text-xs">check_circle</span>
              Photo déjà enregistrée
            </p>
          </div>

          <!-- BOUTONS -->
          <div class="flex flex-col-reverse sm:flex-row items-center gap-3 pt-2">
            <button
              type="button"
              @click="closeModal"
              class="w-full sm:w-auto px-6 py-2.5 border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 transition-colors text-sm"
            >
              Annuler
            </button>
            <button
              type="submit"
              class="w-full sm:w-auto flex-1 sm:flex-none px-6 py-2.5 bg-awac-primary text-white font-semibold rounded-xl hover:bg-awac-primary/90 transition-colors shadow-sm text-sm disabled:opacity-70"
              :disabled="saving"
            >
              <span v-if="saving" class="flex items-center justify-center gap-2">
                <span class="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
                Enregistrement...
              </span>
              <span v-else>{{ editingCandidate ? 'Mettre à jour' : 'Créer' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ===== MODALE DE DÉTAILS ===== -->
    <div
      v-if="showViewModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      @click.self="showViewModal = false"
    >
      <div class="bg-white/95 backdrop-blur-xl rounded-3xl border border-white/30 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 animate-slide-up">
        <div class="flex items-center justify-between mb-5">
          <h2 class="text-xl font-heading font-black text-gray-900">Détails du candidat</h2>
          <button @click="showViewModal = false" class="p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <span class="material-icons">close</span>
          </button>
        </div>

        <div v-if="viewingCandidate" class="space-y-6">
          <!-- Info candidat -->
          <div class="flex items-center gap-4 pb-4 border-b border-gray-100">
            <img
              v-if="viewingCandidate.photo_url"
              :src="viewingCandidate.photo_url"
              alt="Photo"
              class="w-16 h-16 rounded-full object-cover border-2 border-awac-primary/20"
            />
            <div v-else class="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-gray-400">
              <span class="material-icons text-3xl">person</span>
            </div>
            <div>
              <p class="text-lg font-heading font-bold text-gray-900">
                {{ viewingCandidate.first_name }} {{ viewingCandidate.last_name }}
              </p>
              <p class="font-mono text-sm text-gray-400">{{ viewingCandidate.unique_code }}</p>
              <span
                class="inline-block mt-1 px-3 py-0.5 rounded-full text-xs font-medium"
                :class="getStatusBadge(viewingCandidate.status)"
              >
                {{ getStatusLabel(viewingCandidate.status) }}
              </span>
            </div>
          </div>

          <!-- Infos -->
          <div class="grid grid-cols-2 gap-4 text-sm bg-gray-50/50 rounded-2xl p-4 border border-gray-100">
            <div>
              <p class="font-semibold text-gray-400 text-xs uppercase tracking-wider">Genre</p>
              <p class="font-medium text-gray-800">{{ getGenderLabel(viewingCandidate.gender) }}</p>
            </div>
            <div>
              <p class="font-semibold text-gray-400 text-xs uppercase tracking-wider">Téléphone</p>
              <p class="font-medium text-gray-800">{{ viewingCandidate.phone || '—' }}</p>
            </div>
            <div>
              <p class="font-semibold text-gray-400 text-xs uppercase tracking-wider">Atelier</p>
              <p class="font-medium text-gray-800">{{ viewingCandidate.workshop_name || '—' }}</p>
            </div>
            <div>
              <p class="font-semibold text-gray-400 text-xs uppercase tracking-wider">Commune</p>
              <p class="font-medium text-gray-800">{{ viewingCandidate.commune || '—' }}</p>
            </div>
          </div>

          <!-- Votes -->
          <div>
            <div class="flex items-center justify-between mb-3">
              <h3 class="text-sm font-heading font-bold text-gray-700 uppercase tracking-wider">
                Votes reçus ({{ votes.length }})
              </h3>
              <span class="text-sm font-semibold text-gray-800">
                Total : {{ formatAmount(voteTotal) }} FCFA
              </span>
            </div>

            <div v-if="loadingVotes" class="flex justify-center py-4">
              <div class="animate-spin rounded-full h-5 w-5 border-2 border-awac-primary border-t-transparent"></div>
            </div>

            <div v-else-if="votes.length === 0" class="text-center py-4 text-gray-400 text-sm">
              Aucun vote pour ce candidat.
            </div>

            <div v-else class="space-y-2 max-h-60 overflow-y-auto pr-1">
              <div
                v-for="vote in votes"
                :key="vote.id"
                class="flex items-center justify-between p-3 bg-gray-50/70 rounded-xl border border-gray-100 text-sm"
              >
                <div class="flex items-center gap-3">
                  <span class="font-mono text-xs text-gray-400">{{ formatDate(vote.vote_date) }}</span>
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-200 text-gray-700">
                    {{ vote.operator ? vote.operator.toUpperCase() : '—' }}
                  </span>
                  <span class="text-gray-600">{{ vote.phone_number || '—' }}</span>
                </div>
                <div class="flex items-center gap-3">
                  <span class="font-semibold text-gray-800">{{ formatAmount(vote.amount) }}</span>
                  <span
                    class="px-2 py-0.5 rounded-full text-[9px] font-medium flex items-center gap-0.5"
                    :class="vote.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'"
                  >
                    <span class="material-icons text-xs">
                      {{ vote.status === 'completed' ? 'check_circle' : 'hourglass_top' }}
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>
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
            <span class="font-semibold text-gray-800">{{ deleteCandidateData?.first_name }} {{ deleteCandidateData?.last_name }}</span>.
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
import { ref, reactive, computed, onMounted } from 'vue'
import { supabase, supabaseAdmin } from '@/services/supabase'

// ========== ÉTAT ==========
const loading = ref(true)
const error = ref('')
const candidates = ref([])
const showModal = ref(false)
const showViewModal = ref(false)
const showDeleteModal = ref(false)
const editingCandidate = ref(null)
const viewingCandidate = ref(null)
const deleteCandidateData = ref(null)
const saving = ref(false)
const deleting = ref(false)
const loadingVotes = ref(false)
const votes = ref([])
const photoError = ref('')
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)

const filters = reactive({
  search: '',
  status: '',
  gender: '',
})

const form = reactive({
  first_name: '',
  last_name: '',
  phone: '',
  gender: '',
  workshop_name: '',
  commune: '',
  status: 'registered',
  competition_id: null,
  photo_file: null,
  photo_preview: null,
  photo_url: null,
})

// ========== COMPUTED ==========
const totalPages = computed(() => Math.ceil(total.value / pageSize.value))
const voteTotal = computed(() => {
  return votes.value.reduce((sum, v) => sum + (v.amount || 0), 0)
})

// ========== FORMATAGE ==========
const formatAmount = (value) => {
  return new Intl.NumberFormat('fr-FR').format(value || 0)
}

const formatDate = (date) => {
  if (!date) return '—'
  return new Date(date).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// ========== MÉTHODES ==========
const getGenderLabel = (gender) => {
  const map = { male: 'Homme', female: 'Femme' }
  return map[gender] || gender
}

const getStatusLabel = (status) => {
  const map = {
    registered: 'Inscrit',
    approved: 'Approuvé',
    rejected: 'Rejeté',
    withdrawn: 'Retiré'
  }
  return map[status] || status
}

const getStatusBadge = (status) => {
  const map = {
    registered: 'bg-blue-100 text-blue-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    withdrawn: 'bg-gray-100 text-gray-700'
  }
  return map[status] || 'bg-gray-100 text-gray-700'
}

const resetFilters = () => {
  filters.search = ''
  filters.status = ''
  filters.gender = ''
  currentPage.value = 1
  loadCandidates()
}

// ===== COMPRESSION =====
const compressImage = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height
        const maxSize = 800
        if (width > height && width > maxSize) {
          height = (height / width) * maxSize
          width = maxSize
        } else if (height > maxSize) {
          width = (width / height) * maxSize
          height = maxSize
        }
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)

        let quality = 0.85
        const tryCompress = () => {
          canvas.toBlob(
            (b) => {
              if (b && b.size > 700 * 1024 && quality > 0.1) {
                quality -= 0.1
                tryCompress()
              } else if (b) {
                resolve(new File([b], file.name, { type: 'image/jpeg' }))
              } else {
                reject(new Error('Impossible de compresser'))
              }
            },
            'image/jpeg',
            quality
          )
        }
        tryCompress()
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}

// ===== GESTION PHOTO =====
const handleFileUpload = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  if (file.size > 1024 * 1024) {
    photoError.value = `La photo dépasse 1 Mo (${(file.size / (1024 * 1024)).toFixed(2)} Mo). Veuillez choisir une image plus légère.`
    form.photo_file = null
    form.photo_preview = null
    return
  } else {
    photoError.value = ''
  }

  if (file.size > 700 * 1024) {
    try {
      const compressed = await compressImage(file)
      form.photo_file = compressed
      const reader = new FileReader()
      reader.onload = (e) => {
        form.photo_preview = e.target.result
      }
      reader.readAsDataURL(compressed)
    } catch (err) {
      alert('Erreur compression')
    }
  } else {
    form.photo_file = file
    const reader = new FileReader()
    reader.onload = (e) => {
      form.photo_preview = e.target.result
    }
    reader.readAsDataURL(file)
  }
}

// ===== MODALES =====
const openCreateModal = () => {
  editingCandidate.value = null
  photoError.value = ''
  Object.assign(form, {
    first_name: '',
    last_name: '',
    phone: '',
    gender: '',
    workshop_name: '',
    commune: '',
    status: 'registered',
    competition_id: null,
    photo_file: null,
    photo_preview: null,
    photo_url: null,
  })
  showModal.value = true
}

const editCandidate = (candidate) => {
  photoError.value = ''
  editingCandidate.value = candidate
  Object.assign(form, {
    first_name: candidate.first_name,
    last_name: candidate.last_name,
    phone: candidate.phone || '',
    gender: candidate.gender || '',
    workshop_name: candidate.workshop_name || '',
    commune: candidate.commune || '',
    status: candidate.status || 'registered',
    competition_id: candidate.competition_id,
    photo_file: null,
    photo_preview: null,
    photo_url: candidate.photo_url || null,
  })
  showModal.value = true
}

const viewCandidate = async (candidate) => {
  viewingCandidate.value = candidate
  showViewModal.value = true
  await loadVotesForCandidate(candidate.id)
}

const closeModal = () => {
  showModal.value = false
  editingCandidate.value = null
  form.photo_preview = null
  form.photo_file = null
  photoError.value = ''
}

// ===== SUPPRESSION =====
const openDeleteModal = (candidate) => {
  deleteCandidateData.value = candidate
  showDeleteModal.value = true
}

// ===== CHARGEMENT CANDIDATS =====
const loadCandidates = async () => {
  loading.value = true
  error.value = ''

  try {
    let query = supabaseAdmin
      .from('candidates')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((currentPage.value - 1) * pageSize.value, currentPage.value * pageSize.value - 1)

    if (filters.search) {
      query = query.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,unique_code.ilike.%${filters.search}%`)
    }
    if (filters.status) {
      query = query.eq('status', filters.status)
    }
    if (filters.gender) {
      query = query.eq('gender', filters.gender)
    }

    const { data, count, error: err } = await query
    if (err) throw err

    const { data: voteData, error: voteErr } = await supabaseAdmin
      .from('public_votes')
      .select('candidate_id, amount')
      .in('candidate_id', (data || []).map(c => c.id))

    if (voteErr) throw voteErr

    const voteMap = {}
    if (voteData) {
      voteData.forEach(v => {
        if (!voteMap[v.candidate_id]) {
          voteMap[v.candidate_id] = { count: 0, total: 0 }
        }
        voteMap[v.candidate_id].count++
        voteMap[v.candidate_id].total += (v.amount || 0)
      })
    }

    if (data && data.length > 0) {
      for (const candidate of data) {
        if (candidate.photo_path) {
          const { data: urlData } = supabase.storage
            .from('candidates-photos')
            .getPublicUrl(candidate.photo_path)
          candidate.photo_url = urlData?.publicUrl || null
        }
        const stats = voteMap[candidate.id] || { count: 0, total: 0 }
        candidate.vote_count = stats.count
        candidate.vote_total = stats.total
      }
    }

    candidates.value = data || []
    total.value = count || 0
  } catch (err) {
    console.error('Erreur chargement candidats:', err)
    error.value = err.message || 'Erreur'
  } finally {
    loading.value = false
  }
}

// ===== CHARGEMENT VOTES =====
const loadVotesForCandidate = async (candidateId) => {
  loadingVotes.value = true
  try {
    const { data, error } = await supabaseAdmin
      .from('public_votes')
      .select('*')
      .eq('candidate_id', candidateId)
      .order('vote_date', { ascending: false })

    if (error) throw error
    votes.value = data || []
  } catch (err) {
    console.error('Erreur chargement votes:', err)
    votes.value = []
  } finally {
    loadingVotes.value = false
  }
}

// ===== UPLOAD PHOTO =====
const uploadPhoto = async (candidateId) => {
  if (!form.photo_file) return null
  const fileExt = form.photo_file.name.split('.').pop()
  const filePath = `${candidateId}/profile.${fileExt}`
  const { error } = await supabaseAdmin.storage
    .from('candidates-photos')
    .upload(filePath, form.photo_file, { cacheControl: '3600', upsert: true })
  if (error) throw error
  return filePath
}

// ===== SAUVEGARDE =====
const saveCandidate = async () => {
  saving.value = true
  try {
    if (!form.competition_id) {
      const { data: comps } = await supabaseAdmin
        .from('competitions')
        .select('id')
        .eq('is_active', true)
        .limit(1)
      if (comps && comps.length > 0) {
        form.competition_id = comps[0].id
      } else {
        alert('Aucune compétition active.')
        saving.value = false
        return
      }
    }

    const dataToSave = {
      first_name: form.first_name,
      last_name: form.last_name,
      phone: form.phone || null,
      gender: form.gender,
      category: null,
      workshop_name: form.workshop_name || null,
      commune: form.commune,
      status: form.status || 'registered',
      competition_id: form.competition_id,
    }

    let result
    let candidateId = editingCandidate.value?.id

    if (editingCandidate.value) {
      result = await supabaseAdmin
        .from('candidates')
        .update(dataToSave)
        .eq('id', editingCandidate.value.id)
        .select()
      if (result.error) throw result.error
      candidateId = editingCandidate.value.id
    } else {
      result = await supabaseAdmin
        .from('candidates')
        .insert(dataToSave)
        .select()
      if (result.error) throw result.error
      candidateId = result.data[0].id
    }

    if (form.photo_file && candidateId) {
      try {
        const filePath = await uploadPhoto(candidateId)
        await supabaseAdmin
          .from('candidates')
          .update({ photo_path: filePath })
          .eq('id', candidateId)
      } catch (uploadErr) {
        console.error('Erreur photo:', uploadErr)
      }
    }

    closeModal()
    await loadCandidates()
  } catch (err) {
    console.error('Erreur sauvegarde:', err)
    alert('Erreur : ' + (err.message || 'Erreur lors de la sauvegarde'))
  } finally {
    saving.value = false
  }
}

// ===== SUPPRESSION =====
const confirmDelete = async () => {
  const candidate = deleteCandidateData.value
  if (!candidate) return

  deleting.value = true
  try {
    if (candidate.photo_path) {
      await supabase.storage
        .from('candidates-photos')
        .remove([candidate.photo_path])
    }

    const { error } = await supabaseAdmin
      .from('candidates')
      .delete()
      .eq('id', candidate.id)

    if (error) throw error

    showDeleteModal.value = false
    await loadCandidates()
  } catch (err) {
    console.error('Erreur suppression:', err)
    alert('Erreur : ' + (err.message || 'Erreur lors de la suppression'))
  } finally {
    deleting.value = false
    deleteCandidateData.value = null
  }
}

// ===== PAGINATION =====
const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--
    loadCandidates()
  }
}

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
    loadCandidates()
  }
}

// ========== INIT ==========
onMounted(() => {
  loadCandidates()
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

input[type="file"]::file-selector-button {
  cursor: pointer;
}
</style>