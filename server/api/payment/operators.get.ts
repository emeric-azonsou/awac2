import { getSebpay } from '../../utils/context'
import { getOperatorsList } from '../../services/payment'
export default defineEventHandler(async (event) => {
  const country = getQuery(event).country
  const value = typeof country === 'string' && country ? country : 'BJ'
  const result = await getOperatorsList(getSebpay(), value)
  setResponseStatus(event, result.status)
  return result.body
})
