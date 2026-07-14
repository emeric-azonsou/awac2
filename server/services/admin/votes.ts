// Liste paginée des votes côté admin, avec filtres (statut, candidat, recherche
// par code reçu) et agrégats par statut. Tous les filtres passent en paramètres
// liés (jamais d'interpolation de chaîne) → aucune injection possible.
import type { Db } from '../../types'
import { isUuid } from '../candidates'
import { ok, type HttpResult } from '../../lib/errors'

const DEFAULT_PER_PAGE = 25
const MAX_PER_PAGE = 100
const PAYMENT_STATUSES = ['confirmed', 'pending', 'rejected'] as const
type PaymentStatus = (typeof PAYMENT_STATUSES)[number]

export interface AdminVotesDeps {
  db: Db
}

export interface AdminVotesQuery {
  status?: string
  candidateId?: string
  search?: string
  page?: number
  limit?: number
}

function normalizeStatus(value: string | undefined): PaymentStatus | null {
  return PAYMENT_STATUSES.includes(value as PaymentStatus) ? (value as PaymentStatus) : null
}

function normalizePage(value: number | undefined): number {
  const page = Math.trunc(Number(value))
  return Number.isFinite(page) && page >= 1 ? page : 1
}

function normalizePerPage(value: number | undefined): number {
  const limit = Math.trunc(Number(value))
  if (!Number.isFinite(limit) || limit < 1) return DEFAULT_PER_PAGE
  return Math.min(limit, MAX_PER_PAGE)
}

export async function listAdminVotes(
  deps: AdminVotesDeps,
  query: AdminVotesQuery,
): Promise<HttpResult> {
  const { db } = deps
  const status = normalizeStatus(query.status)
  const candidateId = isUuid(query.candidateId) ? query.candidateId : null
  const search =
    typeof query.search === 'string' && query.search.trim()
      ? query.search.trim().slice(0, 60)
      : null
  const page = normalizePage(query.page)
  const perPage = normalizePerPage(query.limit)
  const offset = (page - 1) * perPage
  const searchPattern = search ? `%${search}%` : null

  // Filtres optionnels via le motif `param IS NULL OR colonne = param` : tous les
  // filtres sont des paramètres liés (aucune interpolation), un filtre absent est
  // désactivé par son NULL. Identique entre COUNT et SELECT.
  const votes = await db`
    SELECT v.id, v.receipt_code, c.full_name AS candidate_name, v.quantity, v.total_amount,
           v.currency, v.payment_status, v.payment_provider, v.created_at
    FROM votes v
    JOIN candidates c ON c.id = v.candidate_id
    WHERE (${status}::text IS NULL OR v.payment_status = ${status})
      AND (${candidateId}::uuid IS NULL OR v.candidate_id = ${candidateId})
      AND (${searchPattern}::text IS NULL OR v.receipt_code ILIKE ${searchPattern})
    ORDER BY v.created_at DESC
    LIMIT ${perPage} OFFSET ${offset}`

  const countRows = await db`
    SELECT COUNT(*)::int AS total
    FROM votes v
    WHERE (${status}::text IS NULL OR v.payment_status = ${status})
      AND (${candidateId}::uuid IS NULL OR v.candidate_id = ${candidateId})
      AND (${searchPattern}::text IS NULL OR v.receipt_code ILIKE ${searchPattern})`
  const total = Number(countRows[0]?.total) || 0

  // Agrégats par statut : sur toute la table (indépendants des filtres/pagination).
  const statusRows = await db`
    SELECT payment_status, COUNT(*)::int AS count, COALESCE(SUM(total_amount), 0)::int AS amount
    FROM votes
    GROUP BY payment_status`
  // On n'expose que les statuts canoniques : un éventuel statut legacy (ex.
  // 'simulated' des anciennes données de test) est ignoré dans le résumé.
  const totalsByStatus: Record<string, { count: number; amount: number }> = {}
  for (const key of PAYMENT_STATUSES) totalsByStatus[key] = { count: 0, amount: 0 }
  for (const row of statusRows) {
    const status = String(row.payment_status)
    if (normalizeStatus(status)) {
      totalsByStatus[status] = { count: Number(row.count) || 0, amount: Number(row.amount) || 0 }
    }
  }

  return ok({
    votes,
    total,
    page,
    per_page: perPage,
    totals_by_status: totalsByStatus,
  })
}
