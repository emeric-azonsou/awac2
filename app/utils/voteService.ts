import { api } from './api'
export interface Candidate {
  id: string
  full_name: string
  atelier: string | null
  commune: string | null
  profile_photo_url: string | null
  vote_count: number
}
export interface CandidatePhoto {
  id: string
  photo_url: string
  caption: string | null
  photo_order: number
}
export interface CandidateWithPhotos extends Candidate {
  photos: CandidatePhoto[]
}
export interface CountryCurrency {
  code: string
  name: string
}
export interface Country {
  country_code: string
  country_name: string
  prefix: string
  currency: CountryCurrency
}
export interface Operator {
  slug: string
  name: string
  code?: string
  otp_required?: boolean
}
export interface CountriesResponse {
  countries: Country[]
}
export interface OperatorsResponse {
  operators: Operator[]
}
export interface VotePricing {
  vote_unit_price: number | null
  currency: string | null
}
export interface SubmitVotePayload {
  candidateId: string
  quantity: number
  operator: string
  voterPhone: string
  country: string
  currency: string | undefined
}
export interface SubmitVoteResult {
  id: string
  receipt_code: string
  payment_status: string
  provider_link: string | null
  amount: number
  currency: string
}
export interface VoteStatusResult {
  id: string
  payment_status: string
  votes_after: number
}
export interface VoteReceipt {
  receipt_code: string
  payment_status: string
  quantity: number
  amount: number
  currency: string
  candidate_name: string
  created_at: string
  votes_before: number | null
  votes_after: number | null
}
export const voteService = {
  getCandidates: () => api.get<Candidate[]>('/candidates'),
  getCandidate: (id: string) => api.get<CandidateWithPhotos>(`/candidates/${id}`),
  getVotePricing: () => api.get<VotePricing>('/settings/public'),
  getCountries: () => api.get<CountriesResponse>('/payment/countries'),
  getOperators: (country: string) =>
    api.get<OperatorsResponse>(`/payment/operators?country=${encodeURIComponent(country)}`),
  submitVote: ({
    candidateId,
    quantity,
    operator,
    voterPhone,
    country,
    currency,
  }: SubmitVotePayload) =>
    api.post<SubmitVoteResult>('/votes', {
      candidate_id: candidateId,
      quantity,
      operator,
      voter_phone: voterPhone,
      country,
      currency,
    }),
  getVoteStatus: (voteId: string) => api.get<VoteStatusResult>(`/votes/${voteId}/status`),
  getReceipt: (code: string) => api.get<VoteReceipt>(`/receipts/${encodeURIComponent(code)}`),
}
