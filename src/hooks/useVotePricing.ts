import { useCallback, useEffect, useRef, useState } from 'react'
import { voteService } from '../utils/voteService'
import { VOTE_DEADLINE_MS } from '../../shared/voteDeadline'

const DEFAULT_UNIT_PRICE = 100

export function useVotePricing() {
  const [unitPrice, setUnitPrice] = useState<number>(DEFAULT_UNIT_PRICE)
  const [currency, setCurrency] = useState('FCFA')
  const [votingClosed, setVotingClosed] = useState(false)
  const serverClock = useRef<{ time: number; monotonic: number } | null>(null)

  useEffect(() => {
    const update = () => {
      const anchor = serverClock.current
      if (!anchor) return
      setVotingClosed(anchor.time + (performance.now() - anchor.monotonic) >= VOTE_DEADLINE_MS)
    }
    const timer = setInterval(update, 250)
    return () => clearInterval(timer)
  }, [])

  const loadVotePricing = useCallback(async () => {
    try {
      const pricing = await voteService.getVotePricing()
      if (pricing.vote_unit_price !== null) setUnitPrice(pricing.vote_unit_price)
      if (pricing.currency !== null) {
        setCurrency(pricing.currency === 'XOF' ? 'FCFA' : pricing.currency)
      }
      const serverTime = Date.parse(pricing.server_time)
      if (Number.isFinite(serverTime)) {
        serverClock.current = { time: serverTime, monotonic: performance.now() }
      }
      setVotingClosed(pricing.voting_closed)
    } catch (err) {
      console.error('Erreur chargement prix du vote:', err)
    }
  }, [])

  return { unitPrice, currency, votingClosed, loadVotePricing }
}
