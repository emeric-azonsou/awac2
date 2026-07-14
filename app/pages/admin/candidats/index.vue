<template>
  <div class="max-w-5xl space-y-8">
    <div class="flex items-center justify-between gap-4">
      <div class="space-y-1">
        <h1 class="text-gray-900 font-heading font-black text-3xl tracking-tight uppercase">
          Candidats
        </h1>
        <p class="text-gray-500 font-sans text-sm">
          {{ candidates?.length ?? 0 }} candidat(s) en compétition.
        </p>
      </div>
      <NuxtLink
        to="/admin/candidats/nouveau"
        class="flex items-center gap-2 bg-awac-dark text-white font-heading font-black text-[11px] tracking-widest uppercase py-3 px-5 rounded-xl shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98]"
      >
        <span class="material-icons text-base">add</span>
        Ajouter
      </NuxtLink>
    </div>

    <div v-if="pending" class="flex justify-center py-20">
      <div
        class="animate-spin rounded-full h-8 w-8 border-2 border-awac-primary border-t-transparent"
      ></div>
    </div>

    <div v-else-if="!candidates || candidates.length === 0" class="text-center py-20 space-y-3">
      <span class="material-icons text-5xl text-gray-200">group_add</span>
      <p class="text-gray-500 text-sm">Aucun candidat. Commencez par en ajouter un.</p>
    </div>

    <div v-else class="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <NuxtLink
        v-for="candidate in candidates"
        :key="candidate.id"
        :to="`/admin/candidats/${candidate.id}`"
        class="w-full flex items-center gap-4 px-5 py-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors text-left"
      >
        <div class="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 shrink-0">
          <img
            v-if="candidate.profile_photo_url"
            :src="candidate.profile_photo_url"
            :alt="candidate.full_name"
            class="w-full h-full object-cover"
          />
          <div v-else class="w-full h-full grid place-items-center text-gray-300">
            <span class="material-icons">person</span>
          </div>
        </div>
        <div class="min-w-0 flex-1">
          <p class="font-heading font-black text-sm text-gray-900 truncate">
            {{ candidate.full_name }}
          </p>
          <p class="text-xs text-gray-500 truncate">
            <span v-if="candidate.atelier">{{ candidate.atelier }}</span>
            <span v-if="candidate.atelier && candidate.commune"> · </span>
            <span v-if="candidate.commune">{{ candidate.commune }}</span>
            <span v-if="!candidate.atelier && !candidate.commune" class="text-gray-400 italic"
              >Aucune info</span
            >
          </p>
        </div>
        <div class="text-right shrink-0">
          <p class="font-heading font-black text-sm text-gray-900 tabular-nums">
            {{ candidate.vote_count }}
          </p>
          <p class="text-[10px] text-gray-400 uppercase tracking-wider">voix</p>
        </div>
        <div class="flex items-center gap-1 text-gray-400 shrink-0">
          <span class="material-icons text-base">photo_library</span>
          <span class="text-xs tabular-nums">{{ candidate.photos_count }}</span>
        </div>
        <span class="material-icons text-gray-300">chevron_right</span>
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
interface AdminCandidate {
  id: string
  full_name: string
  atelier: string | null
  commune: string | null
  profile_photo_url: string | null
  vote_count: number
  photos_count: number
}
const { data: candidates, pending } = await useFetch<AdminCandidate[]>('/api/admin/candidates', {
  headers: import.meta.server ? useRequestHeaders(['cookie']) : undefined,
})
</script>
