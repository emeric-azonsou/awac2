import { getFeexpay } from '../../utils/context'
import { getOperatorsList } from '../../services/payment'
export default defineEventHandler((event) => {
  const country = getQuery(event).country
  const value = typeof country === 'string' && country ? country : 'BJ'
  const result = getOperatorsList(Boolean(getFeexpay()), value)
  setResponseStatus(event, result.status)
  return result.body
})
