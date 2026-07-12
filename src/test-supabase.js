import { supabase } from './services/supabase.js'

const testConnection = async () => {
  const { data, error } = await supabase.from('competitions').select('*')
  if (error) console.error('❌ Erreur :', error.message)
  else console.log('✅ Connexion OK, compétitions :', data)
}

testConnection()
