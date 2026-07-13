import { getSebpay } from '../../utils/context'
import { getCountriesList } from '../../services/payment'

export default defineEventHandler(async (event) => {
  const result = await getCountriesList(getSebpay())
  setResponseStatus(event, result.status)
  return result.body
})
