import { ref } from 'vue'
import { voteService } from '@/services/voteService'

const DEFAULT_UNIT_PRICE = 100

export function useVotePricing() {
  const unitPrice = ref(DEFAULT_UNIT_PRICE)
  const currency = ref('FCFA')

  const loadVotePricing = async () => {
    try {
      const pricing = await voteService.getVotePricing()
      unitPrice.value = pricing.vote_unit_price
      currency.value = pricing.currency === 'XOF' ? 'FCFA' : pricing.currency
    } catch (err) {
      console.error('Erreur chargement prix du vote:', err)
    }
  }

  return { unitPrice, currency, loadVotePricing }
}
