import { ok, type HttpResult } from '../lib/errors'

const XOF = { code: 'XOF', name: 'Franc CFA (UEMOA)' }
const XAF = { code: 'XAF', name: 'Franc CFA (CEMAC)' }
export const SUPPORTED_COUNTRIES = [
  { country_code: 'BJ', country_name: 'Bénin', prefix: '+229', currency: XOF },
  { country_code: 'TG', country_name: 'Togo', prefix: '+228', currency: XOF },
  { country_code: 'CI', country_name: "Côte d'Ivoire", prefix: '+225', currency: XOF },
  { country_code: 'SN', country_name: 'Sénégal', prefix: '+221', currency: XOF },
  { country_code: 'BF', country_name: 'Burkina Faso', prefix: '+226', currency: XOF },
  { country_code: 'ML', country_name: 'Mali', prefix: '+223', currency: XOF },
  { country_code: 'CG', country_name: 'Congo Brazzaville', prefix: '+242', currency: XAF },
]
interface Network {
  slug: string
  name: string
  otp_required: boolean
}
export const NETWORKS_BY_COUNTRY: Record<string, Network[]> = {
  BJ: [
    { slug: 'mtn', name: 'MTN Bénin', otp_required: false },
    { slug: 'moov', name: 'Moov Bénin', otp_required: false },
    { slug: 'celtiis_bj', name: 'Celtiis Bénin', otp_required: false },
    { slug: 'coris', name: 'Coris Money Bénin', otp_required: false },
  ],
  TG: [
    { slug: 'togocom_tg', name: 'Togocom Togo', otp_required: false },
    { slug: 'moov_tg', name: 'Moov Togo', otp_required: false },
  ],
  CI: [
    { slug: 'mtn_ci', name: "MTN Côte d'Ivoire", otp_required: false },
    { slug: 'moov_ci', name: "Moov Côte d'Ivoire", otp_required: false },
    { slug: 'orange_ci', name: "Orange Côte d'Ivoire", otp_required: false },
    { slug: 'wave_ci', name: "Wave Côte d'Ivoire", otp_required: false },
  ],
  SN: [
    { slug: 'orange_sn', name: 'Orange Sénégal', otp_required: false },
    { slug: 'wave_sn', name: 'Wave Sénégal', otp_required: false },
    { slug: 'free_sn', name: 'Free Sénégal', otp_required: false },
  ],
  BF: [
    { slug: 'moov_bf', name: 'Moov Burkina', otp_required: false },
    { slug: 'orange_bf', name: 'Orange Burkina', otp_required: false },
    { slug: 'wave_bf', name: 'Wave Burkina', otp_required: false },
  ],
  ML: [
    { slug: 'orange_ml', name: 'Orange Mali', otp_required: false },
    { slug: 'mobicash_ml', name: 'Mobicash Mali', otp_required: false },
  ],
  CG: [{ slug: 'mtn_cg', name: 'MTN Congo Brazzaville', otp_required: false }],
}
export const FALLBACK_OPERATORS = [{ slug: 'demo', name: 'Démo (simulation)', otp_required: false }]
export function getNetworkSlugs(): string[] {
  return Object.values(NETWORKS_BY_COUNTRY).flatMap((networks) =>
    networks.map((network) => network.slug),
  )
}
export function getCountriesList(): HttpResult {
  return ok({ countries: SUPPORTED_COUNTRIES })
}
export function getOperatorsList(live: boolean, country: string): HttpResult {
  if (!live) return ok({ operators: FALLBACK_OPERATORS })
  return ok({ operators: NETWORKS_BY_COUNTRY[country] ?? [] })
}
