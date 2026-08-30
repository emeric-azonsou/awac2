import { useEffect, useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { api } from '../../../../utils/api'
import { getCandidateSavedMessage } from '../../../../utils/adminMessages'
import { getCategoryPersonLabel } from '../../../../utils/candidateCategories'

export const Route = createFileRoute('/admin/_shell/candidats/')({
  component: AdminCandidats,
})

interface AdminCandidate {
  id: string
  full_name: string
  atelier: string | null
  commune: string | null
  profile_photo_url: string | null
  category: string
  vote_count: number
  photos_count: number
}

const SAVED_MESSAGE_VISIBLE_MS = 4000

function AdminCandidats() {
  const navigate = useNavigate()
  const [candidates, setCandidates] = useState<AdminCandidate[] | null>(null)
  const [pending, setPending] = useState(true)
  const [savedMessage, setSavedMessage] = useState('')

  useEffect(() => {
    const load = async () => {
      setPending(true)
      try {
        setCandidates(await api.get<AdminCandidate[]>('/admin/candidates'))
      } catch {
        setCandidates(null)
      } finally {
        setPending(false)
      }
    }
    void load()
  }, [])

  // Bandeau de confirmation après création/édition/suppression : le paramètre
  // `saved` est retiré de l'URL pour qu'un rechargement ne le réaffiche pas.
  useEffect(() => {
    const query = Object.fromEntries(new URLSearchParams(window.location.search))
    const message = getCandidateSavedMessage(query.saved)
    if (!message) return
    setSavedMessage(message)
    const { saved: _saved, ...rest } = query
    void navigate({ to: '/admin/candidats', search: rest, replace: true })
    const timer = setTimeout(() => setSavedMessage(''), SAVED_MESSAGE_VISIBLE_MS)
    return () => clearTimeout(timer)
  }, [navigate])

  return (
    <div className="max-w-5xl space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-gray-900 font-heading font-black text-3xl tracking-tight uppercase">
            Candidats
          </h1>
          <p className="text-gray-500 font-sans text-sm">
            {candidates?.length ?? 0} candidat(s) en compétition.
          </p>
        </div>
        <Link to="/admin/candidats/nouveau" className="btn-awac-dark text-[11px] py-3 px-5">
          <span className="material-icons text-base">add</span>
          Ajouter
        </Link>
      </div>

      {savedMessage ? (
        <p
          className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-800 text-sm font-medium rounded-xl px-4 py-3"
          role="status"
        >
          <span className="material-icons text-base text-green-600" aria-hidden="true">
            check_circle
          </span>
          {savedMessage}
        </p>
      ) : null}

      {pending ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-awac-primary border-t-transparent" />
        </div>
      ) : !candidates || candidates.length === 0 ? (
        <div className="text-center py-20 space-y-3">
          <span className="material-icons text-5xl text-gray-200">group_add</span>
          <p className="text-gray-500 text-sm">Aucun candidat. Commencez par en ajouter un.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          {candidates.map((candidate) => (
            <Link
              key={candidate.id}
              to="/admin/candidats/$id"
              params={{ id: candidate.id }}
              className="w-full flex items-center gap-4 px-5 py-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors text-left"
            >
              <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                {candidate.profile_photo_url ? (
                  <img
                    src={candidate.profile_photo_url}
                    alt={candidate.full_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full grid place-items-center text-gray-300">
                    <span className="material-icons">person</span>
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-heading font-black text-sm text-gray-900 truncate">
                  {candidate.full_name}
                  <span
                    className={`ml-2 align-middle text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                      candidate.category === 'femme'
                        ? 'border-awac-accent/40 text-awac-accent'
                        : 'border-gray-300 text-gray-600'
                    }`}
                  >
                    {getCategoryPersonLabel(candidate.category)}
                  </span>
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {candidate.atelier ? <span>{candidate.atelier}</span> : null}
                  {candidate.atelier && candidate.commune ? <span> · </span> : null}
                  {candidate.commune ? <span>{candidate.commune}</span> : null}
                  {!candidate.atelier && !candidate.commune ? (
                    <span className="text-gray-400 italic">Aucune info</span>
                  ) : null}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-heading font-black text-sm text-gray-900 tabular-nums">
                  {candidate.vote_count}
                </p>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">voix</p>
              </div>
              <div className="flex items-center gap-1 text-gray-400 shrink-0">
                <span className="material-icons text-base">photo_library</span>
                <span className="text-xs tabular-nums">{candidate.photos_count}</span>
              </div>
              <span className="material-icons text-gray-300">chevron_right</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
