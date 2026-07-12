// src/services/juryService.js
import { supabaseAdmin, supabase } from './supabase'
// dans getActiveSession, remplacer l'alias
// dans getActiveSession, remplacer l'alias
export const getActiveSession = async (stepId) => {
  const { data, error } = await supabaseAdmin
    .from('evaluation_sessions')
    .select('*, current_candidate:current_candidate_id(*), step:step_id(*)')
    .eq('step_id', stepId)
    .eq('status', 'in_progress')
    .maybeSingle()

  if (error) throw error
  return data
}
export const startEvaluationSession = async (stepId, candidateId) => {
  const { data: existing } = await supabaseAdmin
    .from('evaluation_sessions')
    .select('id')
    .eq('step_id', stepId)
    .eq('status', 'in_progress')
    .maybeSingle()

  if (existing) {
    throw new Error('Une session est déjà en cours pour cette étape.')
  }

  const { data, error } = await supabaseAdmin
    .from('evaluation_sessions')
    .insert({
      step_id: stepId,
      current_candidate_id: candidateId,
      status: 'in_progress',
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export const getJurorsForStep = async (stepId) => {
  const { data, error } = await supabaseAdmin
    .from('step_juries')
    .select('profile_id, profiles(*)')
    .eq('step_id', stepId)

  if (error) throw error
  return data.map(j => j.profiles)
}

export const hasJurySubmitted = async (sessionId, juryId) => {
  const { data, error } = await supabaseAdmin
    .from('jury_submissions')
    .select('id')
    .eq('session_id', sessionId)
    .eq('jury_id', juryId)
    .maybeSingle()

  if (error) throw error
  return !!data
}

export const submitEvaluation = async (sessionId, juryId, formData, candidateId) => {
  // Récupérer le formulaire de l'étape
  const { data: session, error: sessionError } = await supabaseAdmin
    .from('evaluation_sessions')
    .select('step_id')
    .eq('id', sessionId)
    .single()

  if (sessionError) throw sessionError

  const { data: form, error: formError } = await supabaseAdmin
    .from('forms')
    .select('id')
    .eq('step_id', session.step_id)
    .single()

  if (formError) throw formError

  // Créer la réponse du formulaire
  const { data: response, error: respError } = await supabaseAdmin
    .from('form_responses')
    .insert({
      form_id: form.id,
      candidate_assignment_id: null,
      submitted_by: juryId,
      is_completed: true,
    })
    .select()
    .single()

  if (respError) throw respError

  // Insérer les valeurs des champs
  for (const field of formData) {
    await supabaseAdmin
      .from('form_response_values')
      .insert({
        form_response_id: response.id,
        form_field_id: field.field_id,
        value: field.value || null,
        numeric_value: field.numeric_value || null,
        text_value: field.text_value || null,
        field_option_id: field.option_id || null,
      })
  }

  // Enregistrer la soumission du jury
  const { error: subError } = await supabaseAdmin
    .from('jury_submissions')
    .insert({
      session_id: sessionId,
      jury_id: juryId,
      form_response_id: response.id,
    })

  if (subError) throw subError

  // Calcul du score
  let total = 0
  for (const field of formData) {
    if (field.numeric_value) total += field.numeric_value
    if (field.option_value) total += field.option_value
  }

  await supabaseAdmin
    .from('candidate_scores')
    .insert({
      candidate_id: candidateId,
      step_id: session.step_id,
      criterion_id: null,
      score: total,
      jury_group_id: null,
      submitted_by: juryId,
      jury_id: juryId,
      submitted_at: new Date().toISOString(),
      validated: false,
    })

  return { success: true, response }
}

export const nextCandidate = async (sessionId, nextCandidateId) => {
  const { error } = await supabaseAdmin
    .from('evaluation_sessions')
    .update({ current_candidate_id: nextCandidateId })
    .eq('id', sessionId)

  if (error) throw error

  await supabaseAdmin
    .from('jury_submissions')
    .delete()
    .eq('session_id', sessionId)

  return { success: true }
}

export const closeStep = async (stepId) => {
  const { error: stepError } = await supabaseAdmin
    .from('steps')
    .update({ status: 'closed' })
    .eq('id', stepId)

  if (stepError) throw stepError

  const { error: sessionError } = await supabaseAdmin
    .from('evaluation_sessions')
    .update({ status: 'completed' })
    .eq('step_id', stepId)
    .eq('status', 'in_progress')

  if (sessionError) throw sessionError

  return { success: true }
}

export const getCandidatesForStep = async (stepId) => {
  const { data, error } = await supabaseAdmin
    .from('candidate_assignments')
    .select('candidate_id, candidates(*)')
    .eq('step_id', stepId)

  if (error) throw error
  return data.map(a => a.candidates)
}

export const getSubmissionsForSession = async (sessionId) => {
  const { data, error } = await supabaseAdmin
    .from('jury_submissions')
    .select('jury_id, profiles(full_name, username), submitted_at')
    .eq('session_id', sessionId)

  if (error) throw error
  return data
}

// src/services/juryService.js

/**
 * Récupérer tous les candidats d'une compétition
 */
export const getCandidatesForCompetition = async (competitionId) => {
  const { data, error } = await supabaseAdmin
    .from('candidates')
    .select('*')
    .eq('competition_id', competitionId)
    .eq('status', 'approved') // ou 'active' selon ton système

  if (error) throw error
  return data || []
}

/**
 * Récupérer l'étape avec sa compétition associée
 */
export const getStepWithCompetition = async (stepId) => {
  const { data, error } = await supabaseAdmin
    .from('steps')
    .select('*, competition_id')
    .eq('id', stepId)
    .single()

  if (error) throw error
  return data
}