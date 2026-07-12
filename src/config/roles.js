// src/config/roles.js

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMINISTRATOR: 'administrator',
  MODERATOR: 'moderator',
  JURY_MEMBER: 'jury_member',
}

export const ROLE_LABELS = {
  [ROLES.SUPER_ADMIN]: 'Super Admin',
  [ROLES.ADMINISTRATOR]: 'Administrateur',
  [ROLES.MODERATOR]: 'Modérateur',
  [ROLES.JURY_MEMBER]: 'Membre du Jury',
  'admin': 'Administrateur', // ✅ Alias pour le rôle "admin" stocké en base
}

export const ROLE_BADGES = {
  [ROLES.SUPER_ADMIN]: 'bg-purple-100 text-purple-700',
  [ROLES.ADMINISTRATOR]: 'bg-red-100 text-red-700',
  [ROLES.MODERATOR]: 'bg-blue-100 text-blue-700',
  [ROLES.JURY_MEMBER]: 'bg-gray-100 text-gray-700',
  'admin': 'bg-red-100 text-red-700', // ✅ Alias pour le rôle "admin"
}

export const PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: {
    canViewUsers: true,
    canCreateUsers: true,
    canEditUsers: true,
    canDeleteUsers: true,
    canAssignRoles: true,
    canViewJury: true,
    canManageJury: true,
    canViewScoring: true,
    canManageScoring: true,
    canViewSteps: true,
    canManageSteps: true,
    canViewCertificates: true,
    canManageCertificates: true,
    canViewSettings: true,
    canManageSettings: true,
    canViewCompetitions: true,
    canManageCompetitions: true,
    canViewCandidates: true,
    canManageCandidates: true,
    canViewDashboard: true,
  },
  [ROLES.ADMINISTRATOR]: {
    canViewUsers: true,
    canCreateUsers: true,
    canEditUsers: true,
    canDeleteUsers: true,
    canAssignRoles: true,
    canViewJury: true,
    canManageJury: true,
    canViewScoring: true,
    canManageScoring: true,
    canViewSteps: true,
    canManageSteps: true,
    canViewCertificates: true,
    canManageCertificates: true,
    canViewSettings: false,
    canManageSettings: false,
    canViewCompetitions: true,
    canManageCompetitions: true,
    canViewCandidates: true,
    canManageCandidates: true,
    canViewDashboard: true,
  },
  // ✅ Ajout d'un alias "admin" qui pointe vers les mêmes permissions que "administrator"
  'admin': {
    canViewUsers: true,
    canCreateUsers: true,
    canEditUsers: true,
    canDeleteUsers: true,
    canAssignRoles: true,
    canViewJury: true,
    canManageJury: true,
    canViewScoring: true,
    canManageScoring: true,
    canViewSteps: true,
    canManageSteps: true,
    canViewCertificates: true,
    canManageCertificates: true,
    canViewSettings: false,
    canManageSettings: false,
    canViewCompetitions: true,
    canManageCompetitions: true,
    canViewCandidates: true,
    canManageCandidates: true,
    canViewDashboard: true,
  },
  [ROLES.MODERATOR]: {
    canViewUsers: true,
    canCreateUsers: true,
    canEditUsers: true,
    canDeleteUsers: true,
    canAssignRoles: false,
    canViewJury: true,
    canManageJury: true,
    canViewScoring: true,
    canManageScoring: true,
    canViewSteps: true,
    canManageSteps: true,
    canViewCertificates: true,
    canManageCertificates: true,
    canViewSettings: false,
    canManageSettings: false,
    canViewCompetitions: false,
    canManageCompetitions: false,
    canViewCandidates: true,
    canManageCandidates: true,
    canViewDashboard: true,
  },
  [ROLES.JURY_MEMBER]: {
    canViewUsers: false,
    canCreateUsers: false,
    canEditUsers: false,
    canDeleteUsers: false,
    canAssignRoles: false,
    canViewJury: false,
    canManageJury: false,
    canViewScoring: true,
    canManageScoring: false,
    canViewSteps: false,
    canManageSteps: false,
    canViewCertificates: false,
    canManageCertificates: false,
    canViewSettings: false,
    canManageSettings: false,
    canViewCompetitions: false,
    canManageCompetitions: false,
    canViewCandidates: false,
    canManageCandidates: false,
    canViewDashboard: true,
  },
}

export const MENU_ITEMS = [
  { path: '/admin', label: 'Dashboard', icon: 'dashboard', permission: 'canViewDashboard' },
  { path: '/admin/competitions', label: 'Compétitions', icon: 'event', permission: 'canViewCompetitions' },
  { path: '/admin/candidates', label: 'Candidats', icon: 'people', permission: 'canViewCandidates' },
  { path: '/admin/users', label: 'Utilisateurs', icon: 'people', permission: 'canViewUsers' },
  { path: '/admin/scoring', label: 'Notes', icon: 'grade', permission: 'canViewScoring' },
  { path: '/admin/steps', label: 'Étapes', icon: 'edit', permission: 'canViewSteps' },
  { path: '/admin/certificates', label: 'Attestations', icon: 'assignment', permission: 'canViewCertificates' },
  { path: '/admin/settings', label: 'Paramètres', icon: 'settings', permission: 'canViewSettings' },
]

// ============================================================
// FONCTIONS UTILITAIRES (avec fallback pour "admin")
// ============================================================

function normalizeRole(role) {
  // Si le rôle est "admin", on le transforme en "administrator"
  if (role === 'admin') return ROLES.ADMINISTRATOR
  return role
}

export function getPermissions(role) {
  const normalized = normalizeRole(role)
  return PERMISSIONS[normalized] || PERMISSIONS[ROLES.JURY_MEMBER]
}

export function hasPermission(role, permission) {
  const normalized = normalizeRole(role)
  const perms = getPermissions(normalized)
  return perms && perms[permission] === true
}

export function getRoleLabel(role) {
  return ROLE_LABELS[role] || role
}

export function getRoleBadge(role) {
  return ROLE_BADGES[role] || 'bg-gray-100 text-gray-700'
}

export function isAdminRole(role) {
  const normalized = normalizeRole(role)
  return normalized === ROLES.SUPER_ADMIN || normalized === ROLES.ADMINISTRATOR
}

export function isSuperAdminRole(role) {
  const normalized = normalizeRole(role)
  return normalized === ROLES.SUPER_ADMIN
}

export function filterMenuItems(role) {
  const normalized = normalizeRole(role)
  return MENU_ITEMS.filter(item => {
    if (!item.permission) return true
    return hasPermission(normalized, item.permission)
  })
}