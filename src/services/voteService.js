import { api } from './api'

export const voteService = {
  getCandidates: () => api.get('/candidates'),
  getCandidate: (id) => api.get(`/candidates/${id}`),
  getVotePricing: () => api.get('/settings/public'),
  submitVote: ({ candidateId, quantity, paymentProvider, voterPhone }) =>
    api.post('/votes', {
      candidate_id: candidateId,
      quantity,
      payment_provider: paymentProvider,
      voter_phone: voterPhone,
    }),
}
