import { getFeexpay } from '../utils/context'
export default defineEventHandler(() => {
  return { status: 'ok', payment: getFeexpay() ? 'feexpay' : 'simulated' }
})
