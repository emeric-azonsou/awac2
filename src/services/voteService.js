import { api } from './api'

export const voteService = {
  getCandidates: () => api.get('/candidates'),
  getCandidate: (id) => api.get(`/candidates/${id}`),
  getVotePricing: () => api.get('/settings/public'),
  getCountries: () => api.get('/payment/countries'),
  getOperators: (country) => api.get(`/payment/operators?country=${encodeURIComponent(country)}`),
  submitVote: ({ candidateId, quantity, operator, voterPhone, country, currency }) =>
    api.post('/votes', {
      candidate_id: candidateId,
      quantity,
      operator,
      voter_phone: voterPhone,
      country,
      currency,
    }),
  getVoteStatus: (voteId) => api.get(`/votes/${voteId}/status`),
}
