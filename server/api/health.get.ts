import { getSebpay } from '../utils/context'
export default defineEventHandler(() => {
  return { status: 'ok', payment: getSebpay() ? 'sebpay' : 'simulated' }
})
