<template>
  <div class="space-y-6">
    <!-- ===== EN-TÊTE ===== -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl md:text-3xl font-heading font-black text-gray-900">
          Bon retour, <span class="text-awac-primary">{{ userFullName }}</span>
        </h1>
        <p class="text-sm text-gray-500 font-sans mt-1">
          Voici ce qui se passe dans votre concours aujourd'hui.
        </p>
      </div>
      <div class="text-right">
        <p class="text-sm font-semibold text-gray-700">{{ currentDate }}</p>
        <p class="text-xs text-gray-400">{{ currentTime }}</p>
      </div>
    </div>

    <!-- ===== STATISTIQUES ===== -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div
        v-for="stat in stats"
        :key="stat.label"
        class="bg-white/60 backdrop-blur-xl border border-white/30 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-500">{{ stat.label }}</p>
            <p class="text-2xl font-heading font-black text-gray-900 mt-1">
              {{ stat.loading ? '...' : stat.value }}
            </p>
          </div>
          <div class="w-12 h-12 rounded-2xl flex items-center justify-center" :class="stat.bgColor">
            <span class="material-icons text-2xl text-white">{{ stat.icon }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== GRAPHIQUE + ACTIVITÉS ===== -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2 bg-white/60 backdrop-blur-xl border border-white/30 rounded-2xl p-5 shadow-sm">
        <h2 class="text-sm font-heading font-bold text-gray-700 uppercase tracking-wider mb-4">
          Évolution des votes (6 derniers mois)
        </h2>
        <div class="h-64">
          <canvas ref="chartCanvas"></canvas>
        </div>
      </div>

      <div class="bg-white/60 backdrop-blur-xl border border-white/30 rounded-2xl p-5 shadow-sm">
        <h2 class="text-sm font-heading font-bold text-gray-700 uppercase tracking-wider mb-4">
          Dernières activités
        </h2>
        <div class="space-y-3 max-h-64 overflow-y-auto pr-2">
          <div
            v-for="activity in recentActivities"
            :key="activity.id"
            class="flex items-start gap-3 p-2 rounded-xl hover:bg-white/20 transition-colors"
          >
            <div class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" :class="activity.iconBg">
              <span class="material-icons text-sm text-white">{{ activity.icon }}</span>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-800 truncate">{{ activity.action }}</p>
              <p class="text-xs text-gray-400">{{ activity.time }}</p>
            </div>
          </div>
          <div v-if="!loadingActivities && recentActivities.length === 0" class="text-sm text-gray-400 text-center py-4">
            Aucune activité récente
          </div>
          <div v-if="loadingActivities" class="text-sm text-gray-400 text-center py-4">
            Chargement des activités...
          </div>
        </div>
      </div>
    </div>

    <!-- ===== RAPPEL ===== -->
    <div class="bg-gradient-to-r from-awac-primary/10 to-awac-secondary/10 backdrop-blur-xl border border-white/30 rounded-2xl p-5 md:p-6 flex flex-col md:flex-row items-center justify-between gap-4">
      <div>
        <p class="text-sm font-semibold text-gray-800">💡 Astuce du jour</p>
        <p class="text-sm text-gray-600">Un candidat a besoin de plus de votes ? Partagez son profil sur les réseaux sociaux.</p>
      </div>
      <button class="px-6 py-2.5 bg-awac-primary text-white text-sm font-semibold rounded-xl hover:bg-awac-primary/90 transition-colors shadow-sm whitespace-nowrap">
        Partager maintenant
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { Chart, registerables } from 'chart.js'
import { supabase, supabaseAdmin } from '@/services/supabase'
import { useUserStore } from '@/stores/userStore'
import { storeToRefs } from 'pinia'

Chart.register(...registerables)

// ========== USER STORE ==========
const userStore = useUserStore()
const { userFullName } = storeToRefs(userStore)

// ========== ÉTAT ==========
const loadingStats = ref(true)
const loadingActivities = ref(true)
const currentDate = ref('')
const currentTime = ref('')
let timeInterval = null

const stats = ref([
  { label: 'Total Candidats', value: 0, icon: 'people', bgColor: 'bg-gradient-to-br from-awac-primary to-awac-secondary', loading: true },
  { label: 'Membres du Jury', value: 0, icon: 'gavel', bgColor: 'bg-gradient-to-br from-blue-500 to-blue-400', loading: true },
  { label: 'Étapes en cours', value: 0, icon: 'timeline', bgColor: 'bg-gradient-to-br from-emerald-500 to-emerald-400', loading: true },
  { label: 'Votes totaux', value: 0, icon: 'how_to_vote', bgColor: 'bg-gradient-to-br from-amber-500 to-amber-400', loading: true },
])

const recentActivities = ref([])
const chartCanvas = ref(null)
let chartInstance = null
let realtimeChannel = null

// ========== DATE / HEURE ==========
const updateDateTime = () => {
  const now = new Date()
  currentDate.value = now.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  currentTime.value = now.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

// ========== STATISTIQUES ==========
const loadStats = async () => {
  loadingStats.value = true
  try {
    const [totalCandidates, juryMembers, activeSteps, totalVotes] = await Promise.all([
      supabaseAdmin.from('candidates').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('jury_group_members').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('steps').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabaseAdmin.from('public_votes').select('*', { count: 'exact', head: true })
    ])

    stats.value[0].value = totalCandidates.count || 0
    stats.value[1].value = juryMembers.count || 0
    stats.value[2].value = activeSteps.count || 0
    stats.value[3].value = totalVotes.count || 0
  } catch (err) {
    console.error('Erreur chargement stats:', err)
  } finally {
    stats.value.forEach(s => s.loading = false)
    loadingStats.value = false
  }
}

// ========== ACTIVITÉS ==========
const getActionMessage = (action, payload) => {
  const map = {
    create: () => `Nouvel élément créé : ${payload?.resource_type || 'inconnu'}`,
    update: () => `Élément modifié : ${payload?.resource_type || 'inconnu'}`,
    delete: () => `Élément supprimé : ${payload?.resource_type || 'inconnu'}`,
    login: () => `Un utilisateur s'est connecté`,
    logout: () => `Un utilisateur s'est déconnecté`,
    vote: () => `Un nouveau vote a été enregistré`,
    approve: () => `Un élément a été approuvé`,
    reject: () => `Un élément a été rejeté`,
    sign: () => `Une signature a été apposée`,
    lock: () => `Un élément a été verrouillé`,
    revoke: () => `Un élément a été révoqué`,
  }
  const fn = map[action] || (() => `Action : ${action}`)
  return fn(payload)
}

const getIconForAction = (action) => {
  if (!action) return 'info'
  const a = action.toLowerCase()
  if (a.includes('create') || a.includes('insert') || a.includes('ajout')) return 'add_circle'
  if (a.includes('update') || a.includes('edit') || a.includes('modification')) return 'edit'
  if (a.includes('delete') || a.includes('remove') || a.includes('suppression')) return 'delete'
  if (a.includes('vote')) return 'how_to_vote'
  if (a.includes('login')) return 'login'
  if (a.includes('logout')) return 'logout'
  return 'info'
}

const getColorForAction = (action) => {
  if (!action) return 'bg-gray-400'
  const a = action.toLowerCase()
  if (a.includes('create') || a.includes('insert') || a.includes('ajout')) return 'bg-green-500'
  if (a.includes('update') || a.includes('edit') || a.includes('modification')) return 'bg-amber-500'
  if (a.includes('delete') || a.includes('remove') || a.includes('suppression')) return 'bg-red-500'
  if (a.includes('vote')) return 'bg-purple-500'
  if (a.includes('login')) return 'bg-blue-500'
  return 'bg-gray-400'
}

const formatDate = (date) => {
  if (!date) return '—'
  return new Date(date).toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const loadActivities = async () => {
  loadingActivities.value = true
  try {
    const { data, error } = await supabaseAdmin
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) throw error

    if (data && data.length > 0) {
      recentActivities.value = data.map(log => ({
        id: log.id,
        action: getActionMessage(log.action, log),
        time: formatDate(log.created_at),
        icon: getIconForAction(log.action),
        iconBg: getColorForAction(log.action)
      }))
    } else {
      recentActivities.value = [
        { id: 1, action: 'Bienvenue sur votre dashboard !', time: 'Maintenant', icon: 'waving_hand', iconBg: 'bg-awac-primary' }
      ]
    }
  } catch (err) {
    console.error('Erreur chargement activités:', err)
    recentActivities.value = []
  } finally {
    loadingActivities.value = false
  }
}

// ========== GRAPHIQUE ==========
const loadChartData = async () => {
  try {
    const now = new Date()
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(now.getMonth() - 6)

    const { data, error } = await supabaseAdmin
      .from('public_votes')
      .select('created_at')
      .gte('created_at', sixMonthsAgo.toISOString())

    if (error) throw error

    const counts = {}
    const monthNames = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const key = d.toISOString().slice(0, 7)
      monthNames.push(d.toLocaleString('fr-FR', { month: 'short' }))
      counts[key] = 0
    }

    if (data) {
      data.forEach(vote => {
        const key = vote.created_at.slice(0, 7)
        if (counts[key] !== undefined) counts[key]++
      })
    }

    const chartData = Object.values(counts)
    await nextTick()
    createChart(monthNames, chartData)
  } catch (err) {
    console.error('Erreur chargement données graphique:', err)
    await nextTick()
    createChart(['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin'], [0, 0, 0, 0, 0, 0])
  }
}

const createChart = (labels, data) => {
  if (!chartCanvas.value) return
  const ctx = chartCanvas.value.getContext('2d')
  if (chartInstance) chartInstance.destroy()

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Votes',
        data: data,
        borderColor: '#EF7952',
        backgroundColor: 'rgba(239, 121, 82, 0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#EF7952',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(255,255,255,0.9)',
          titleColor: '#1a1a1a',
          bodyColor: '#4b5563',
          borderColor: 'rgba(239, 121, 82, 0.3)',
          borderWidth: 1,
          cornerRadius: 12,
          padding: 12,
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#9ca3af', font: { size: 11, family: 'Montserrat' } },
        },
        y: {
          grid: { color: 'rgba(0,0,0,0.05)', drawBorder: false },
          ticks: { color: '#9ca3af', font: { size: 11, family: 'Montserrat' } },
          beginAtZero: true,
        },
      },
    },
  })
}

// ========== REALTIME ==========
const subscribeToRealtime = () => {
  if (realtimeChannel) return

  realtimeChannel = supabase
    .channel('audit_logs')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'audit_logs'
    }, (payload) => {
      const newLog = payload.new
      recentActivities.value = [
        {
          id: newLog.id,
          action: getActionMessage(newLog.action, newLog),
          time: formatDate(newLog.created_at),
          icon: getIconForAction(newLog.action),
          iconBg: getColorForAction(newLog.action)
        },
        ...recentActivities.value.slice(0, 9)
      ]
    })
    .subscribe()
}

// ========== INIT ==========
const init = async () => {
  updateDateTime()
  timeInterval = setInterval(updateDateTime, 60000)

  await loadStats()
  await loadActivities()
  await loadChartData()
  subscribeToRealtime()
}

onMounted(init)

onBeforeUnmount(() => {
  if (timeInterval) clearInterval(timeInterval)
  if (chartInstance) chartInstance.destroy()
  if (realtimeChannel) {
    realtimeChannel.unsubscribe()
  }
})

watch(chartCanvas, () => {
  if (chartCanvas.value) loadChartData()
})
</script>

<style scoped>
::-webkit-scrollbar {
  width: 3px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 9999px;
}
::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}

.bg-white\/60 {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.backdrop-blur-xl {
  backdrop-filter: blur(16px) saturate(180%);
  -webkit-backdrop-filter: blur(16px) saturate(180%);
}
</style>