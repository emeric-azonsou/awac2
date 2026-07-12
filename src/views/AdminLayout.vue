<template>
  <div class="min-h-screen bg-[#F9F8F6] flex">
    <!-- ========== SIDEBAR ========== -->
    <aside
      class="fixed inset-y-0 left-0 z-50 bg-white/80 backdrop-blur-xl border-r border-white/20 shadow-xl flex flex-col transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
      :class="[
        isMobile
          ? sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          : sidebarOpen ? 'w-64' : 'w-16'
      ]"
    >
      <!-- Logo -->
      <div class="flex items-center justify-center gap-2 py-5 border-b border-gray-100/50 min-h-[68px]">
        <span class="material-icons text-3xl text-awac-primary transition-all duration-300">how_to_vote</span>
        <span
          v-show="sidebarOpen || isMobile"
          class="font-heading font-black text-xl tracking-widest text-gray-900 whitespace-nowrap transition-opacity duration-300"
        >
          AWAC
        </span>
        <span
          v-show="sidebarOpen || isMobile"
          class="text-[10px] font-heading font-black tracking-[0.3em] uppercase text-gray-400 transition-opacity duration-300"
        >
          MONO
        </span>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 p-3 space-y-1 overflow-y-auto">
        <router-link
          v-for="item in filteredMenuItems"
          :key="item.path"
          :to="item.path"
          class="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 text-gray-600 hover:text-awac-primary hover:bg-awac-primary/10 group"
          active-class="bg-awac-primary/10 text-awac-primary"
          exact-active-class="bg-awac-primary/10 text-awac-primary"
          @click="closeSidebarOnMobile"
        >
          <span class="material-icons text-xl flex-shrink-0 transition-transform duration-200 group-hover:scale-110">{{ item.icon }}</span>
          <span
            v-show="sidebarOpen || isMobile"
            class="whitespace-nowrap transition-opacity duration-200"
          >
            {{ item.label }}
          </span>
        </router-link>
      </nav>

      <!-- Déconnexion -->
      <div v-show="sidebarOpen || isMobile" class="p-3 border-t border-gray-100/50">
        <button
          @click="deconnexion"
          class="flex items-center gap-3 w-full px-3 py-3 rounded-xl text-sm font-medium text-gray-500 hover:text-red-500 hover:bg-red-50 transition-all duration-200"
        >
          <span class="material-icons text-xl">logout</span>
          <span>Déconnexion</span>
        </button>
      </div>

      <div v-show="!sidebarOpen && !isMobile" class="p-3 border-t border-gray-100/50">
        <button
          @click="deconnexion"
          class="flex items-center justify-center w-full py-3 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all duration-200"
          title="Déconnexion"
        >
          <span class="material-icons text-xl">logout</span>
        </button>
      </div>
    </aside>

    <!-- Overlay mobile -->
    <transition name="fade">
      <div
        v-if="isMobile && sidebarOpen"
        class="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
        @click="sidebarOpen = false"
      ></div>
    </transition>

    <!-- ========== CONTENU PRINCIPAL ========== -->
    <div
      class="flex-1 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
      :class="!isMobile && sidebarOpen ? 'ml-64' : !isMobile && !sidebarOpen ? 'ml-16' : 'ml-0'"
    >
      <!-- ====== NAVBAR ====== -->
      <header class="bg-white/60 backdrop-blur-xl border-b border-white/20 sticky top-0 z-30 shadow-sm">
        <div class="flex items-center justify-between px-4 md:px-6 py-3">
          <!-- Gauche -->
          <div class="flex items-center gap-3">
            <button
              @click="toggleSidebar"
              class="p-2 rounded-xl hover:bg-awac-primary/10 transition-colors text-gray-600 hover:text-awac-primary duration-200"
              :class="sidebarOpen ? 'bg-awac-primary/10 text-awac-primary' : ''"
            >
              <span class="material-icons transition-transform duration-200">{{ sidebarOpen ? 'menu_open' : 'menu' }}</span>
            </button>
            <span class="text-lg font-heading font-bold text-gray-900 hidden sm:block">
              {{ pageTitle }}
            </span>
          </div>

          <!-- Droite -->
          <div class="flex items-center gap-3 md:gap-4">
            <button class="p-2 rounded-xl hover:bg-awac-primary/10 transition-colors relative text-gray-500 hover:text-awac-primary duration-200">
              <span class="material-icons">notifications_none</span>
              <span class="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
            </button>

            <!-- Profil dropdown -->
            <div class="relative" @click.stop>
              <button
                @click="dropdownOpen = !dropdownOpen"
                class="flex items-center gap-2 p-1.5 pr-3 rounded-2xl hover:bg-awac-primary/5 transition-all duration-200 border border-transparent hover:border-awac-primary/20"
                :class="dropdownOpen ? 'bg-awac-primary/5 border-awac-primary/20' : ''"
              >
                <div class="w-9 h-9 rounded-full bg-gradient-to-br from-awac-primary to-awac-secondary flex items-center justify-center text-white font-heading font-bold text-sm shadow-sm flex-shrink-0">
                  {{ userInitial }}
                </div>
                <span class="hidden md:block text-sm font-medium text-gray-700">{{ userFullName }}</span>
                <span class="material-icons text-gray-400 text-sm hidden md:block transition-transform duration-200" :class="dropdownOpen ? 'rotate-180' : ''">
                  expand_more
                </span>
              </button>

              <!-- Dropdown -->
              <transition name="dropdown">
                <div
                  v-if="dropdownOpen"
                  class="absolute right-0 mt-2 w-56 bg-white/90 backdrop-blur-xl rounded-2xl border border-white/30 shadow-xl overflow-hidden"
                >
                  <div class="px-4 py-3 border-b border-gray-100/50">
                    <p class="text-sm font-semibold text-gray-900">{{ userFullName }}</p>
                    <p class="text-xs text-gray-500">{{ userEmail }}</p>
                    <span class="inline-block mt-1.5 px-2 py-0.5 text-[10px] font-medium rounded-full" :class="roleBadge">
                      {{ roleLabel }}
                    </span>
                  </div>
                  <div class="p-2 space-y-1">
                    <button
                      @click="goToProfile"
                      class="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-awac-primary/5 hover:text-awac-primary transition-colors"
                    >
                      <span class="material-icons text-sm">person</span>
                      Profil
                    </button>
                    <button
                      @click="deconnexion"
                      class="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-500 transition-colors"
                    >
                      <span class="material-icons text-sm">logout</span>
                      Déconnexion
                    </button>
                  </div>
                </div>
              </transition>
            </div>
          </div>
        </div>
      </header>

      <!-- ====== CONTENU ====== -->
      <main class="p-4 md:p-8">
        <div class="max-w-7xl mx-auto">
          <router-view />
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/userStore'
import { storeToRefs } from 'pinia'
import { usePermissions } from '@/composables/usePermissions'

const route = useRoute()
const router = useRouter()

// ========== USER STORE ==========
const userStore = useUserStore()
const { userFullName, userEmail, userInitial } = storeToRefs(userStore)

// ========== PERMISSIONS ==========
const { filteredMenuItems, roleLabel, roleBadge, isAdmin, isSuperAdmin } = usePermissions()

// ========== ÉTAT ==========
const sidebarOpen = ref(true)
const dropdownOpen = ref(false)
const isMobile = ref(window.innerWidth < 768)

// ========== COMPUTED ==========
const pageTitle = computed(() => {
  const current = filteredMenuItems.value.find(item => item.path === route.path)
  return current ? current.label : 'Dashboard'
})

// ========== MÉTHODES ==========
const toggleSidebar = () => {
  sidebarOpen.value = !sidebarOpen.value
}

const closeSidebarOnMobile = () => {
  if (isMobile.value) sidebarOpen.value = false
}

const handleClickOutside = (event) => {
  const target = event.target.closest('.relative')
  if (!target) dropdownOpen.value = false
}

const handleResize = () => {
  const mobile = window.innerWidth < 768
  if (mobile !== isMobile.value) {
    isMobile.value = mobile
    if (mobile) sidebarOpen.value = false
    else sidebarOpen.value = true
  }
}

const goToProfile = () => {
  dropdownOpen.value = false
  router.push('/admin/profile')
}

const deconnexion = async () => {
  dropdownOpen.value = false
  await userStore.logout()
  router.push('/')
}

// ========== LIFECYCLE ==========
onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  window.addEventListener('resize', handleResize)
  if (isMobile.value) sidebarOpen.value = false
  else sidebarOpen.value = true
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.dropdown-enter-from {
  opacity: 0;
  transform: scale(0.95) translateY(-8px);
}
.dropdown-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(-8px);
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

aside {
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1),
              transform 0.3s cubic-bezier(0.4, 0, 0.2, 1),
              box-shadow 0.3s ease;
}
aside:hover {
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.06);
}

.router-link-active .material-icons {
  color: #ef7952;
}

@media (max-width: 768px) {
  aside {
    width: 280px !important;
    max-width: 80vw;
  }
}
</style>