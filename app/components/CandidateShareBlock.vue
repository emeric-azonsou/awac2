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
        aria-label="Partager sur WhatsApp (nouvelle fenêtre)"
        class="share-action bg-[#25D366] text-awac-dark border-[#25D366] hover:brightness-95"
      >
        WhatsApp
      </a>

      <a
        :href="facebookShareUrl"
        target="_blank"
        rel="noopener"
        aria-label="Partager sur Facebook (nouvelle fenêtre)"
        class="share-action bg-[#0B5FCC] text-white border-[#0B5FCC] hover:brightness-95"
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
import { getFirstName } from '~/utils/candidateShare'

const props = defineProps({
  candidate: { type: Object, required: true },
})

const { whatsappShareUrl, facebookShareUrl, copied, copyShareLink, canNativeShare, nativeShare } =
  useCandidateShare(toRef(props, 'candidate'))

const firstName = computed(() => getFirstName(props.candidate.full_name))
</script>

<style scoped>
.share-action {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  min-height: 44px;
  padding: 0.75rem 1.125rem;
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
.share-action:focus-visible {
  outline: 2px solid #0b0b0b;
  outline-offset: 2px;
}
@media (prefers-reduced-motion: reduce) {
  .share-action {
    transition: none;
  }
}
</style>
