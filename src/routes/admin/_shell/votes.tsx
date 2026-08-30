import { useCallback, useEffect, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { api } from '../../../utils/api'

export const Route = createFileRoute('/admin/_shell/votes')({
  component: AdminVotes,
})

type PaymentStatus = 'confirmed' | 'pending' | 'rejected'

interface AdminVote {
  id: string
  receipt_code: string
  candidate_name: string
  quantity: number
  total_amount: number
  currency: string
  payment_status: string
  payment_provider: string
  created_at: string
}

interface VotesResponse {
  votes: AdminVote[]
  total: number
  page: number
  per_page: number
  totals_by_status: Record<PaymentStatus, { count: number; amount: number }>
}

interface StatusMeta {
  text: string
  label: string
  badge: string
}

const statusOrder: PaymentStatus[] = ['confirmed', 'pending', 'rejected']

const statusMeta: Record<PaymentStatus, StatusMeta> = {
  confirmed: { text: 'Confirmés', label: 'text-green-600', badge: 'bg-green-100 text-green-700' },
  pending: { text: 'En attente', label: 'text-amber-600', badge: 'bg-amber-100 text-amber-700' },
  rejected: { text: 'Rejetés', label: 'text-red-500', badge: 'bg-red-100 text-red-600' },
}

const FALLBACK_META: StatusMeta = {
  text: '',
  label: 'text-gray-500',
  badge: 'bg-gray-100 text-gray-500',
}

const metaFor = (status: string): StatusMeta =>
  statusMeta[status as PaymentStatus] ?? { ...FALLBACK_META, text: status }

const formatNumber = (value: number) => new Intl.NumberFormat('fr-FR').format(value ?? 0)
const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso))

function AdminVotes() {
  const [status, setStatus] = useState<'' | PaymentStatus>('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [data, setData] = useState<VotesResponse | null>(null)
  const [pending, setPending] = useState(true)
  const [reconciling, setReconciling] = useState(false)
  const [reconcileMessage, setReconcileMessage] = useState('')

  const refresh = useCallback(async () => {
    setPending(true)
    const query = new URLSearchParams()
    if (status) query.set('status', status)
    if (search) query.set('search', search)
    query.set('page', String(page))
    try {
      setData(await api.get<VotesResponse>(`/admin/votes?${query.toString()}`))
    } catch {
      setData(null)
    } finally {
      setPending(false)
    }
  }, [status, search, page])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.per_page)) : 1

  const toggleStatus = (next: PaymentStatus) => {
    setStatus((current) => (current === next ? '' : next))
    setPage(1)
  }

  const applySearch = () => {
    setSearch(searchInput.trim())
    setPage(1)
  }

  const resetFilters = () => {
    setStatus('')
    setSearch('')
    setPage(1)
    setSearchInput('')
  }

  const reconcile = async () => {
    setReconciling(true)
    setReconcileMessage('')
    try {
      const summary = await api.post<{ checked: number; confirmed: number; rejected: number }>(
        '/admin/reconcile',
        {},
      )
      setReconcileMessage(
        `${summary.checked} vote(s) vérifié(s) — ${summary.confirmed} confirmé(s), ${summary.rejected} rejeté(s).`,
      )
      await refresh()
    } catch {
      setReconcileMessage('La réconciliation a échoué. Réessayez.')
    } finally {
      setReconciling(false)
    }
  }

  return (
    <div className="max-w-6xl space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-gray-900 font-heading font-black text-3xl tracking-tight uppercase">
            Votes
          </h1>
          <p className="text-gray-500 font-sans text-sm">
            Suivi des paiements et réconciliation FeexPay.
          </p>
        </div>
        <button
          className="btn-awac-dark text-[11px] py-3 px-5"
          disabled={reconciling}
          onClick={() => void reconcile()}
        >
          {reconciling ? (
            <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
          ) : (
            <span className="material-icons text-base">sync</span>
          )}
          Réconcilier maintenant
        </button>
      </div>

      {reconcileMessage ? (
        <p className="text-sm rounded-xl px-4 py-3 bg-awac-primary/10 text-awac-accent">
          {reconcileMessage}
        </p>
      ) : null}

      {data ? (
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {statusOrder.map((key) => (
            <button
              key={key}
              className={`text-left rounded-2xl border px-5 py-4 transition-all ${
                status === key
                  ? 'border-awac-primary bg-awac-primary/5'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
              onClick={() => toggleStatus(key)}
            >
              <p
                className={`text-[10px] font-heading font-black tracking-widest uppercase ${statusMeta[key].label}`}
              >
                {statusMeta[key].text}
              </p>
              <p className="font-heading font-black text-2xl text-gray-900 tabular-nums mt-1">
                {formatNumber(data.totals_by_status[key].amount)}{' '}
                <span className="text-xs font-bold text-gray-400">FCFA</span>
              </p>
              <p className="text-xs text-gray-400">{data.totals_by_status[key].count} paiements</p>
            </button>
          ))}
        </section>
      ) : null}

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">
            search
          </span>
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            onKeyUp={(event) => {
              if (event.key === 'Enter') applySearch()
            }}
            type="text"
            placeholder="Rechercher un code reçu…"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm outline-none transition-all focus:border-awac-primary focus:ring-2 focus:ring-awac-primary/20"
          />
        </div>
        {status || search ? (
          <button
            className="text-xs font-semibold text-gray-500 hover:text-awac-primary transition-colors"
            onClick={resetFilters}
          >
            Réinitialiser
          </button>
        ) : null}
      </div>

      {pending ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-awac-primary border-t-transparent" />
        </div>
      ) : data && data.votes.length === 0 ? (
        <div className="text-center py-16 text-sm text-gray-400">
          Aucun vote ne correspond à ces filtres.
        </div>
      ) : data ? (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] font-heading font-black tracking-widest uppercase text-gray-400 border-b border-gray-100">
                  <th className="px-5 py-3">Candidat</th>
                  <th className="px-5 py-3">Voix</th>
                  <th className="px-5 py-3">Montant</th>
                  <th className="px-5 py-3">Statut</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Reçu</th>
                </tr>
              </thead>
              <tbody>
                {data.votes.map((vote) => (
                  <tr
                    key={vote.id}
                    className="border-b border-gray-50 last:border-b-0 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-5 py-3 font-semibold text-gray-900">{vote.candidate_name}</td>
                    <td className="px-5 py-3 tabular-nums text-gray-600">{vote.quantity}</td>
                    <td className="px-5 py-3 tabular-nums font-semibold text-gray-900">
                      {formatNumber(vote.total_amount)} F
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                          metaFor(vote.payment_status).badge
                        }`}
                      >
                        {metaFor(vote.payment_status).text || vote.payment_status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-500 whitespace-nowrap">
                      {formatDate(vote.created_at)}
                    </td>
                    <td className="px-5 py-3">
                      <Link
                        to="/recu/$code"
                        params={{ code: vote.receipt_code }}
                        target="_blank"
                        rel="noopener"
                        className="font-mono text-xs text-awac-accent hover:underline"
                      >
                        {vote.receipt_code}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 ? (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 text-sm">
              <span className="text-gray-500">
                {data.total} votes · page {data.page}/{totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  className="grid place-items-center w-9 h-9 rounded-lg border border-gray-200 text-gray-500 disabled:opacity-40 hover:border-awac-primary transition-colors"
                  disabled={page <= 1}
                  aria-label="Page précédente"
                  onClick={() => setPage(page - 1)}
                >
                  <span className="material-icons text-base">chevron_left</span>
                </button>
                <button
                  className="grid place-items-center w-9 h-9 rounded-lg border border-gray-200 text-gray-500 disabled:opacity-40 hover:border-awac-primary transition-colors"
                  disabled={page >= totalPages}
                  aria-label="Page suivante"
                  onClick={() => setPage(page + 1)}
                >
                  <span className="material-icons text-base">chevron_right</span>
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
