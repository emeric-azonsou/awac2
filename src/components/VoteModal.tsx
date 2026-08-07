import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from '@tanstack/react-router'
import {
  voteService,
  type Candidate,
  type Country,
  type Operator,
} from '../utils/voteService'
import { pollPaymentStatus } from '../hooks/usePaymentPolling'
import { clampVoteQuantity } from '../utils/voteQuantity'
import { rememberPendingVote, forgetPendingVote } from '../utils/pendingVotes'
import { useCopyToClipboard } from '../hooks/useCopyToClipboard'
import './VoteModal.css'

export interface VotedResult {
  votes_after: number
}

type Phase = 'form' | 'awaiting' | 'failed' | 'thanks'

interface VoteForm {
  country: string
  operator: string
  phone_number: string
  quantity: number
}

interface VoteModalProps {
  candidate: Candidate | null
  initialQuantity?: number
  unitPrice: number
  currency?: string
  onClose: () => void
  onVoted: (result: VotedResult) => void
}

type Poller = ReturnType<typeof pollPaymentStatus> | null

export function VoteModal({
  candidate,
  initialQuantity = 1,
  unitPrice,
  currency = 'FCFA',
  onClose,
  onVoted,
}: VoteModalProps) {
  const emptyForm = useCallback(
    (): VoteForm => ({
      country: 'BJ',
      operator: '',
      phone_number: '',
      quantity: clampVoteQuantity(initialQuantity),
    }),
    [initialQuantity],
  )

  const [form, setForm] = useState<VoteForm>(emptyForm)
  const [phase, setPhase] = useState<Phase>('form')
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [receiptCode, setReceiptCode] = useState('')
  const [countries, setCountries] = useState<Country[]>([])
  const [operators, setOperators] = useState<Operator[]>([])
  const [metaLoading, setMetaLoading] = useState(false)
  const { copied, copy } = useCopyToClipboard()

  const poller = useRef<Poller>(null)
  const countriesRef = useRef<Country[]>([])
  countriesRef.current = countries

  const selectedCountry = countries.find((entry) => entry.country_code === form.country)
  const selectedPrefix = selectedCountry?.prefix || ''
  const phonePlaceholder = form.country === 'BJ' ? '01 97 00 00 00' : 'Numéro sans indicatif'
  const formattedTotal = new Intl.NumberFormat('fr-FR').format(
    (Number(form.quantity) || 0) * unitPrice,
  )

  const loadOperators = useCallback(async (countryCode: string) => {
    setMetaLoading(true)
    setForm((current) => ({ ...current, operator: '' }))
    try {
      const { operators: list } = await voteService.getOperators(countryCode)
      setOperators(list)
      // Un opérateur unique est présélectionné : l'utilisateur n'a pas à choisir.
      const only = list.length === 1 ? list[0] : undefined
      if (only) setForm((current) => ({ ...current, operator: only.code || only.slug }))
    } catch (err) {
      console.error('Erreur chargement opérateurs:', err)
      setOperators([])
    } finally {
      setMetaLoading(false)
    }
  }, [])

  const loadCountries = useCallback(async () => {
    setMetaLoading(true)
    try {
      const { countries: list } = await voteService.getCountries()
      setCountries(list)
      const fallback = list[0]?.country_code || 'BJ'
      let country = form.country
      if (!list.some((entry) => entry.country_code === country)) {
        country = fallback
        setForm((current) => ({ ...current, country }))
      }
      await loadOperators(country)
    } catch (err) {
      console.error('Erreur chargement moyens de paiement:', err)
    } finally {
      setMetaLoading(false)
    }
    // form.country est lu au premier appel seulement, comme dans la version Vue
    // où loadCountries n'était déclenché qu'à l'ouverture initiale.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadOperators])

  // Remplace le watch sur props.candidate : chaque ouverture repart d'un
  // formulaire vierge, en phase form, sans message d'erreur résiduel.
  useEffect(() => {
    if (!candidate) return
    setForm(emptyForm())
    setPhase('form')
    setErrorMessage('')
    if (countriesRef.current.length === 0) void loadCountries()
    else void loadOperators('BJ')
  }, [candidate, emptyForm, loadCountries, loadOperators])

  useEffect(() => {
    return () => {
      poller.current?.cancel()
      poller.current = null
    }
  }, [])

  const startPolling = (voteId: string, code: string) => {
    const started = pollPaymentStatus(voteId)
    poller.current = started
    void started.promise.then((result) => {
      if (result.status === 'confirmed') {
        forgetPendingVote(code)
        onVoted({ votes_after: result.votesAfter })
        setPhase('thanks')
      } else if (result.status === 'rejected') {
        forgetPendingVote(code)
        setErrorMessage('Le paiement a été refusé ou annulé.')
        setPhase('failed')
      } else {
        setErrorMessage(
          "Nous n'avons pas reçu la confirmation à temps. Si vous avez payé, votre vote sera comptabilisé sous peu.",
        )
        setPhase('failed')
      }
      poller.current = null
    })
  }

  const close = () => {
    poller.current?.cancel()
    poller.current = null
    onClose()
  }

  const cancelPolling = () => close()

  const closeThanks = () => {
    setPhase('form')
    onClose()
  }

  const submitVote = async (event: FormEvent) => {
    event.preventDefault()
    if (!form.operator || !form.phone_number.trim()) {
      setErrorMessage('Veuillez remplir tous les champs obligatoires.')
      return
    }
    if (!candidate) return
    setSubmitting(true)
    setErrorMessage('')
    try {
      const result = await voteService.submitVote({
        candidateId: candidate.id,
        quantity: clampVoteQuantity(form.quantity),
        operator: form.operator,
        voterPhone: `${selectedPrefix}${form.phone_number.trim()}`,
        country: form.country,
        currency: selectedCountry?.currency?.code,
      })
      setReceiptCode(result.receipt_code)
      if (result.payment_status === 'confirmed') {
        onVoted({ votes_after: (result as unknown as { votes_after: number }).votes_after })
        setPhase('thanks')
      } else {
        rememberPendingVote({
          receipt_code: result.receipt_code,
          candidate_name: candidate.full_name,
        })
        setPhase('awaiting')
        startPolling(result.id, result.receipt_code)
      }
    } catch (err) {
      console.error('Erreur lors du vote:', err)
      setErrorMessage(
        err instanceof Error && err.message ? err.message : "Impossible d'initier le paiement.",
      )
    } finally {
      setSubmitting(false)
    }
  }

  const onCountryChange = (country: string) => {
    setForm((current) => ({ ...current, country }))
    void loadOperators(country)
  }

  return (
    <>
      {candidate && phase !== 'thanks' ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget && phase === 'form') close()
          }}
        >
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl border border-white/30 shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-heading font-black text-gray-900">
                Voter pour <span className="text-awac-primary">{candidate.full_name}</span>
              </h3>
              {phase === 'form' ? (
                <button
                  onClick={close}
                  className="grid place-items-center w-10 h-10 -mr-2 rounded-lg hover:bg-gray-100 transition-colors"
                  aria-label="Fermer"
                >
                  <span className="material-icons">close</span>
                </button>
              ) : null}
            </div>

            {phase === 'form' ? (
              <form onSubmit={submitVote} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Pays <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={form.country}
                      required
                      disabled={metaLoading}
                      className="awac-select"
                      onChange={(event) => onCountryChange(event.target.value)}
                    >
                      {countries.map((country) => (
                        <option key={country.country_code} value={country.country_code}>
                          {country.country_name}
                        </option>
                      ))}
                    </select>
                    <span
                      className="material-icons absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                      aria-hidden="true"
                    >
                      expand_more
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Moyen de paiement <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={form.operator}
                      required
                      disabled={metaLoading || operators.length === 0}
                      className="awac-select"
                      onChange={(event) =>
                        setForm((current) => ({ ...current, operator: event.target.value }))
                      }
                    >
                      <option value="">{metaLoading ? 'Chargement…' : 'Sélectionner'}</option>
                      {operators.map((operator) => (
                        <option key={operator.slug} value={operator.code || operator.slug}>
                          {operator.name}
                        </option>
                      ))}
                    </select>
                    <span
                      className={`material-icons absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${
                        metaLoading || operators.length === 0 ? 'text-gray-300' : 'text-gray-400'
                      }`}
                      aria-hidden="true"
                    >
                      expand_more
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Numéro de téléphone <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-500 font-medium shrink-0">
                      {selectedPrefix}
                    </span>
                    <input
                      value={form.phone_number}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, phone_number: event.target.value }))
                      }
                      type="tel"
                      required
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-awac-primary focus:ring-2 focus:ring-awac-primary/20 outline-none transition-all text-sm"
                      placeholder={phonePlaceholder}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {form.quantity} voix × {unitPrice} {currency}
                  </span>
                  <span className="font-heading font-black text-awac-accent tabular-nums">
                    {formattedTotal} F
                  </span>
                </div>

                {errorMessage ? <p className="text-sm text-red-500">{errorMessage}</p> : null}

                <div className="flex flex-col-reverse sm:flex-row items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={close}
                    className="w-full sm:w-auto px-5 py-2.5 border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 transition-colors text-sm"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="w-full sm:w-auto flex-1 px-5 py-2.5 bg-awac-primary text-white font-semibold rounded-xl hover:bg-awac-primaryDark transition-colors shadow-sm text-sm flex items-center justify-center gap-2 disabled:opacity-70"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    ) : null}
                    {submitting ? 'Envoi...' : 'Voter'}
                  </button>
                </div>
              </form>
            ) : phase === 'awaiting' ? (
              <div className="text-center py-2 space-y-6">
                <div className="relative mx-auto grid h-24 w-24 place-items-center">
                  <span
                    className="absolute inline-flex h-16 w-16 motion-safe:animate-ping rounded-full bg-awac-primary/30"
                    aria-hidden="true"
                  />
                  <span
                    className="absolute inline-flex h-20 w-20 motion-safe:animate-ping rounded-full bg-awac-primary/20"
                    style={{ animationDelay: '0.6s' }}
                    aria-hidden="true"
                  />
                  <div className="relative grid h-16 w-16 place-items-center rounded-full bg-awac-primary text-white shadow-lg shadow-awac-primary/30">
                    <span className="material-icons text-3xl" aria-hidden="true">
                      smartphone
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-heading font-black text-lg text-gray-900">Presque terminé !</h4>
                  <p className="text-sm leading-relaxed text-gray-600 text-justify sm:text-center">
                    Une demande de paiement de{' '}
                    <span className="font-heading font-black text-awac-accent">
                      {formattedTotal} F
                    </span>{' '}
                    vient d&apos;arriver sur votre téléphone. Validez-la pour confirmer votre vote
                    pour <span className="font-semibold text-gray-900">{candidate.full_name}</span>.
                  </p>
                  <p className="inline-flex items-center gap-1.5 rounded-full bg-awac-primary/10 px-3 py-1.5 text-sm font-semibold text-awac-primary">
                    <span className="material-icons text-base" aria-hidden="true">
                      call
                    </span>
                    {selectedPrefix} {form.phone_number}
                  </p>
                </div>

                <div className="flex items-center justify-center gap-2 text-xs font-semibold text-gray-400">
                  <span
                    className="h-3.5 w-3.5 motion-safe:animate-spin rounded-full border-2 border-awac-primary/40 border-t-awac-primary"
                    aria-hidden="true"
                  />
                  En attente de votre confirmation…
                </div>

                {receiptCode ? (
                  <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3 text-left space-y-2">
                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                      Votre code reçu — gardez-le
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 font-mono text-xs font-bold text-gray-900 break-all">
                        {receiptCode}
                      </span>
                      <button
                        type="button"
                        className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-gray-600 transition-colors hover:border-awac-primary hover:text-awac-primary active:scale-95"
                        aria-label={copied ? 'Code copié' : 'Copier le code reçu'}
                        onClick={() => void copy(receiptCode)}
                      >
                        <span className="material-icons text-sm" aria-hidden="true">
                          {copied ? 'check' : 'content_copy'}
                        </span>
                        {copied ? 'Copié' : 'Copier'}
                      </button>
                    </div>
                    <Link
                      to="/recu/$code"
                      params={{ code: receiptCode }}
                      className="inline-block text-xs text-awac-accent font-semibold hover:underline"
                    >
                      Vérifier mon vote à tout moment →
                    </Link>
                  </div>
                ) : null}

                <button
                  onClick={cancelPolling}
                  className="text-xs text-gray-400 hover:text-gray-600 underline"
                >
                  Annuler l&apos;attente
                </button>
              </div>
            ) : phase === 'failed' ? (
              <div className="text-center py-6 space-y-5">
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
                  <span className="material-icons text-3xl text-red-500">error_outline</span>
                </div>
                <div className="space-y-2">
                  <h4 className="font-heading font-black text-gray-900">Paiement non confirmé</h4>
                  <p className="text-sm text-gray-600 text-justify sm:text-center">{errorMessage}</p>
                  {receiptCode ? (
                    <Link
                      to="/recu/$code"
                      params={{ code: receiptCode }}
                      className="inline-block text-xs text-awac-accent font-semibold hover:underline"
                    >
                      Vérifier mon reçu ({receiptCode})
                    </Link>
                  ) : null}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={close}
                    className="flex-1 px-5 py-2.5 border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 transition-colors text-sm"
                  >
                    Fermer
                  </button>
                  <button
                    onClick={() => setPhase('form')}
                    className="flex-1 px-5 py-2.5 bg-awac-primary text-white font-semibold rounded-xl hover:bg-awac-primaryDark transition-colors text-sm"
                  >
                    Réessayer
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {phase === 'thanks' ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeThanks()
          }}
        >
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl border border-green-500/30 shadow-2xl w-full max-w-sm p-8 text-center animate-slide-up">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
              <span className="material-icons text-4xl text-green-500">check_circle</span>
            </div>
            <h3 className="text-2xl font-heading font-black text-gray-900 mb-2">
              Merci pour votre vote !
            </h3>
            <p className="text-sm text-gray-600 mb-4 text-justify sm:text-center">
              Votre paiement est confirmé. Chaque voix compte pour pousser votre candidat favori
              vers la victoire !
            </p>
            {receiptCode ? (
              <Link
                to="/recu/$code"
                params={{ code: receiptCode }}
                className="inline-block text-xs text-awac-accent font-semibold hover:underline mb-6"
              >
                Voir mon reçu →
              </Link>
            ) : null}
            <button
              onClick={closeThanks}
              className="px-6 py-2.5 bg-awac-primary text-white font-semibold rounded-xl hover:bg-awac-primaryDark transition-colors"
            >
              Continuer
            </button>
          </div>
        </div>
      ) : null}
    </>
  )
}
