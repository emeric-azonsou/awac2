// src/services/supabase.js
import { createClient } from '@supabase/supabase-js'

// ============================================================
// CONFIGURATION
// ============================================================
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY doivent être définies (.env)')
}

// ============================================================
// CLIENTS
// ============================================================
// Client normal (utilise les RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Client admin (bypass RLS - à utiliser avec précaution)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)

// ============================================================
// HELPERS AUTH
// ============================================================
export const auth = {
  // Récupérer l'utilisateur connecté
  async getUser() {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) throw error
    return user
  },

  // Récupérer la session
  async getSession() {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error) throw error
    return session
  },

  // Récupérer le profil complet (auth + profile)
  async getCurrentUser() {
    const user = await this.getUser()
    if (!user) return null
    
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    
    if (error) {
      console.warn('Profil non trouvé:', error.message)
      return { ...user, profile: null }
    }
    
    return { ...user, profile }
  },

  // Vérifier si l'utilisateur est connecté
  async isAuthenticated() {
    const session = await this.getSession()
    return !!session
  },

  // Vérifier le rôle
  async getRole() {
    const user = await this.getCurrentUser()
    return user?.profile?.role || null
  },

  // Vérifier si l'utilisateur est super_admin
  async isSuperAdmin() {
    const role = await this.getRole()
    return role === 'super_admin'
  },

  // Déconnexion
  async logout() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },

  // Connexion
  async login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }
}

// ============================================================
// HELPERS QUERIES
// ============================================================
export const db = {
  // Récupérer le client approprié (admin si demandé)
  getClient(useAdmin = false) {
    return useAdmin ? supabaseAdmin : supabase
  },

  // Compter les lignes d'une table
  async count(table, options = {}, useAdmin = false) {
    const client = this.getClient(useAdmin)
    const { count, error } = await client
      .from(table)
      .select('*', { count: 'exact', head: true })
      .match(options)
    
    if (error) throw error
    return count || 0
  },

  // Récupérer les lignes d'une table
  async get(table, options = {}, useAdmin = false) {
    const client = this.getClient(useAdmin)
    let query = client.from(table).select('*')
    
    if (options.match) query = query.match(options.match)
    if (options.order) query = query.order(options.order.by, { ascending: options.order.ascending ?? false })
    if (options.limit) query = query.limit(options.limit)
    
    const { data, error } = await query
    if (error) throw error
    return data
  },

  // Insérer une ligne
  async insert(table, data, useAdmin = false) {
    const client = this.getClient(useAdmin)
    const { data: result, error } = await client.from(table).insert(data).select()
    if (error) throw error
    return result
  },

  // Mettre à jour une ligne
  async update(table, id, data, useAdmin = false) {
    const client = this.getClient(useAdmin)
    const { data: result, error } = await client
      .from(table)
      .update(data)
      .eq('id', id)
      .select()
    if (error) throw error
    return result
  },

  // Supprimer une ligne
  async delete(table, id, useAdmin = false) {
    const client = this.getClient(useAdmin)
    const { error } = await client.from(table).delete().eq('id', id)
    if (error) throw error
    return true
  }
}

// ============================================================
// HELPERS UTILITAIRES
// ============================================================
export const utils = {
  // Formater une date
  formatDate(date) {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  },

  // Générer un code unique
  generateCode(prefix = 'AWAC') {
    const year = new Date().getFullYear()
    const random = Math.random().toString(36).substring(2, 8).toUpperCase()
    return `${prefix}-${year}-${random}`
  },

  // Gérer les erreurs Supabase
  handleError(error) {
    console.error('Supabase error:', error)
    return {
      message: error.message || 'Une erreur est survenue',
      code: error.code || 'unknown',
      details: error.details || null
    }
  }
}