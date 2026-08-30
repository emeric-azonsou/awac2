import { useCallback, useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { api } from '../../../utils/api'
import './index.css'

interface AdminStats {
  revenue_fcfa: number
  voices_confirmed: number
  candidates_count: number
  votes_by_status: Record<'confirmed' | 'pending' | 'rejected', { count: number; amount: number }>
  top_candidates: { id: string; full_name: string; vote_count: number }[]
}

export const Route = createFileRoute('/admin/_shell/')({
  component: AdminDashboard,
})

const formatNumber = (value: number) => new Intl.NumberFormat('fr-FR').format(value ?? 0)

function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [pending, setPending] = useState(true)
  const [error, setError] = useState(false)

  const refresh = useCallback(async () => {
    setPending(true)
    setError(false)
    try {
      setStats(await api.get<AdminStats>('/admin/stats'))
    } catch {
      setError(true)
    } finally {
      setPending(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return (
    <div className="max-w-5xl space-y-10">
      <div className="space-y-1">
        <h1 className="text-gray-900 font-heading font-black text-3xl tracking-tight uppercase">
          Dashboard
        </h1>
        <p className="text-gray-500 font-sans text-sm">
          Vue d&apos;ensemble du concours — votes et revenus en temps réel.
        </p>
      </div>

      {pending ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-awac-primary border-t-transparent" />
        </div>
      ) : error ? (
        <div className="text-center py-20 space-y-4">
          <p className="text-gray-500 text-sm">Impossible de charger les statistiques.</p>
          <button
            className="text-awac-primary font-semibold text-sm hover:underline"
            onClick={() => void refresh()}
          >
            Réessayer
          </button>
        </div>
      ) : stats ? (
        <>
          <section
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
            aria-label="Chiffres clés"
          >
            <div className="stat-card stat-revenue">
              <p className="stat-label text-white/85">Montant généré</p>
              <p className="stat-value font-heading text-white">
                {formatNumber(stats.revenue_fcfa)} <span className="text-base font-bold">FCFA</span>
              </p>
              <p className="text-white/85 text-xs">votes confirmés uniquement</p>
            </div>
            <div className="stat-card">
              <p className="stat-label">Voix confirmées</p>
              <p className="stat-value font-heading text-gray-900">
                {formatNumber(stats.voices_confirmed)}
              </p>
              <p className="text-gray-400 text-xs">
                {stats.votes_by_status.confirmed.count} paiements
              </p>
            </div>
            <div className="stat-card">
              <p className="stat-label">En attente</p>
              <p className="stat-value font-heading text-amber-600">
                {stats.votes_by_status.pending.count}
              </p>
              <p className="text-gray-400 text-xs">
                {formatNumber(stats.votes_by_status.pending.amount)} FCFA potentiels
              </p>
            </div>
            <div className="stat-card">
              <p className="stat-label">Candidats</p>
              <p className="stat-value font-heading text-gray-900">{stats.candidates_count}</p>
              <p className="text-gray-400 text-xs">
                {stats.votes_by_status.rejected.count} paiements rejetés
              </p>
            </div>
          </section>

          <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <h2 className="px-6 pt-5 pb-3 text-gray-900 font-heading font-black text-sm tracking-widest uppercase">
              Top candidats
            </h2>
            <ol>
              {stats.top_candidates.map((candidate, index) => (
                <li
                  key={candidate.id}
                  className="flex items-center gap-4 px-6 py-3 border-t border-gray-100"
                >
                  <span
                    className={`w-7 h-7 grid place-items-center rounded-full font-heading font-black text-xs shrink-0 ${
                      index === 0 ? 'bg-awac-primary text-white' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span className="flex-1 text-sm font-semibold text-gray-900 truncate">
                    {candidate.full_name}
                  </span>
                  <span className="font-heading font-black text-sm text-gray-900 tabular-nums">
                    {formatNumber(candidate.vote_count)} voix
                  </span>
                </li>
              ))}
              {stats.top_candidates.length === 0 ? (
                <li className="px-6 py-8 text-center text-sm text-gray-400 border-t border-gray-100">
                  Aucun candidat pour le moment.
                </li>
              ) : null}
            </ol>
          </section>
        </>
      ) : null}
    </div>
  )
}
