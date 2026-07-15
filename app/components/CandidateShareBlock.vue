<template>
  <div
    class="bg-white border border-gray-200 rounded-2xl p-5 space-y-3 max-w-md mx-auto md:mx-0 text-left"
  >
    <p
      class="text-gray-900 font-heading font-black text-[11px] tracking-widest uppercase flex items-center gap-2"
    >
      <span class="material-icons text-awac-primary text-lg" aria-hidden="true">campaign</span>
      Soutiens {{ firstName }} — partage son lien
    </p>

    <div class="flex flex-wrap items-center gap-2">
      <button
        v-if="canNativeShare"
        type="button"
        class="share-action bg-awac-primary text-white border-awac-primary hover:bg-awac-primaryDark"
        @click="nativeShare"
      >
        <span class="material-icons text-base" aria-hidden="true">share</span>
        Partager
      </button>

      <a
        :href="whatsappShareUrl"
        target="_blank"
        rel="noopener"
        class="share-action bg-[#25D366] text-white border-[#25D366] hover:brightness-95"
      >
        WhatsApp
      </a>

      <a
        :href="facebookShareUrl"
        target="_blank"
        rel="noopener"
        class="share-action bg-[#1877F2] text-white border-[#1877F2] hover:brightness-95"
      >
        Facebook
      </a>

      <button
        type="button"
        class="share-action bg-white text-gray-700 border-gray-200 hover:border-awac-primary hover:text-awac-primary"
        aria-live="polite"
        @click="copyShareLink"
      >
        <span class="material-icons text-base" aria-hidden="true">{{
          copied ? 'check' : 'content_copy'
        }}</span>
        {{ copied ? 'Copié !' : 'Copier le lien' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, toRef } from 'vue'
import { useCandidateShare } from '@/composables/useCandidateShare'

const props = defineProps({
  candidate: { type: Object, required: true },
})

const { whatsappShareUrl, facebookShareUrl, copied, copyShareLink, canNativeShare, nativeShare } =
  useCandidateShare(toRef(props, 'candidate'))

const firstName = computed(() => props.candidate.full_name.split(' ')[0] || '')
</script>

<style scoped>
.share-action {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.625rem 1rem;
  border-width: 1px;
  border-radius: 0.75rem;
  font-family: theme('fontFamily.heading');
  font-weight: 900;
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  transition: all 0.2s ease;
  cursor: pointer;
}
</style>
