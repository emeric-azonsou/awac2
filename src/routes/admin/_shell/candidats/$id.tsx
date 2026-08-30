import { useEffect, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { api } from '../../../../utils/api'
import { CandidateForm, type AdminCandidate } from '../../../../components/admin/CandidateForm'

export const Route = createFileRoute('/admin/_shell/candidats/$id')({
  component: EditCandidate,
})

function EditCandidate() {
  const { id } = Route.useParams()
  const [candidate, setCandidate] = useState<AdminCandidate | null>(null)
  const [pending, setPending] = useState(true)

  useEffect(() => {
    const load = async () => {
      setPending(true)
      try {
        setCandidate(await api.get<AdminCandidate>(`/candidates/${id}`))
      } catch {
        setCandidate(null)
      } finally {
        setPending(false)
      }
    }
    void load()
  }, [id])

  if (pending) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-awac-primary border-t-transparent" />
      </div>
    )
  }

  if (!candidate) {
    return (
      <div className="max-w-3xl space-y-6 py-12 text-center">
        <span className="material-icons text-5xl text-gray-200">person_off</span>
        <p className="text-gray-500 text-sm">Candidat introuvable.</p>
        <Link
          to="/admin/candidats"
          className="text-awac-primary font-semibold text-sm hover:underline"
        >
          Retour à la liste
        </Link>
      </div>
    )
  }

  // La clé force un remontage quand on passe d'un candidat à l'autre : sans
  // elle, l'état interne du formulaire (déjà initialisé) resterait celui du
  // candidat précédent.
  return <CandidateForm key={candidate.id} candidate={candidate} />
}
