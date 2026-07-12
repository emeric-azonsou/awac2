import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import { supabase } from '@/services/supabase'
import { useUserStore } from '@/stores/userStore'
import { isAdminRole } from '@/config/roles'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/admin/login',
      name: 'login',
      component: () => import('@/views/Login.vue'),
      meta: { requiresGuest: true },
    },
    // === ADMIN (avec layout sidebar) ===
    {
      path: '/admin',
      component: () => import('@/views/AdminLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        { path: '', component: () => import('@/views/admin/dashboard/index.vue') },
        { path: 'competitions', component: () => import('@/views/admin/competitions/index.vue') },
        { path: 'candidates', component: () => import('@/views/admin/candidates/index.vue') },
        { path: 'users', component: () => import('@/views/admin/users/index.vue') },
        { path: 'jury', component: () => import('@/views/admin/users/index.vue') },
        { path: 'scoring', component: () => import('@/views/admin/scoring/index.vue') },
        { path: 'steps', component: () => import('@/views/admin/steps/index.vue') },
        { path: 'certificates', component: () => import('@/views/admin/certificates/index.vue') },
        {
          path: 'settings',
          component: () => import('@/views/admin/settings/index.vue'),
          meta: { requiresAdmin: true },
        },
      ],
    },
    // === JURY (hors admin, sans sidebar) ===
  // === JURY (hors admin, sans sidebar) ===
{
  path: '/jury/president',
  component: () => import('@/layouts/JuryLayout.vue'),
  meta: { requiresAuth: true },
  children: [
    {
      path: '',
      component: () => import('@/views/jury/president.vue'),
    },
  ],
},
{
  path: '/jury/evaluate',
  component: () => import('@/layouts/JuryLayout.vue'),
  meta: { requiresAuth: true },
  children: [
    {
      path: '',
      component: () => import('@/views/jury/evaluate.vue'),
    },
  ],
},
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

// ============================================================
// GUARD DE NAVIGATION
// ============================================================
router.beforeEach(async (to, from, next) => {
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)
  const requiresGuest = to.matched.some(record => record.meta.requiresGuest)
  const requiresAdmin = to.matched.some(record => record.meta.requiresAdmin)

  try {
    const { data: { session } } = await supabase.auth.getSession()
    const isAuthenticated = !!session

    if (requiresAuth && !isAuthenticated) {
      next('/admin/login')
      return
    }

    if (requiresGuest && isAuthenticated) {
      next('/admin')
      return
    }

    // Récupérer rôle et statut de président
    let role = null
    let isPresident = false

    if (isAuthenticated) {
      const userStore = useUserStore()
      await userStore.fetchUser()
      role = userStore.userRole

      if (role === 'jury_member') {
        const { data, error } = await supabase
          .from('step_juries')
          .select('id')
          .eq('profile_id', userStore.user?.id)
          .eq('is_president', true)
          .limit(1)

        if (!error && data && data.length > 0) {
          isPresident = true
        }
      }
    }

    // === Redirections selon le rôle ===

    // 1. Si admin essaie d'accéder à une route jury (sans layout admin) → rediriger vers /admin/jury/president
    if (isAuthenticated && isAdminRole(role) && to.path.startsWith('/jury')) {
      // Dans le guard, juste avant next()
console.log('➡️ Route atteinte :', to.path, 'Rôle :', role, 'Président :', isPresident)
      next('/admin/jury/president')
      return
    }

    // 2. Si juré non-président essaie d'accéder à /admin → rediriger vers /jury/evaluate
    if (isAuthenticated && role === 'jury_member' && !isPresident && to.path.startsWith('/admin')) {
      next('/jury/evaluate')
      return
    }

    // 3. Si juré président essaie d'accéder à /admin (sauf s'il va sur /admin/jury/president) → le laisser passer
    // → on ne bloque pas les présidents sur /admin, ils peuvent y accéder normalement

    // 4. Si route admin nécessite admin_role
    if (requiresAdmin && isAuthenticated) {
      if (!isAdminRole(role)) {
        console.warn('⛔ Accès refusé : rôle insuffisant', role)
        next('/admin')
        return
      }
    }

    next()
  } catch (err) {
    console.error('Erreur dans le guard:', err)
    if (requiresAuth) {
      next('/admin/login')
    } else {
      next()
    }
  }
})


export default router