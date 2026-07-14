<template>
  <div class="max-w-6xl space-y-8">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div class="space-y-1">
        <h1 class="text-gray-900 font-heading font-black text-3xl tracking-tight uppercase">
          Votes
        </h1>
        <p class="text-gray-500 font-sans text-sm">Suivi des paiements et réconciliation SebPay.</p>
      </div>
      <button
        class="btn-awac-dark text-[11px] py-3 px-5"
        :disabled="reconciling"
        @click="reconcile"
      >
        <span
          v-if="reconciling"
          class="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"
        ></span>
        <span v-else class="material-icons text-base">sync</span>
        Réconcilier maintenant
      </button>
    </div>

    <p
      v-if="reconcileMessage"
      class="text-sm rounded-xl px-4 py-3 bg-awac-primary/10 text-awac-accent"
    >
      {{ reconcileMessage }}
    </p>

    <section v-if="data" class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <button
        v-for="key in statusOrder"
        :key="key"
        class="text-left rounded-2xl border px-5 py-4 transition-all"
        :class="
          filters.status === key
            ? 'border-awac-primary bg-awac-primary/5'
            : 'border-gray-200 bg-white hover:border-gray-300'
        "
        @click="toggleStatus(key)"
      >
        <p
          class="text-[10px] font-heading font-black tracking-widest uppercase"
          :class="statusMeta[key].label"
        >
          {{ statusMeta[key].text }}
        </p>
        <p class="font-heading font-black text-2xl text-gray-900 tabular-nums mt-1">
          {{ formatNumber(data.totals_by_status[key].amount) }}
          <span class="text-xs font-bold text-gray-400">FCFA</span>
        </p>
        <p class="text-xs text-gray-400">{{ data.totals_by_status[key].count }} paiements</p>
      </button>
    </section>

    <div class="flex items-center gap-3">
      <div class="relative flex-1 max-w-sm">
        <span class="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">
          search
        </span>
        <input
          v-model="searchInput"
          type="text"
          placeholder="Rechercher un code reçu…"
          class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm outline-none transition-all focus:border-awac-primary focus:ring-2 focus:ring-awac-primary/20"
          @keyup.enter="applySearch"
        />
      </div>
      <button
        v-if="filters.status || filters.search"
        class="text-xs font-semibold text-gray-500 hover:text-awac-primary transition-colors"
        @click="resetFilters"
      >
        Réinitialiser
      </button>
    </div>

    <div v-if="pending" class="flex justify-center py-16">
      <div
        class="animate-spin rounded-full h-8 w-8 border-2 border-awac-primary border-t-transparent"
      ></div>
    </div>

    <div
      v-else-if="data && data.votes.length === 0"
      class="text-center py-16 text-sm text-gray-400"
    >
      Aucun vote ne correspond à ces filtres.
    </div>

    <div v-else-if="data" class="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr
              class="text-left text-[10px] font-heading font-black tracking-widest uppercase text-gray-400 border-b border-gray-100"
            >
              <th class="px-5 py-3">Candidat</th>
              <th class="px-5 py-3">Voix</th>
              <th class="px-5 py-3">Montant</th>
              <th class="px-5 py-3">Statut</th>
              <th class="px-5 py-3">Date</th>
              <th class="px-5 py-3">Reçu</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="vote in data.votes"
              :key="vote.id"
              class="border-b border-gray-50 last:border-b-0 hover:bg-gray-50 transition-colors"
            >
              <td class="px-5 py-3 font-semibold text-gray-900">{{ vote.candidate_name }}</td>
              <td class="px-5 py-3 tabular-nums text-gray-600">{{ vote.quantity }}</td>
              <td class="px-5 py-3 tabular-nums font-semibold text-gray-900">
                {{ formatNumber(vote.total_amount) }} F
              </td>
              <td class="px-5 py-3">
                <span
                  class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold"
                  :class="metaFor(vote.payment_status).badge"
                >
                  {{ metaFor(vote.payment_status).text || vote.payment_status }}
                </span>
              </td>
              <td class="px-5 py-3 text-gray-500 whitespace-nowrap">
                {{ formatDate(vote.created_at) }}
              </td>
              <td class="px-5 py-3">
                <NuxtLink
                  :to="`/recu/${vote.receipt_code}`"
                  target="_blank"
                  rel="noopener"
                  class="font-mono text-xs text-awac-accent hover:underline"
                >
                  {{ vote.receipt_code }}
                </NuxtLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div
        v-if="totalPages > 1"
        class="flex items-center justify-between px-5 py-3 border-t border-gray-100 text-sm"
      >
        <span class="text-gray-500"
          >{{ data.total }} votes · page {{ data.page }}/{{ totalPages }}</span
        >
        <div class="flex items-center gap-2">
          <button
            class="grid place-items-center w-9 h-9 rounded-lg border border-gray-200 text-gray-500 disabled:opacity-40 hover:border-awac-primary transition-colors"
            :disabled="filters.page <= 1"
            aria-label="Page précédente"
            @click="goToPage(filters.page - 1)"
          >
            <span class="material-icons text-base">chevron_left</span>
          </button>
          <button
            class="grid place-items-center w-9 h-9 rounded-lg border border-gray-200 text-gray-500 disabled:opacity-40 hover:border-awac-primary transition-colors"
            :disabled="filters.page >= totalPages"
            aria-label="Page suivante"
            @click="goToPage(filters.page + 1)"
          >
            <span class="material-icons text-base">chevron_right</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
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
const statusOrder: PaymentStatus[] = ['confirmed', 'pending', 'rejected']
interface StatusMeta {
  text: string
  label: string
  badge: string
}
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
const filters = ref({ status: '' as '' | PaymentStatus, search: '', page: 1 })
const searchInput = ref('')
const reconciling = ref(false)
const reconcileMessage = ref('')
const requestQuery = computed(() => ({
  status: filters.value.status || undefined,
  search: filters.value.search || undefined,
  page: filters.value.page,
}))
const { data, pending, refresh } = await useFetch<VotesResponse>('/api/admin/votes', {
  query: requestQuery,
  headers: import.meta.server ? useRequestHeaders(['cookie']) : undefined,
})
const totalPages = computed(() =>
  data.value ? Math.max(1, Math.ceil(data.value.total / data.value.per_page)) : 1,
)
const formatNumber = (value: number) => new Intl.NumberFormat('fr-FR').format(value ?? 0)
const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso))
const toggleStatus = (status: PaymentStatus) => {
  filters.value.status = filters.value.status === status ? '' : status
  filters.value.page = 1
}
const applySearch = () => {
  filters.value.search = searchInput.value.trim()
  filters.value.page = 1
}
const resetFilters = () => {
  filters.value = { status: '', search: '', page: 1 }
  searchInput.value = ''
}
const goToPage = (page: number) => {
  filters.value.page = page
}
const reconcile = async () => {
  reconciling.value = true
  reconcileMessage.value = ''
  try {
    const summary = await $fetch<{ checked: number; confirmed: number; rejected: number }>(
      '/api/admin/reconcile',
      { method: 'POST' },
    )
    reconcileMessage.value = `${summary.checked} vote(s) vérifié(s) — ${summary.confirmed} confirmé(s), ${summary.rejected} rejeté(s).`
    await refresh()
  } catch {
    reconcileMessage.value = 'La réconciliation a échoué. Réessayez.'
  } finally {
    reconciling.value = false
  }
}
</script>
