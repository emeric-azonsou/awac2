import { computed } from 'vue'
import { resolveSiteOrigin } from '~/utils/candidateShare'

export function useSiteOrigin() {
  const requestUrl = useRequestURL()
  const config = useRuntimeConfig()
  return computed(() => resolveSiteOrigin(config.public.siteUrl, requestUrl.origin))
}
