import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './assets/main.css'

const pinia = createPinia()
const app = createApp(App)

app.use(pinia)
app.use(router)

// 🔥 Charger l'utilisateur avant de monter l'app
import { useUserStore } from './stores/userStore'
const userStore = useUserStore()
await userStore.fetchUser()

app.mount('#app')