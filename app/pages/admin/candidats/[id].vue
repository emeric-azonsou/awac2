<template>
  <div>
    <div v-if="pending" class="flex justify-center py-20">
      <div
        class="animate-spin rounded-full h-8 w-8 border-2 border-awac-primary border-t-transparent"
      ></div>
    </div>
    <div v-else-if="!candidate" class="max-w-3xl space-y-6 py-12 text-center">
      <span class="material-icons text-5xl text-gray-200">person_off</span>
      <p class="text-gray-500 text-sm">Candidat introuvable.</p>
      <NuxtLink
        to="/admin/candidats"
        class="text-awac-primary font-semibold text-sm hover:underline"
      >
        Retour à la liste
      </NuxtLink>
    </div>
    <AdminCandidateForm v-else :candidate="candidate" />
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
  category: string
}
const route = useRoute()
const { data: candidate, pending } = await useFetch<AdminCandidate>(
  `/api/candidates/${route.params.id}`,
  { headers: import.meta.server ? useRequestHeaders(['cookie']) : undefined },
)
</script>
