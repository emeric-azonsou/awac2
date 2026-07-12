<!-- src/views/admin/competitions/index.vue -->
<template>
  <div v-if="user.role === 'super_admin'">
    <h1 class="text-2xl font-heading font-black text-gray-900">Compétitions</h1>
    <!-- Contenu admin -->
  </div>
  <div v-else class="p-8 text-center">
    <p class="text-gray-500">⛔ Accès réservé au Super Admin.</p>
  </div>
</template>

<script setup>
import { reactive, onMounted } from 'vue'
import { supabase } from '@/services/supabase'

const user = reactive({
  role: 'super_admin', // À remplacer par l'auth réelle
})

const competitions = ref([])

onMounted(async () => {
  const { data } = await supabase.from('competitions').select('*')
  competitions.value = data
})
</script>