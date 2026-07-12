// src/composables/usePermissions.js
import { computed } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { 
  hasPermission, 
  isAdminRole, 
  isSuperAdminRole, 
  filterMenuItems, 
  getPermissions,
  getRoleLabel,
  getRoleBadge,
  MENU_ITEMS
} from '@/config/roles'
import { storeToRefs } from 'pinia'

export function usePermissions() {
  const userStore = useUserStore()
  const { userRole } = storeToRefs(userStore)

  // 🔍 DEBUG : Afficher le rôle dans la console
  console.log('🔍 [usePermissions] Rôle utilisateur :', userRole.value)

  const userPermissions = computed(() => {
    return getPermissions(userRole.value)
  })

  const can = (permission) => {
    return hasPermission(userRole.value, permission)
  }

  const isAdmin = computed(() => {
    return isAdminRole(userRole.value)
  })

  const isSuperAdmin = computed(() => {
    return isSuperAdminRole(userRole.value)
  })

  // 🔥 FORCER l’affichage de tous les menus si admin
  const filteredMenuItems = computed(() => {
    // Si l’utilisateur est admin ou super admin, on affiche TOUS les items
    if (isAdmin.value || isSuperAdmin.value) {
      return MENU_ITEMS
    }
    // Sinon, on applique le filtre normal
    return filterMenuItems(userRole.value)
  })

  const roleLabel = computed(() => {
    return getRoleLabel(userRole.value)
  })

  const roleBadge = computed(() => {
    return getRoleBadge(userRole.value)
  })

  return {
    userRole,
    userPermissions,
    can,
    isAdmin,
    isSuperAdmin,
    filteredMenuItems,
    roleLabel,
    roleBadge,
  }
}