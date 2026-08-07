import { useCallback, useState } from 'react'
import { voteService } from '../utils/voteService'

const DEFAULT_UNIT_PRICE = 100

export function useVotePricing() {
  const [unitPrice, setUnitPrice] = useState<number>(DEFAULT_UNIT_PRICE)
  const [currency, setCurrency] = useState('FCFA')

  const loadVotePricing = useCallback(async () => {
    try {
      const pricing = await voteService.getVotePricing()
      if (pricing.vote_unit_price !== null) setUnitPrice(pricing.vote_unit_price)
      if (pricing.currency !== null) {
        setCurrency(pricing.currency === 'XOF' ? 'FCFA' : pricing.currency)
      }
    } catch (err) {
      console.error('Erreur chargement prix du vote:', err)
    }
  }, [])

  return { unitPrice, currency, loadVotePricing }
}
