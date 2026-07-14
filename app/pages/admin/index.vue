<template>
  <div class="max-w-5xl space-y-10">
    <div class="space-y-1">
      <h1 class="text-gray-900 font-heading font-black text-3xl tracking-tight uppercase">
        Dashboard
      </h1>
      <p class="text-gray-500 font-sans text-sm">
        Vue d'ensemble du concours — votes et revenus en temps réel.
      </p>
    </div>

    <div v-if="pending" class="flex justify-center py-20">
      <div
        class="animate-spin rounded-full h-8 w-8 border-2 border-awac-primary border-t-transparent"
      ></div>
    </div>

    <div v-else-if="error" class="text-center py-20 space-y-4">
      <p class="text-gray-500 text-sm">Impossible de charger les statistiques.</p>
      <button
        class="text-awac-primary font-semibold text-sm hover:underline"
        @click="() => refresh()"
      >
        Réessayer
      </button>
    </div>

    <template v-else-if="stats">
      <section
        class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        aria-label="Chiffres clés"
      >
        <div class="stat-card stat-revenue">
          <p class="stat-label text-white/85">Montant généré</p>
          <p class="stat-value font-heading text-white">
            {{ formatNumber(stats.revenue_fcfa) }} <span class="text-base font-bold">FCFA</span>
          </p>
          <p class="text-white/85 text-xs">votes confirmés uniquement</p>
        </div>
        <div class="stat-card">
          <p class="stat-label">Voix confirmées</p>
          <p class="stat-value font-heading text-gray-900">
            {{ formatNumber(stats.voices_confirmed) }}
          </p>
          <p class="text-gray-400 text-xs">{{ stats.votes_by_status.confirmed.count }} paiements</p>
        </div>
        <div class="stat-card">
          <p class="stat-label">En attente</p>
          <p class="stat-value font-heading text-amber-600">
            {{ stats.votes_by_status.pending.count }}
          </p>
          <p class="text-gray-400 text-xs">
            {{ formatNumber(stats.votes_by_status.pending.amount) }} FCFA potentiels
          </p>
        </div>
        <div class="stat-card">
          <p class="stat-label">Candidats</p>
          <p class="stat-value font-heading text-gray-900">{{ stats.candidates_count }}</p>
          <p class="text-gray-400 text-xs">
            {{ stats.votes_by_status.rejected.count }} paiements rejetés
          </p>
        </div>
      </section>

      <section class="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <h2
          class="px-6 pt-5 pb-3 text-gray-900 font-heading font-black text-sm tracking-widest uppercase"
        >
          Top candidats
        </h2>
        <ol>
          <li
            v-for="(candidate, index) in stats.top_candidates"
            :key="candidate.id"
            class="flex items-center gap-4 px-6 py-3 border-t border-gray-100"
          >
            <span
              class="w-7 h-7 grid place-items-center rounded-full font-heading font-black text-xs shrink-0"
              :class="index === 0 ? 'bg-awac-primary text-white' : 'bg-gray-100 text-gray-500'"
            >
              {{ index + 1 }}
            </span>
            <span class="flex-1 text-sm font-semibold text-gray-900 truncate">
              {{ candidate.full_name }}
            </span>
            <span class="font-heading font-black text-sm text-gray-900 tabular-nums">
              {{ formatNumber(candidate.vote_count) }} voix
            </span>
          </li>
          <li
            v-if="stats.top_candidates.length === 0"
            class="px-6 py-8 text-center text-sm text-gray-400 border-t border-gray-100"
          >
            Aucun candidat pour le moment.
          </li>
        </ol>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

interface AdminStats {
  revenue_fcfa: number
  voices_confirmed: number
  candidates_count: number
  votes_by_status: Record<'confirmed' | 'pending' | 'rejected', { count: number; amount: number }>
  top_candidates: { id: string; full_name: string; vote_count: number }[]
}

const {
  data: stats,
  pending,
  error,
  refresh,
} = await useFetch<AdminStats>('/api/admin/stats', {
  headers: import.meta.server ? useRequestHeaders(['cookie']) : undefined,
})

const formatNumber = (value: number) => new Intl.NumberFormat('fr-FR').format(value ?? 0)
</script>

<style scoped>
.stat-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 1rem;
  padding: 1.25rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}
.stat-revenue {
  /* Rouge de marque assombri : le texte blanc atteint ≥4.9:1 (AA), là où le
     dégradé orange d'origine tombait à 2.79:1 (illisible). */
  background: linear-gradient(135deg, #df413a, #b3302a);
  border-color: transparent;
}
.stat-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #6b7280;
}
.stat-value {
  font-weight: 900;
  font-size: 1.75rem;
  line-height: 1;
}
</style>
