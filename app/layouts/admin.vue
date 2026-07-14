<template>
  <div class="min-h-screen bg-[#F9F8F6] flex selection:bg-awac-primary/10">
    <aside class="hidden md:flex w-60 shrink-0 flex-col bg-awac-dark text-white">
      <NuxtLink to="/" class="flex items-center gap-3 px-6 h-20 border-b border-white/10">
        <img src="@/assets/img/awac.png" alt="AWAC" class="h-10 w-auto brightness-0 invert" />
        <span class="font-heading font-black text-xs tracking-widest uppercase text-white/80">
          Admin
        </span>
      </NuxtLink>

      <nav class="flex-1 py-6 space-y-1 px-3" aria-label="Navigation admin">
        <NuxtLink
          v-for="item in menuItems"
          :key="item.to"
          :to="item.to"
          class="nav-item flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-white/60 hover:text-white hover:bg-white/5 transition-colors"
          active-class="nav-active"
        >
          <span class="material-icons text-xl" aria-hidden="true">{{ item.icon }}</span>
          {{ item.label }}
        </NuxtLink>
      </nav>

      <div class="px-6 py-5 border-t border-white/10 space-y-3">
        <p class="text-xs text-white/50 truncate">{{ adminProfile?.email }}</p>
        <button
          class="flex items-center gap-2 text-xs font-semibold text-white/60 hover:text-white transition-colors"
          @click="logout"
        >
          <span class="material-icons text-base" aria-hidden="true">logout</span>
          Se déconnecter
        </button>
      </div>
    </aside>

    <div class="flex-1 min-w-0 flex flex-col">
      <header
        class="md:hidden sticky top-0 z-40 bg-awac-dark text-white h-16 flex items-center justify-between px-4"
      >
        <NuxtLink to="/admin" class="font-heading font-black text-sm tracking-widest uppercase">
          AWAC Admin
        </NuxtLink>
        <div class="flex items-center gap-1">
          <NuxtLink
            v-for="item in menuItems"
            :key="item.to"
            :to="item.to"
            class="grid place-items-center w-11 h-11 rounded-lg text-white/60 hover:text-white"
            active-class="text-awac-primary"
            :aria-label="item.label"
          >
            <span class="material-icons text-xl" aria-hidden="true">{{ item.icon }}</span>
          </NuxtLink>
          <button
            class="grid place-items-center w-11 h-11 rounded-lg text-white/60 hover:text-white"
            aria-label="Se déconnecter"
            @click="logout"
          >
            <span class="material-icons text-xl" aria-hidden="true">logout</span>
          </button>
        </div>
      </header>

      <main class="flex-1 p-6 md:p-10">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AdminProfileState } from '~/middleware/admin'

const adminProfile = useState<AdminProfileState | null>('admin-profile', () => null)
const router = useRouter()

const menuItems = [
  { to: '/admin', label: 'Dashboard', icon: 'dashboard' },
  { to: '/admin/candidats', label: 'Candidats', icon: 'groups' },
  { to: '/admin/votes', label: 'Votes', icon: 'how_to_vote' },
]

const logout = async () => {
  try {
    await $fetch('/api/admin/logout', { method: 'POST' })
  } finally {
    adminProfile.value = null
    router.push('/admin/login')
  }
}
</script>

<style scoped>
.nav-active {
  color: #fff;
  background: linear-gradient(135deg, rgba(239, 121, 82, 0.25), rgba(223, 65, 58, 0.2));
}
</style>
