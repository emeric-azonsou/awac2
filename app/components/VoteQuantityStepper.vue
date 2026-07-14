<template>
  <div class="flex items-center justify-between gap-3">
    <div class="min-w-0 space-y-0.5">
      <p class="text-gray-500 font-sans font-medium text-xs tracking-wider uppercase">Mes voix</p>
      <p class="font-heading font-black text-sm text-awac-accent tabular-nums">
        {{ formatVoteTotal(modelValue, unitPrice) }} {{ currency }}
      </p>
    </div>

    <div
      class="vote-stepper flex items-center gap-1 rounded-full p-1 shrink-0"
      role="group"
      :aria-label="candidateName ? `Nombre de voix pour ${candidateName}` : 'Nombre de voix'"
    >
      <button
        type="button"
        class="stepper-btn"
        :disabled="modelValue <= MIN_VOTE_QUANTITY"
        aria-label="Retirer une voix"
        @click="emit('update:modelValue', clampVoteQuantity(modelValue - 1))"
      >
        <span class="material-icons text-base" aria-hidden="true">remove</span>
      </button>

      <span
        class="stepper-count grid place-items-center font-heading font-black text-base text-gray-900 tabular-nums select-none"
        aria-live="polite"
      >
        <Transition name="count-pop" mode="out-in">
          <span :key="modelValue">{{ modelValue }}</span>
        </Transition>
      </span>

      <button
        type="button"
        class="stepper-btn"
        :disabled="modelValue >= MAX_VOTE_QUANTITY"
        aria-label="Ajouter une voix"
        @click="emit('update:modelValue', clampVoteQuantity(modelValue + 1))"
      >
        <span class="material-icons text-base" aria-hidden="true">add</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import {
  MIN_VOTE_QUANTITY,
  MAX_VOTE_QUANTITY,
  clampVoteQuantity,
  formatVoteTotal,
} from '~/utils/voteQuantity'
defineProps({
  modelValue: { type: Number, required: true },
  unitPrice: { type: Number, required: true },
  currency: { type: String, default: 'FCFA' },
  candidateName: { type: String, default: '' },
})
const emit = defineEmits(['update:modelValue'])
</script>

<style scoped>
.vote-stepper {
  background: linear-gradient(135deg, rgba(239, 121, 82, 0.1), rgba(223, 65, 58, 0.08));
  box-shadow: inset 0 0 0 1px rgba(239, 121, 82, 0.25);
}
.stepper-btn {
  display: grid;
  place-items: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 9999px;
  background: #fff;
  color: #4b5563;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(11, 11, 11, 0.08);
  transition:
    background-color 0.25s cubic-bezier(0.22, 1, 0.36, 1),
    color 0.25s cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 0.25s cubic-bezier(0.22, 1, 0.36, 1);
}
.stepper-btn:active {
  transform: scale(0.95);
}
.stepper-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #ef7952, #df413a);
  color: #fff;
  box-shadow: 0 4px 12px rgba(239, 121, 82, 0.35);
}
.stepper-btn:focus-visible {
  outline: 2px solid #ef7952;
  outline-offset: 2px;
}
.stepper-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
  transform: none;
}
.stepper-count {
  min-width: 2.75ch;
}
.count-pop-enter-active {
  transition: all 0.18s cubic-bezier(0.22, 1, 0.36, 1);
}
.count-pop-leave-active {
  transition: all 0.12s cubic-bezier(0.22, 1, 0.36, 1);
}
.count-pop-enter-from {
  opacity: 0;
  transform: translateY(6px) scale(0.7);
}
.count-pop-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.7);
}
@media (prefers-reduced-motion: reduce) {
  .count-pop-enter-active,
  .count-pop-leave-active {
    transition: opacity 0.1s linear;
  }
  .count-pop-enter-from,
  .count-pop-leave-to {
    transform: none;
  }
}
</style>
