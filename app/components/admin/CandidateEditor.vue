<template>
  <div class="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm" @click.self="close">
    <div class="w-full max-w-lg h-full bg-[#F9F8F6] shadow-2xl overflow-y-auto animate-slide-in">
      <header
        class="sticky top-0 z-10 bg-white border-b border-gray-100 px-6 h-16 flex items-center justify-between"
      >
        <h2 class="font-heading font-black text-lg text-gray-900 uppercase tracking-tight">
          {{ isEdit ? 'Modifier le candidat' : 'Nouveau candidat' }}
        </h2>
        <button
          class="p-1 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Fermer"
          @click="close"
        >
          <span class="material-icons">close</span>
        </button>
      </header>

      <div class="p-6 space-y-8">
        <!-- Photo de profil -->
        <div class="flex items-center gap-4">
          <div
            class="w-24 h-24 rounded-2xl overflow-hidden bg-gray-100 shrink-0 border border-gray-200"
          >
            <img
              v-if="form.profile_photo_url"
              :src="form.profile_photo_url"
              alt="Photo de profil"
              class="w-full h-full object-cover"
            />
            <div v-else class="w-full h-full grid place-items-center text-gray-300">
              <span class="material-icons text-3xl">person</span>
            </div>
          </div>
          <div class="space-y-2">
            <label class="admin-upload-btn">
              <span class="material-icons text-base">photo_camera</span>
              {{ uploadingProfile ? 'Envoi…' : 'Photo de profil' }}
              <input
                type="file"
                accept="image/*"
                class="hidden"
                :disabled="uploadingProfile"
                @change="onProfileSelected"
              />
            </label>
            <p class="text-xs text-gray-400">JPEG, PNG ou WebP. Compressée automatiquement.</p>
          </div>
        </div>

        <!-- Infos -->
        <div class="space-y-4">
          <div class="space-y-1">
            <label for="cand-name" class="admin-label"
              >Nom complet <span class="text-red-500">*</span></label
            >
            <input id="cand-name" v-model="form.full_name" type="text" class="admin-input" />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1">
              <label for="cand-atelier" class="admin-label">Atelier</label>
              <input id="cand-atelier" v-model="form.atelier" type="text" class="admin-input" />
            </div>
            <div class="space-y-1">
              <label for="cand-commune" class="admin-label">Commune</label>
              <input id="cand-commune" v-model="form.commune" type="text" class="admin-input" />
            </div>
          </div>
          <div class="space-y-1">
            <label for="cand-phone" class="admin-label">Téléphone</label>
            <input id="cand-phone" v-model="form.phone" type="tel" class="admin-input" />
          </div>
        </div>

        <p v-if="errorMessage" class="text-sm text-red-500">{{ errorMessage }}</p>

        <button
          class="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-awac-primary to-awac-accent text-white font-heading font-black text-[11px] tracking-widest uppercase py-3.5 rounded-xl shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98] disabled:opacity-60"
          :disabled="saving"
          @click="save"
        >
          <span
            v-if="saving"
            class="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"
          ></span>
          {{ isEdit ? 'Enregistrer' : 'Créer le candidat' }}
        </button>

        <!-- Réalisations (édition seulement) -->
        <section v-if="isEdit" class="space-y-4 border-t border-gray-200 pt-6">
          <div class="flex items-center justify-between">
            <h3 class="font-heading font-black text-sm text-gray-900 uppercase tracking-widest">
              Réalisations
            </h3>
            <label class="admin-upload-btn">
              <span class="material-icons text-base">add_photo_alternate</span>
              {{ uploadingWork ? 'Envoi…' : 'Ajouter' }}
              <input
                type="file"
                accept="image/*"
                class="hidden"
                :disabled="uploadingWork"
                @change="onWorkSelected"
              />
            </label>
          </div>

          <div v-if="photos.length === 0" class="text-center py-8 text-sm text-gray-400">
            Aucune réalisation pour l'instant.
          </div>
          <div v-else class="grid grid-cols-2 gap-3">
            <figure
              v-for="photo in photos"
              :key="photo.id"
              class="relative group rounded-xl overflow-hidden bg-gray-100 border border-gray-200"
            >
              <img
                :src="photo.photo_url"
                :alt="photo.caption || 'Réalisation'"
                class="w-full h-32 object-cover"
              />
              <button
                class="absolute top-2 right-2 grid place-items-center w-8 h-8 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Supprimer la photo"
                @click="removePhoto(photo.id)"
              >
                <span class="material-icons text-base">delete</span>
              </button>
            </figure>
          </div>
        </section>

        <!-- Zone dangereuse (édition seulement) -->
        <section v-if="isEdit" class="border-t border-red-100 pt-6 space-y-3">
          <h3 class="font-heading font-black text-sm text-red-600 uppercase tracking-widest">
            Supprimer ce candidat
          </h3>
          <p class="text-xs text-gray-500">
            Le candidat disparaît de la vitrine. Ses votes et paiements sont conservés pour la
            comptabilité. Pour confirmer, saisissez son nom :
            <strong>{{ props.candidate?.full_name }}</strong>
          </p>
          <input
            v-model="deleteConfirmName"
            type="text"
            class="admin-input"
            placeholder="Nom du candidat"
          />
          <button
            class="w-full flex items-center justify-center gap-2 border border-red-200 text-red-600 font-heading font-black text-[11px] tracking-widest uppercase py-3 rounded-xl transition-colors hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed"
            :disabled="!canDelete || deleting"
            @click="removeCandidate"
          >
            <span
              v-if="deleting"
              class="animate-spin w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full"
            ></span>
            Supprimer définitivement de la vitrine
          </button>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { uploadCandidatePhoto } from '~/utils/imageCompress'

interface CandidatePhoto {
  id: string
  photo_url: string
  caption: string | null
}
interface AdminCandidate {
  id: string
  full_name: string
  atelier: string | null
  commune: string | null
  phone: string | null
  profile_photo_url: string | null
}

const props = defineProps<{ candidate: AdminCandidate | null }>()
const emit = defineEmits<{ close: []; saved: [] }>()

const isEdit = computed(() => Boolean(props.candidate))

const form = ref({
  full_name: props.candidate?.full_name ?? '',
  atelier: props.candidate?.atelier ?? '',
  commune: props.candidate?.commune ?? '',
  phone: props.candidate?.phone ?? '',
  profile_photo_url: props.candidate?.profile_photo_url ?? '',
})
const photos = ref<CandidatePhoto[]>([])
const saving = ref(false)
const deleting = ref(false)
const uploadingProfile = ref(false)
const uploadingWork = ref(false)
const errorMessage = ref('')
const deleteConfirmName = ref('')

const canDelete = computed(
  () => deleteConfirmName.value.trim() === props.candidate?.full_name.trim(),
)

const loadPhotos = async () => {
  if (!props.candidate) return
  try {
    const data = await $fetch<{ photos: CandidatePhoto[] }>(`/api/candidates/${props.candidate.id}`)
    photos.value = data.photos ?? []
  } catch {
    photos.value = []
  }
}

const onProfileSelected = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  uploadingProfile.value = true
  errorMessage.value = ''
  try {
    const uploaded = await uploadCandidatePhoto(file)
    form.value.profile_photo_url = uploaded.url
  } catch {
    errorMessage.value = "Échec de l'envoi de la photo."
  } finally {
    uploadingProfile.value = false
  }
}

const onWorkSelected = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file || !props.candidate) return
  uploadingWork.value = true
  errorMessage.value = ''
  try {
    const uploaded = await uploadCandidatePhoto(file)
    await $fetch(`/api/admin/candidates/${props.candidate.id}/photos`, {
      method: 'POST',
      body: { blob_id: uploaded.id },
    })
    await loadPhotos()
  } catch {
    errorMessage.value = "Échec de l'ajout de la réalisation."
  } finally {
    uploadingWork.value = false
    input.value = ''
  }
}

const removePhoto = async (photoId: string) => {
  try {
    await $fetch(`/api/admin/photos/${photoId}`, { method: 'DELETE' })
    photos.value = photos.value.filter((photo) => photo.id !== photoId)
  } catch {
    errorMessage.value = 'Impossible de supprimer la photo.'
  }
}

const save = async () => {
  if (!form.value.full_name.trim()) {
    errorMessage.value = 'Le nom du candidat est requis.'
    return
  }
  saving.value = true
  errorMessage.value = ''
  try {
    if (props.candidate) {
      await $fetch(`/api/admin/candidates/${props.candidate.id}`, {
        method: 'PATCH',
        body: form.value,
      })
    } else {
      await $fetch('/api/admin/candidates', { method: 'POST', body: form.value })
    }
    emit('saved')
  } catch {
    errorMessage.value = "Échec de l'enregistrement."
  } finally {
    saving.value = false
  }
}

const removeCandidate = async () => {
  if (!props.candidate || !canDelete.value) return
  deleting.value = true
  try {
    await $fetch(`/api/admin/candidates/${props.candidate.id}`, { method: 'DELETE' })
    emit('saved')
  } catch {
    errorMessage.value = 'Échec de la suppression.'
  } finally {
    deleting.value = false
  }
}

const close = () => emit('close')

onMounted(loadPhotos)
</script>

<style scoped>
.animate-slide-in {
  animation: slideIn 0.3s cubic-bezier(0.22, 1, 0.36, 1) both;
}
@keyframes slideIn {
  from {
    transform: translateX(24px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
@media (prefers-reduced-motion: reduce) {
  .animate-slide-in {
    animation: none;
  }
}
</style>
