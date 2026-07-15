import { getCountriesList } from '../../services/payment'
export default defineEventHandler((event) => {
  const result = getCountriesList()
  setResponseStatus(event, result.status)
  return result.body
})
