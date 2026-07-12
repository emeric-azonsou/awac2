// src/services/authService.js
import { supabase } from './supabase'

/**
 * Récupérer l'utilisateur connecté (auth.users)
 */
export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return user
}

/**
 * Récupérer le profil de l'utilisateur (table profiles)
 * Utilise maybeSingle() pour éviter l'erreur 406
 */
export const getUserProfile = async (userId) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()  // ← Au lieu de .single()

  if (error) {
    console.error('Erreur profil:', error)
    return null
  }
  return data
}

/**
 * Récupérer l'utilisateur complet (auth + profil)
 */
export const getCurrentUserWithProfile = async () => {
  const user = await getCurrentUser()
  if (!user) return null

  const profile = await getUserProfile(user.id)

  return {
    ...user,
    profile
  }
}

// src/services/authService.js (extrait)
export const login = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}