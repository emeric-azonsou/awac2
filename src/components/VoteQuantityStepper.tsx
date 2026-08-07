import {
  MIN_VOTE_QUANTITY,
  MAX_VOTE_QUANTITY,
  clampVoteQuantity,
  formatVoteTotal,
} from '../utils/voteQuantity'
import './VoteQuantityStepper.css'

interface VoteQuantityStepperProps {
  value: number
  unitPrice: number
  currency?: string
  candidateName?: string
  onChange: (quantity: number) => void
}

// v-model devient value + onChange : l'équivalent React du couple
// modelValue / update:modelValue de Vue.
export function VoteQuantityStepper({
  value,
  unitPrice,
  currency = 'FCFA',
  candidateName = '',
  onChange,
}: VoteQuantityStepperProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0 space-y-0.5">
        <p className="text-gray-500 font-sans font-medium text-xs tracking-wider uppercase">
          Mes voix
        </p>
        <p className="font-heading font-black text-sm text-awac-accent tabular-nums">
          {formatVoteTotal(value, unitPrice)} {currency}
        </p>
      </div>

      <div
        className="vote-stepper flex items-center gap-1 rounded-full p-1 shrink-0"
        role="group"
        aria-label={candidateName ? `Nombre de voix pour ${candidateName}` : 'Nombre de voix'}
      >
        <button
          type="button"
          className="stepper-btn"
          disabled={value <= MIN_VOTE_QUANTITY}
          aria-label="Retirer une voix"
          onClick={() => onChange(clampVoteQuantity(value - 1))}
        >
          <span className="material-icons text-base" aria-hidden="true">
            remove
          </span>
        </button>

        <span
          className="stepper-count grid place-items-center font-heading font-black text-base text-gray-900 tabular-nums select-none"
          aria-live="polite"
        >
          <span key={value} className="count-pop-enter">
            {value}
          </span>
        </span>

        <button
          type="button"
          className="stepper-btn"
          disabled={value >= MAX_VOTE_QUANTITY}
          aria-label="Ajouter une voix"
          onClick={() => onChange(clampVoteQuantity(value + 1))}
        >
          <span className="material-icons text-base" aria-hidden="true">
            add
          </span>
        </button>
      </div>
    </div>
  )
}
