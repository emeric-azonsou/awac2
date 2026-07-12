<template>
  <div class="space-y-4 md:space-y-6">
    <!-- ===== EN-TÊTE ===== -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 md:gap-4">
      <div>
        <h1 class="text-xl md:text-2xl lg:text-3xl font-heading font-black text-gray-900">
          Gestion des Utilisateurs & Jurys
        </h1>
        <p class="text-xs md:text-sm text-gray-500 font-sans mt-0.5">
          Gérez les utilisateurs, assignez des jurés aux étapes et visualisez les affectations.
        </p>
      </div>
      <div class="flex gap-2">
        <button
          v-if="activeTab === 'users' && canCreateUsers"
          @click="openCreateModal"
          class="flex items-center justify-center gap-2 px-4 py-2.5 md:px-5 md:py-2.5 bg-awac-primary text-white text-xs md:text-sm font-semibold rounded-xl hover:bg-awac-primary/90 transition-colors shadow-sm"
        >
          <span class="material-icons text-sm md:text-base">person_add</span>
          Nouvel Utilisateur
        </button>
      </div>
    </div>

    <!-- ===== ONGLETS ===== -->
    <div class="bg-white/60 backdrop-blur-xl border border-white/30 rounded-2xl p-1 shadow-sm flex gap-1">
      <button
        @click="switchTab('users')"
        class="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
        :class="activeTab === 'users' ? 'bg-awac-primary text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100'"
      >
        <span class="material-icons text-sm align-middle mr-2">people</span>
        Utilisateurs
      </button>
      <button
        @click="switchTab('jury')"
        class="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
        :class="activeTab === 'jury' ? 'bg-awac-primary text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100'"
      >
        <span class="material-icons text-sm align-middle mr-2">gavel</span>
        Jurys par étape
      </button>
      <button
        @click="switchTab('assignments')"
        class="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
        :class="activeTab === 'assignments' ? 'bg-awac-primary text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100'"
      >
        <span class="material-icons text-sm align-middle mr-2">link</span>
        Affectations
      </button>
    </div>

    <!-- ===== ONGLET UTILISATEURS ===== -->
    <div v-if="activeTab === 'users'">
      <div class="bg-white/60 backdrop-blur-xl border border-white/30 rounded-2xl p-3 md:p-4 shadow-sm">
        <div class="flex flex-col sm:flex-row gap-2 md:gap-3">
          <div class="flex-1 relative">
            <span class="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">search</span>
            <input
              v-model="searchQuery"
              @input="onSearchInput"
              type="text"
              placeholder="Rechercher un utilisateur..."
              class="w-full pl-9 pr-3 md:pr-4 py-2 md:py-2.5 rounded-xl border border-gray-200 focus:border-awac-primary focus:ring-2 focus:ring-awac-primary/20 outline-none transition-all bg-white/50 text-sm"
            />
          </div>
          <div class="flex gap-2">
            <select
              v-model="filters.role"
              @change="loadUsers"
              class="px-3 md:px-4 py-2 md:py-2.5 rounded-xl border border-gray-200 focus:border-awac-primary focus:ring-2 focus:ring-awac-primary/20 outline-none transition-all bg-white/50 text-xs md:text-sm"
            >
              <option value="">Tous les rôles</option>
              <option value="super_admin">Super Admin</option>
              <option value="administrator">Administrateur</option>
              <option value="moderator">Modérateur</option>
              <option value="jury_member">Membre du Jury</option>
            </select>
            <button
              @click="resetFilters"
              class="px-3 md:px-4 py-2 md:py-2.5 text-xs md:text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <span class="material-icons text-sm">clear</span>
            </button>
          </div>
        </div>
      </div>

      <div class="bg-white/60 backdrop-blur-xl border border-white/30 rounded-2xl p-3 md:p-5 shadow-sm">
        <div v-if="loading" class="flex justify-center py-8">
          <div class="animate-spin rounded-full h-6 w-6 md:h-8 md:w-8 border-2 border-awac-primary border-t-transparent"></div>
        </div>
        <div v-else-if="error" class="text-center py-8 text-red-500">{{ error }}</div>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-200">
                <th class="text-left py-3 font-heading font-bold text-gray-400 tracking-widest text-[10px]">Identifiant</th>
                <th class="text-left py-3 font-heading font-bold text-gray-400 tracking-widest text-[10px]">Nom</th>
                <th class="text-left py-3 font-heading font-bold text-gray-400 tracking-widest text-[10px]">Rôle</th>
                <th class="text-left py-3 font-heading font-bold text-gray-400 tracking-widest text-[10px]">Statut</th>
                <th class="text-center py-3 font-heading font-bold text-gray-400 tracking-widest text-[10px]">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in displayedUsers" :key="user.id" class="border-b border-gray-50 hover:bg-white/20 transition-colors">
                <td class="py-3 font-mono text-sm text-gray-700">{{ user.username }}</td>
                <td class="py-3 font-medium text-gray-800">{{ user.full_name || '—' }}</td>
                <td class="py-3">
                  <span class="px-3 py-1 rounded-full text-[10px] font-medium" :class="getRoleBadge(user.role)">
                    {{ getRoleLabel(user.role) }}
                  </span>
                </td>
                <td class="py-3">
                  <span class="px-3 py-1 rounded-full text-[10px] font-medium" :class="user.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'">
                    {{ user.is_active ? 'Actif' : 'Inactif' }}
                  </span>
                </td>
                <td class="py-3 text-center">
                  <div v-if="canManageUser(user)" class="flex items-center justify-center gap-1">
                    <button
                      v-if="canEditUsers && canManageUser(user)"
                      @click="editUser(user)"
                      class="p-1.5 rounded-lg hover:bg-blue-500/10 text-gray-400 hover:text-blue-500 transition-colors"
                      title="Modifier"
                    >
                      <span class="material-icons text-sm">edit</span>
                    </button>
                    <button
                      v-if="canDeleteUsers && canManageUser(user)"
                      @click="openDeleteModal(user)"
                      class="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-500 transition-colors"
                      title="Supprimer"
                    >
                      <span class="material-icons text-sm">delete</span>
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="displayedUsers.length === 0">
                <td colspan="5" class="py-8 text-center text-gray-400 text-sm">Aucun utilisateur trouvé</td>
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
    </div>

    <!-- ===== ONGLET JURYS ===== -->
    <div v-if="activeTab === 'jury'">
      <div class="bg-white/60 backdrop-blur-xl border border-white/30 rounded-2xl p-3 md:p-5 shadow-sm">
        <div v-if="loadingSteps" class="flex justify-center py-8">
          <div class="animate-spin rounded-full h-6 w-6 md:h-8 md:w-8 border-2 border-awac-primary border-t-transparent"></div>
        </div>
        <div v-else-if="steps.length === 0" class="text-center py-8 text-gray-400">
          Aucune étape.
          <button @click="$router.push('/admin/steps')" class="mt-3 block mx-auto px-5 py-2.5 bg-awac-primary text-white rounded-xl text-sm font-semibold hover:bg-awac-primary/90 transition-colors">+ Gérer les étapes</button>
        </div>
        <div v-else class="space-y-4">
          <div v-for="step in steps" :key="step.id" class="border border-gray-100 rounded-xl p-4 hover:shadow-md transition flex items-center justify-between">
            <div>
              <h3 class="font-heading font-bold text-lg">{{ step.name }}</h3>
              <p class="text-sm text-gray-500">{{ getStepJurorsCount(step.id) }} juré(s)</p>
            </div>
            <button v-if="canManageJury" @click="openManageJurorsModal(step)" class="px-4 py-2 bg-awac-primary text-white rounded-xl text-sm font-semibold hover:bg-awac-primary/90 transition-colors">Gérer</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== ONGLET AFFECTATIONS ===== -->
    <div v-if="activeTab === 'assignments'">
      <div class="bg-white/60 backdrop-blur-xl border border-white/30 rounded-2xl p-3 md:p-5 shadow-sm">
        <div v-if="loadingSteps" class="flex justify-center py-8">
          <div class="animate-spin rounded-full h-6 w-6 md:h-8 md:w-8 border-2 border-awac-primary border-t-transparent"></div>
        </div>
        <div v-else-if="steps.length === 0" class="text-center py-8 text-gray-400">
          Aucune étape disponible.
          <button @click="$router.push('/admin/steps')" class="mt-3 block mx-auto px-5 py-2.5 bg-awac-primary text-white rounded-xl text-sm font-semibold hover:bg-awac-primary/90 transition-colors">+ Gérer les étapes</button>
        </div>
        <div v-else class="space-y-6">
          <div v-for="step in steps" :key="step.id" class="border border-gray-100 rounded-xl p-4">
            <div class="flex items-center justify-between mb-3">
              <h3 class="font-heading font-bold text-lg">{{ step.name }}</h3>
              <span class="text-sm text-gray-400">
                {{ getStepJurorsCount(step.id) }} juré(s)
                <span v-if="getPresidentForStep(step.id)" class="ml-2 text-amber-600">
                  👑 {{ getPresidentForStep(step.id).full_name || getPresidentForStep(step.id).username }}
                </span>
              </span>
            </div>
            <div class="flex flex-wrap gap-2">
              <span v-for="juror in getJurorsForStep(step.id)" :key="juror.id" class="px-3 py-1.5 rounded-full text-xs font-medium" :class="juror.is_president ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'">
                {{ juror.full_name || juror.username }}
                <span v-if="juror.is_president" class="ml-1">👑</span>
              </span>
              <span v-if="getJurorsForStep(step.id).length === 0" class="text-sm text-gray-400">Aucun juré assigné</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== MODAL CRÉATION / ÉDITION UTILISATEUR ===== -->
    <div v-if="showModal" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-2 sm:p-4" @click.self="closeModal">
      <div class="bg-white/95 backdrop-blur-xl rounded-t-3xl sm:rounded-3xl border border-white/30 shadow-2xl w-full max-w-lg max-h-[95vh] overflow-y-auto p-4 sm:p-6 animate-slide-up">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg sm:text-xl font-heading font-black text-gray-900">
            {{ editingUser ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur' }}
          </h2>
          <button @click="closeModal" class="p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <span class="material-icons">close</span>
          </button>
        </div>
        <form @submit.prevent="saveUser" class="space-y-4">
          <div>
            <label class="block text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Identifiant <span class="text-red-500">*</span></label>
            <input v-model="form.username" type="text" required :disabled="!!editingUser" class="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-gray-200 focus:border-awac-primary focus:ring-2 focus:ring-awac-primary/20 outline-none transition-all text-sm disabled:opacity-60 disabled:cursor-not-allowed" placeholder="ex: jdupont" />
            <p v-if="editingUser" class="text-xs text-gray-400 mt-1">L'identifiant ne peut pas être modifié.</p>
          </div>
          <div v-if="!editingUser">
            <label class="block text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Mot de passe <span class="text-red-500">*</span></label>
            <div class="relative">
              <input
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                required
                minlength="8"
                class="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-gray-200 focus:border-awac-primary focus:ring-2 focus:ring-awac-primary/20 outline-none transition-all text-sm pr-10"
                placeholder="Minimum 8 caractères"
              />
              <button
                type="button"
                @click="showPassword = !showPassword"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <span class="material-icons text-sm">{{ showPassword ? 'visibility_off' : 'visibility' }}</span>
              </button>
            </div>
          </div>
          <div>
            <label class="block text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Nom complet <span class="text-red-500">*</span></label>
            <input v-model="form.full_name" type="text" required class="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-gray-200 focus:border-awac-primary focus:ring-2 focus:ring-awac-primary/20 outline-none transition-all text-sm" placeholder="Jean Dupont" />
          </div>
          <div>
            <label class="block text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Rôle <span class="text-red-500">*</span></label>
            <select v-model="form.role" required class="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-gray-200 focus:border-awac-primary focus:ring-2 focus:ring-awac-primary/20 outline-none transition-all text-sm">
              <option value="">Sélectionner</option>
              <option v-for="roleOption in availableRoles" :key="roleOption.value" :value="roleOption.value">
                {{ roleOption.label }}
              </option>
            </select>
          </div>
          <div>
            <label class="block text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Statut</label>
            <select v-model="form.is_active" class="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-gray-200 focus:border-awac-primary focus:ring-2 focus:ring-awac-primary/20 outline-none transition-all text-sm">
              <option :value="true">Actif</option>
              <option :value="false">Inactif</option>
            </select>
          </div>
          <div class="flex flex-col-reverse sm:flex-row items-center gap-3 pt-2">
            <button type="button" @click="closeModal" class="w-full sm:w-auto px-6 py-2.5 border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 transition-colors text-sm">Annuler</button>
            <button type="submit" class="w-full sm:w-auto flex-1 sm:flex-none px-6 py-2.5 bg-awac-primary text-white font-semibold rounded-xl hover:bg-awac-primary/90 transition-colors shadow-sm text-sm disabled:opacity-70" :disabled="saving">
              <span v-if="saving" class="flex items-center justify-center gap-2">
                <span class="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
                Enregistrement...
              </span>
              <span v-else>{{ editingUser ? 'Mettre à jour' : 'Créer' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ===== MODALE SUCCÈS ===== -->
    <div v-if="showSuccessModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" @click.self="showSuccessModal = false">
      <div class="bg-white/95 backdrop-blur-xl rounded-3xl border border-green-500/30 shadow-2xl w-full max-w-md p-6 animate-slide-up">
        <div class="text-center">
          <div class="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <span class="material-icons text-4xl text-green-500">check_circle</span>
          </div>
          <h3 class="text-xl font-heading font-black text-gray-900 mb-2">🎉 Bravo !</h3>
          <p class="text-sm text-gray-500 mb-4">Vous avez créé le compte avec succès.</p>
          <div class="bg-gray-50 rounded-xl p-4 text-left space-y-2 border border-gray-100">
            <div>
              <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Identifiant</span>
              <p class="text-sm font-mono text-gray-800 break-all">{{ createdUser?.username }}</p>
            </div>
            <div>
              <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Mot de passe</span>
              <p class="text-sm font-mono text-gray-800 break-all">{{ createdUser?.password }}</p>
            </div>
          </div>
          <button
            @click="copyCredentials"
            class="mt-4 w-full px-4 py-2.5 bg-awac-primary text-white font-semibold rounded-xl hover:bg-awac-primary/90 transition-colors flex items-center justify-center gap-2"
          >
            <span class="material-icons text-sm">content_copy</span>
            Copier les identifiants
          </button>
          <button
            @click="showSuccessModal = false"
            class="mt-2 w-full px-4 py-2.5 border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 transition-colors text-sm"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>

    <!-- ===== MODALE GÉRER LES JURÉS ===== -->
    <div v-if="showManageJurorsModal" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-2 sm:p-4" @click.self="closeManageJurorsModal">
      <div class="bg-white/95 backdrop-blur-xl rounded-t-3xl sm:rounded-3xl border border-white/30 shadow-2xl w-full max-w-md max-h-[95vh] overflow-y-auto p-4 sm:p-6 animate-slide-up">
        <div class="flex items-center justify-between mb-5">
          <div>
            <h2 class="text-lg sm:text-xl font-heading font-black text-gray-900">
              {{ selectedStepForModal?.name }}
            </h2>
            <p class="text-xs text-gray-400 mt-0.5">Assignez des jurés à cette étape</p>
          </div>
          <button @click="closeManageJurorsModal" class="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <span class="material-icons text-gray-500">close</span>
          </button>
        </div>

        <div v-if="loadingJurorsModal" class="flex justify-center py-8">
          <div class="animate-spin rounded-full h-6 w-6 border-2 border-awac-primary border-t-transparent"></div>
        </div>

        <div v-else class="space-y-2">
          <div v-for="user in allJurors" :key="user.id" class="flex items-center justify-between p-3 rounded-xl transition-all duration-200" :class="isAssigned(user.id) ? 'bg-awac-primary/5 border border-awac-primary/20' : 'hover:bg-gray-50/50 border border-transparent'">
            <div class="flex items-center gap-3 min-w-0 flex-1">
              <div class="w-9 h-9 rounded-full bg-awac-primary/10 flex items-center justify-center text-awac-primary font-bold text-sm flex-shrink-0">
                {{ getInitials(user.full_name || user.username) }}
              </div>
              <div class="min-w-0 flex-1">
                <p class="font-medium text-gray-800 text-sm truncate">{{ user.full_name || user.username }}</p>
                <p class="text-xs text-gray-400 truncate">{{ user.email }}</p>
              </div>
            </div>

            <div v-if="canManageJury" class="flex items-center gap-2 flex-shrink-0">
              <span v-if="isAssigned(user.id)" class="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">Assigné</span>
              <span v-if="isPresident(user.id)" class="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 flex items-center gap-0.5">
                <span class="material-icons text-xs">star</span> Président
              </span>
              <button @click="toggleJurorAssignment(user.id)" class="p-1.5 rounded-lg transition-colors" :class="isAssigned(user.id) ? 'text-red-400 hover:bg-red-50 hover:text-red-600' : 'text-awac-primary hover:bg-awac-primary/10'" :title="isAssigned(user.id) ? 'Retirer' : 'Assigner'">
                <span class="material-icons text-sm">{{ isAssigned(user.id) ? 'person_remove' : 'person_add' }}</span>
              </button>
            </div>
          </div>

          <!-- Section président -->
          <div v-if="assignedCount > 0 && canManageJury" class="mt-4 pt-4 border-t border-gray-100">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Président</span>
              <span class="text-xs text-gray-400">{{ assignedCount }} juré(s)</span>
            </div>
            <div class="space-y-1">
              <div
                v-for="user in assignedJurors"
                :key="user.id + (isPresident(user.id) ? '-president' : '-member')"
                class="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50/50 transition"
              >
                <div class="flex items-center gap-2">
                  <div class="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 font-bold text-[10px]">
                    {{ getInitials(user.full_name || user.username) }}
                  </div>
                  <span class="text-sm text-gray-700">{{ user.full_name || user.username }}</span>
                  <span v-if="isPresident(user.id)" class="text-amber-500 text-sm">👑</span>
                </div>
                <button
                  @click="setPresident(user.id)"
                  class="text-xs px-3 py-1 rounded-full transition"
                  :class="isPresident(user.id) ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-amber-100 hover:text-amber-700'"
                >
                  {{ isPresident(user.id) ? 'Président ✓' : 'Nommer' }}
                </button>
              </div>
            </div>
          </div>

          <div v-if="allJurors.length === 0" class="text-center py-8">
            <span class="material-icons text-4xl text-gray-300">gavel</span>
            <p class="text-sm text-gray-400 mt-2">Aucun juré disponible</p>
            <p class="text-xs text-gray-400">Créez d'abord des utilisateurs avec le rôle "Membre du Jury".</p>
          </div>
        </div>

        <div class="mt-4 pt-3 border-t border-gray-100 flex justify-end">
          <button @click="closeManageJurorsModal" class="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors">Fermer</button>
        </div>
      </div>
    </div>

    <!-- ===== MODALE SUPPRESSION UTILISATEUR ===== -->
    <div v-if="showDeleteModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" @click.self="showDeleteModal = false">
      <div class="bg-white/95 backdrop-blur-xl rounded-3xl border border-white/30 shadow-2xl w-full max-w-sm p-6 animate-slide-up">
        <div class="text-center">
          <div class="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <span class="material-icons text-3xl text-red-500">warning</span>
          </div>
          <h3 class="text-lg font-heading font-bold text-gray-900 mb-2">Confirmer la suppression</h3>
          <p class="text-sm text-gray-500 mb-6">
            Supprimer définitivement <strong>{{ deleteUserData?.username }}</strong> ?
            <br><span class="text-red-500 font-bold">Action irréversible.</span>
          </p>
          <div class="flex flex-col-reverse sm:flex-row items-center gap-3">
            <button @click="showDeleteModal = false" class="w-full sm:w-auto px-5 py-2.5 border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 transition-colors text-sm">Annuler</button>
            <button @click="confirmDelete" class="w-full sm:w-auto px-5 py-2.5 bg-red-500 text-white font-semibold rounded-xl hover:bg-red-600 transition-colors shadow-sm text-sm flex items-center justify-center gap-2" :disabled="deleting">
              <span v-if="deleting" class="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
              {{ deleting ? 'Suppression...' : 'Supprimer' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { supabase, supabaseAdmin } from '@/services/supabase'
import { useRouter } from 'vue-router'
import { usePermissions } from '@/composables/usePermissions'
import { ROLES, getRoleLabel, getRoleBadge } from '@/config/roles'

const router = useRouter()

// ========== PERMISSIONS ==========
const { can, isSuperAdmin, userRole, isAdmin } = usePermissions()

const canCreateUsers = computed(() => isAdmin.value)
const canEditUsers = computed(() => isAdmin.value)
const canDeleteUsers = computed(() => isAdmin.value)
const canManageJury = computed(() => isAdmin.value || userRole.value === 'moderator')

// ============================================================
// FILTRE : le modérateur ne voit que les jurés
// ============================================================
const displayedUsers = computed(() => {
  if (userRole.value === 'moderator') {
    return users.value.filter(u => u.role === 'jury_member')
  }
  return users.value
})

// ============================================================
// RÔLES DISPONIBLES POUR LA CRÉATION
// ============================================================
const availableRoles = computed(() => {
  const roles = []
  if (isSuperAdmin.value) {
    // SuperAdmin peut tout créer (sauf lui-même, mais on le laisse)
    roles.push(
      { value: ROLES.SUPER_ADMIN, label: 'Super Admin' },
      { value: ROLES.ADMINISTRATOR, label: 'Administrateur' },
      { value: ROLES.MODERATOR, label: 'Modérateur' },
      { value: ROLES.JURY_MEMBER, label: 'Membre du Jury' }
    )
  } else if (isAdmin.value) {
    // Admin (administrator) peut créer administrateur, modérateur, juré
    roles.push(
      { value: ROLES.ADMINISTRATOR, label: 'Administrateur' },
      { value: ROLES.MODERATOR, label: 'Modérateur' },
      { value: ROLES.JURY_MEMBER, label: 'Membre du Jury' }
    )
  } else if (userRole.value === 'moderator') {
    // Modérateur ne peut créer que des jurés
    roles.push(
      { value: ROLES.JURY_MEMBER, label: 'Membre du Jury' }
    )
  } else {
    // Fallback (jury_member, etc.)
    roles.push(
      { value: ROLES.JURY_MEMBER, label: 'Membre du Jury' }
    )
  }
  return roles
})

// ============================================================
// VÉRIFICATION DES PERMISSIONS SUR UN UTILISATEUR
// ============================================================
const canManageUser = (user) => {
  // Si modérateur, il ne peut gérer que les jurés
  if (userRole.value === 'moderator') {
    return user.role === 'jury_member'
  }
  // Si admin (ou superadmin via isAdmin), il peut tout gérer sauf super_admin
  if (isAdmin.value) {
    return user.role !== ROLES.SUPER_ADMIN
  }
  // Sinon (normalement jamais)
  return true
}

// ============================================================
// ÉTAT
// ============================================================
const loading = ref(false)
const error = ref('')
const users = ref([])
const searchQuery = ref('')
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)
let searchTimeout = null
const showPassword = ref(false)
const showSuccessModal = ref(false)
const createdUser = ref(null)

const filters = reactive({ role: '' })
const showModal = ref(false)
const showDeleteModal = ref(false)
const editingUser = ref(null)
const deleteUserData = ref(null)
const saving = ref(false)
const deleting = ref(false)

const form = reactive({
  username: '',
  password: '',
  full_name: '',
  role: '',
  is_active: true,
})

// ============================================================
// ÉTAT JURYS
// ============================================================
const activeTab = ref('users')
const showManageJurorsModal = ref(false)
const selectedStepForModal = ref(null)
const loadingJurorsModal = ref(false)
const loadingSteps = ref(false)

const steps = ref([])
const allJurors = ref([])
const assignments = ref([])

const totalPages = computed(() => Math.ceil(total.value / pageSize.value))

const assignedCount = computed(() => {
  return allJurors.value.filter(j => isAssigned(j.id)).length
})

const assignedJurors = computed(() => {
  return allJurors.value.filter(j => isAssigned(j.id))
})

// ============================================================
// MÉTHODES UTILITAIRES
// ============================================================
const getInitials = (name) => {
  if (!name) return '?'
  const parts = name.split(' ')
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

const getStepJurorsCount = (stepId) => {
  return assignments.value.filter(a => a.step_id === stepId).length
}

const getJurorsForStep = (stepId) => {
  const assignedIds = assignments.value.filter(a => a.step_id === stepId).map(a => a.profile_id)
  return allJurors.value.filter(j => assignedIds.includes(j.id)).map(j => {
    const assignment = assignments.value.find(a => a.profile_id === j.id && a.step_id === stepId)
    return { ...j, is_president: assignment?.is_president || false }
  })
}

const getPresidentForStep = (stepId) => {
  const presidentId = assignments.value.find(a => a.step_id === stepId && a.is_president)?.profile_id
  if (!presidentId) return null
  return allJurors.value.find(j => j.id === presidentId)
}

const isAssigned = (profileId) => {
  if (!selectedStepForModal.value) return false
  return assignments.value.some(a => a.profile_id === profileId && a.step_id === selectedStepForModal.value.id)
}

const isPresident = (profileId) => {
  if (!selectedStepForModal.value) return false
  return assignments.value.some(a => a.profile_id === profileId && a.step_id === selectedStepForModal.value.id && a.is_president)
}

// ============================================================
// CRUD UTILISATEURS
// ============================================================
const loadUsers = async () => {
  loading.value = true
  error.value = ''
  try {
    let query = supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((currentPage.value - 1) * pageSize.value, currentPage.value * pageSize.value - 1)

    if (filters.role) query = query.eq('role', filters.role)
    if (searchQuery.value.trim()) {
      const s = searchQuery.value.trim()
      query = query.or(`username.ilike.%${s}%,full_name.ilike.%${s}%`)
    }

    const { data, count, error: err } = await query
    if (err) throw err
    users.value = data || []
    total.value = count || 0
  } catch (err) {
    console.error('Erreur chargement:', err)
    error.value = err.message
  } finally {
    loading.value = false
  }
}

const resetFilters = () => {
  filters.role = ''
  searchQuery.value = ''
  currentPage.value = 1
  loadUsers()
}

const onSearchInput = () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    currentPage.value = 1
    loadUsers()
  }, 300)
}

const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--
    loadUsers()
  }
}

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
    loadUsers()
  }
}

const openCreateModal = () => {
  editingUser.value = null
  showPassword.value = false
  const defaultRole = userRole.value === 'moderator' ? 'jury_member' : 'jury_member'
  Object.assign(form, { username: '', password: '', full_name: '', role: defaultRole, is_active: true })
  showModal.value = true
}

const editUser = (user) => {
  editingUser.value = user
  showPassword.value = false
  Object.assign(form, {
    username: user.username,
    password: '',
    full_name: user.full_name || '',
    role: user.role || '',
    is_active: user.is_active !== undefined ? user.is_active : true,
  })
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  editingUser.value = null
}

const openDeleteModal = (user) => {
  deleteUserData.value = user
  showDeleteModal.value = true
}

const copyCredentials = () => {
  const text = `Identifiant : ${createdUser.value.username}\nMot de passe : ${createdUser.value.password}`
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => {
      alert('✅ Identifiants copiés !')
    }).catch(() => {
      alert('❌ Erreur lors de la copie.')
    })
  } else {
    const textarea = document.createElement('textarea')
    textarea.value = text
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    alert('✅ Identifiants copiés !')
  }
}

const saveUser = async () => {
  saving.value = true
  try {
    if (editingUser.value) {
      // Vérification des permissions pour la mise à jour
      if (form.role === ROLES.SUPER_ADMIN && !isSuperAdmin.value) {
        alert('❌ Seul un Super Admin peut attribuer le rôle Super Admin.')
        saving.value = false
        return
      }
      if (userRole.value === 'moderator' && form.role !== ROLES.JURY_MEMBER) {
        alert('❌ Un modérateur ne peut que modifier des jurés.')
        saving.value = false
        return
      }
      // Si admin, il peut mettre à jour n'importe quel rôle sauf super_admin
      // (déjà géré par canManageUser, mais on vérifie ici)
      if (isAdmin.value && editingUser.value.role === ROLES.SUPER_ADMIN && !isSuperAdmin.value) {
        alert('❌ Vous ne pouvez pas modifier un Super Admin.')
        saving.value = false
        return
      }

      const { error } = await supabaseAdmin
        .from('profiles')
        .update({
          full_name: form.full_name,
          role: form.role,
          is_active: form.is_active,
        })
        .eq('id', editingUser.value.id)
      if (error) throw error
      closeModal()
      await loadUsers()
      await loadAllJurors()
    } else {
      // Création d'un nouvel utilisateur
      if (form.role === ROLES.SUPER_ADMIN && !isSuperAdmin.value) {
        alert('❌ Seul un Super Admin peut créer un Super Admin.')
        saving.value = false
        return
      }
      if (userRole.value === 'moderator' && form.role !== ROLES.JURY_MEMBER) {
        alert('❌ Un modérateur ne peut que créer des jurés.')
        saving.value = false
        return
      }
      // Admin peut créer tout sauf super_admin (déjà vérifié)

      const email = `${form.username}@awac.local`
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: form.password,
        email_confirm: true,
      })
      if (authError) throw authError

      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: authData.user.id,
          username: form.username,
          full_name: form.full_name,
          role: form.role,
          is_active: form.is_active,
          email,
        })
      if (profileError) {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
        throw profileError
      }

      closeModal()
      createdUser.value = {
        username: form.username,
        password: form.password
      }
      showSuccessModal.value = true
      await loadUsers()
      await loadAllJurors()
    }
  } catch (err) {
    console.error('Erreur sauvegarde:', err)
    alert('Erreur : ' + err.message)
  } finally {
    saving.value = false
  }
}

const confirmDelete = async () => {
  const user = deleteUserData.value
  if (!user) return
  deleting.value = true
  try {
    if (user.role === ROLES.SUPER_ADMIN && !isSuperAdmin.value) {
      alert('❌ Seul un Super Admin peut supprimer un Super Admin.')
      deleting.value = false
      return
    }
    if (userRole.value === 'moderator' && user.role !== ROLES.JURY_MEMBER) {
      alert('❌ Un modérateur ne peut supprimer que des jurés.')
      deleting.value = false
      return
    }

    const { error: profileError } = await supabaseAdmin.from('profiles').delete().eq('id', user.id)
    if (profileError) throw profileError
    try {
      await supabaseAdmin.auth.admin.deleteUser(user.id)
    } catch (e) {
      if (e.status !== 404) throw e
    }
    showDeleteModal.value = false
    await loadUsers()
    await loadAllJurors()
  } catch (err) {
    console.error('Erreur suppression:', err)
    alert('Erreur : ' + err.message)
  } finally {
    deleting.value = false
    deleteUserData.value = null
  }
}

// ============================================================
// GESTION JURYS (CORRIGÉ)
// ============================================================
const switchTab = (tab) => {
  activeTab.value = tab
  if (tab === 'jury' || tab === 'assignments') {
    loadSteps()
    loadAllJurors()
    loadAssignments()
  }
}

const loadAllJurors = async () => {
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('role', 'jury_member')
    if (error) throw error
    allJurors.value = data || []
  } catch (err) {
    console.error('Erreur chargement jurés:', err)
  }
}

const loadSteps = async () => {
  loadingSteps.value = true
  try {
    const { data, error } = await supabaseAdmin
      .from('steps')
      .select('*')
      .order('step_order')
    if (error) throw error
    steps.value = data || []
  } catch (err) {
    console.error('Erreur chargement étapes:', err)
  } finally {
    loadingSteps.value = false
  }
}

const loadAssignments = async () => {
  try {
    const { data, error } = await supabaseAdmin
      .from('step_juries')
      .select('*, profiles:profile_id(id, username, full_name, email, role)')
    if (error) throw error

    // Forcer une nouvelle référence pour déclencher la réactivité
    assignments.value = (data || []).map(j => ({
      id: j.id,
      profile_id: j.profile_id,
      step_id: j.step_id,
      is_president: j.is_president || false,
      username: j.profiles?.username,
      full_name: j.profiles?.full_name,
      email: j.profiles?.email,
      role: j.profiles?.role,
    }))
  } catch (err) {
    console.error('Erreur chargement assignations:', err)
  }
}

const openManageJurorsModal = async (step) => {
  selectedStepForModal.value = step
  showManageJurorsModal.value = true
  await loadAssignments()
}

const closeManageJurorsModal = () => {
  showManageJurorsModal.value = false
  selectedStepForModal.value = null
}

// ===== toggleJurorAssignment corrigé (évite 409) =====
const toggleJurorAssignment = async (profileId) => {
  if (!selectedStepForModal.value) return
  const stepId = selectedStepForModal.value.id
  const assigned = isAssigned(profileId)

  try {
    if (assigned) {
      await supabaseAdmin
        .from('step_juries')
        .delete()
        .eq('step_id', stepId)
        .eq('profile_id', profileId)
    } else {
      // Vérifier l'existence pour éviter 409
      const { data: existing, error: checkError } = await supabaseAdmin
        .from('step_juries')
        .select('id')
        .eq('step_id', stepId)
        .eq('profile_id', profileId)
        .maybeSingle()

      if (checkError) throw checkError

      if (existing) {
        await supabaseAdmin
          .from('step_juries')
          .update({ is_president: false })
          .eq('id', existing.id)
      } else {
        await supabaseAdmin
          .from('step_juries')
          .insert({ step_id: stepId, profile_id: profileId, is_president: false })
      }
    }
    await loadAssignments()
  } catch (err) {
    console.error('Erreur toggle assignation:', err)
    alert('Erreur : ' + err.message)
  }
}

// ===== setPresident corrigé avec nextTick et .select() =====
const setPresident = async (profileId) => {
  if (!selectedStepForModal.value || !selectedStepForModal.value.id) {
    alert('Erreur : veuillez rouvrir la modale.')
    return
  }

  const stepId = selectedStepForModal.value.id

  if (!confirm('Nommer ce membre comme président ?')) return

  try {
    // 1. Vérifier que le juré est assigné à cette étape
    const { data: existing, error: checkError } = await supabase
      .from('step_juries')
      .select('id')
      .eq('step_id', stepId)
      .eq('profile_id', profileId)
      .maybeSingle()

    if (checkError) throw checkError

    // 2. Si non assigné, l'assigner d'abord
    if (!existing) {
      const { error: insertError } = await supabase
        .from('step_juries')
        .insert({ step_id: stepId, profile_id: profileId, is_president: false })
      if (insertError) throw insertError
    }

    // 3. Retirer l'ancien président
    const { error: clearError } = await supabase
      .from('step_juries')
      .update({ is_president: false })
      .eq('step_id', stepId)
      .eq('is_president', true)
    if (clearError) throw clearError

    // 4. Nommer le nouveau président avec .select() pour vérifier
    const { data: updated, error: setError } = await supabase
      .from('step_juries')
      .update({ is_president: true })
      .eq('step_id', stepId)
      .eq('profile_id', profileId)
      .select()

    if (setError) throw setError

    // Vérifier que la mise à jour a bien eu lieu
    if (!updated || updated.length === 0) {
      console.warn('⚠️ Ligne non trouvée pour update, tentative d\'insertion...')
      // Si la ligne n'existe pas (cas improbable), on insert
      const { error: insertError } = await supabase
        .from('step_juries')
        .insert({ step_id: stepId, profile_id: profileId, is_president: true })
      if (insertError) throw insertError
    }

    // 5. Recharger les assignations
    await loadAssignments()

    // 6. Forcer le re-rendu en "clignotant" la modale
    const currentStep = { ...selectedStepForModal.value }
    selectedStepForModal.value = null
    await nextTick()
    selectedStepForModal.value = currentStep

  } catch (err) {
    console.error('❌ Erreur nomination président:', err)
    alert('Erreur : ' + err.message)
  }
}

// ===== DEBUG : Expose les données dans la console =====
if (typeof window !== 'undefined') {
  window.__debug = {
    assignments: () => assignments.value,
    allJurors: () => allJurors.value,
    selectedStep: () => selectedStepForModal.value,
    isPresident: (id) => isPresident(id),
    assignedJurors: () => assignedJurors.value,
    loadAssignments: loadAssignments,
    setPresident: setPresident,
    toggle: toggleJurorAssignment,
    supabase: supabase,
  }
  console.log('✅ __debug disponible dans la console')
}

// ============================================================
// INIT
// ============================================================
onMounted(async () => {
  await loadUsers()
  await loadAllJurors()
  await loadSteps()
  await loadAssignments()
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