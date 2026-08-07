import { useCallback, useEffect, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { voteService, type VoteReceipt } from '../../utils/voteService'
import { forgetPendingVote } from '../../utils/pendingVotes'
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard'
import { Footer } from '../../components/Footer'
import awacLogo from '../../assets/awac.png'
import './$code.css'

export const Route = createFileRoute('/recu/$code')({
  component: ReceiptDetail,
})

interface StatusContent {
  label: string
  icon: string
  badge: string
  explanation: string
}

const STATUS_CONTENT: Record<string, StatusContent> = {
  confirmed: {
    label: 'Vote comptabilisé',
    icon: 'check_circle',
    badge: 'bg-green-100 text-green-700',
    explanation:
      'Votre paiement est confirmé et vos voix ont été ajoutées au compteur du candidat.',
  },
  pending: {
    label: 'En attente de paiement',
    icon: 'hourglass_top',
    badge: 'bg-amber-100 text-amber-700',
    explanation:
      "Le paiement n'a pas encore été confirmé par votre opérateur. Si vous avez payé, ce reçu se mettra à jour automatiquement.",
  },
  rejected: {
    label: 'Paiement refusé',
    icon: 'cancel',
    badge: 'bg-red-100 text-red-600',
    explanation:
      "Le paiement a été refusé ou annulé : aucune voix n'a été comptée et aucun montant n'est dû.",
  },
}

const PENDING_STATUS = STATUS_CONTENT.pending as StatusContent

function ReceiptDetail() {
  const { code } = Route.useParams()
  const [receipt, setReceipt] = useState<VoteReceipt | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const { copied, copy } = useCopyToClipboard()

  const loadReceipt = useCallback(async () => {
    setLoading(true)
    setNotFound(false)
    try {
      const loaded = await voteService.getReceipt(code)
      setReceipt(loaded)
      if (loaded.payment_status !== 'pending') {
        forgetPendingVote(loaded.receipt_code)
      }
    } catch {
      setNotFound(true)
    } finally {
      setLoading(false)
    }
  }, [code])

  useEffect(() => {
    void loadReceipt()
  }, [loadReceipt])

  const status = STATUS_CONTENT[receipt?.payment_status ?? ''] ?? PENDING_STATUS
  const formattedAmount = new Intl.NumberFormat('fr-FR').format(receipt?.amount ?? 0)
  const formattedDate = receipt?.created_at
    ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'short' }).format(
        new Date(receipt.created_at),
      )
    : ''

  return (
    <div className="min-h-screen bg-[#F9F8F6] selection:bg-awac-primary/10">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="container mx-auto px-6 max-w-6xl h-16 flex items-center justify-between gap-4">
          <Link
            to="/"
            className="flex items-center gap-2 shrink-0"
            aria-label="Retour à l'accueil AWAC"
          >
            <img
              src={awacLogo}
              alt="AWAC — Awards des Couturier·e·s du Mono"
              className="h-9 w-auto"
            />
          </Link>
          <Link
            to="/"
            hash="candidats"
            className="flex items-center gap-1.5 text-gray-500 hover:text-awac-primary font-sans font-semibold text-xs uppercase tracking-wider transition-colors"
          >
            <span className="material-icons text-base">arrow_back</span>
            Tous les candidats
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-6 max-w-lg py-16 md:py-24">
        {loading ? (
          <div className="flex justify-center py-24">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-awac-primary border-t-transparent" />
          </div>
        ) : notFound ? (
          <div className="text-center space-y-6 py-12">
            <span className="material-icons text-6xl text-gray-300">receipt_long</span>
            <h1 className="text-gray-900 font-heading font-black text-2xl uppercase tracking-tight">
              Reçu introuvable
            </h1>
            <p className="text-gray-500 font-sans text-sm">
              Vérifiez le code : il ressemble à <span className="font-mono">AWAC-…-XXXXXXXX</span>.
            </p>
          </div>
        ) : receipt ? (
          <div className="bg-white border border-gray-200 rounded-[2.5rem_0_2.5rem_0] shadow-sm overflow-hidden">
            <div className="px-8 pt-8 pb-6 space-y-4 text-center">
              <span
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-heading font-black uppercase tracking-widest ${status.badge}`}
              >
                <span className="material-icons text-base" aria-hidden="true">
                  {status.icon}
                </span>
                {status.label}
              </span>

              <h1 className="text-gray-900 font-heading font-black text-2xl uppercase tracking-tight">
                Reçu de vote
              </h1>

              <p className="text-gray-500 font-sans text-sm">{status.explanation}</p>
            </div>

            <div className="h-[1px] bg-gray-100 mx-8" />

            {receipt.votes_before !== null && receipt.votes_after !== null ? (
              <div className="votes-impact mx-8 mt-6 rounded-2xl px-6 py-4 flex items-center justify-between gap-4">
                <div className="text-center space-y-0.5">
                  <p className="text-[10px] font-heading font-black tracking-widest uppercase text-gray-500">
                    Avant
                  </p>
                  <p className="font-heading font-black text-2xl text-gray-900 tabular-nums">
                    {receipt.votes_before}
                  </p>
                </div>

                <div className="flex items-center gap-2 text-awac-primary">
                  <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 font-heading font-black text-sm shadow-sm tabular-nums">
                    +{receipt.quantity}
                    <span className="material-icons text-base" aria-hidden="true">
                      trending_up
                    </span>
                  </span>
                </div>

                <div className="text-center space-y-0.5">
                  <p className="text-[10px] font-heading font-black tracking-widest uppercase text-gray-500">
                    Après
                  </p>
                  <p className="font-heading font-black text-2xl text-awac-accent tabular-nums">
                    {receipt.votes_after}
                  </p>
                </div>
              </div>
            ) : null}

            <dl className="px-8 py-6 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Candidat·e</dt>
                <dd className="text-gray-900 font-semibold text-right">{receipt.candidate_name}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Nombre de voix</dt>
                <dd className="text-gray-900 font-semibold">{receipt.quantity}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Montant</dt>
                <dd className="text-gray-900 font-semibold">
                  {formattedAmount} {receipt.currency === 'XOF' ? 'FCFA' : receipt.currency}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Date</dt>
                <dd className="text-gray-900 font-semibold">{formattedDate}</dd>
              </div>
              <div className="flex justify-between gap-4 items-baseline">
                <dt className="text-gray-500 shrink-0">Code reçu</dt>
                <dd className="flex items-baseline gap-2 min-w-0">
                  <span className="font-mono text-xs font-bold text-gray-900 break-all text-right">
                    {receipt.receipt_code}
                  </span>
                  <button
                    type="button"
                    className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-[11px] font-semibold text-gray-600 hover:border-awac-primary hover:text-awac-primary transition-colors active:scale-95"
                    aria-label={copied ? 'Code copié' : 'Copier le code reçu'}
                    onClick={() => void copy(receipt.receipt_code)}
                  >
                    <span className="material-icons text-sm" aria-hidden="true">
                      {copied ? 'check' : 'content_copy'}
                    </span>
                    {copied ? 'Copié' : 'Copier'}
                  </button>
                </dd>
              </div>
            </dl>

            {receipt.payment_status === 'pending' ? (
              <div className="px-8 pb-8">
                <button
                  onClick={() => void loadReceipt()}
                  className="w-full flex items-center justify-center gap-2 border border-gray-200 text-gray-700 font-heading font-black text-[11px] tracking-widest uppercase py-3 rounded-xl transition-all duration-300 hover:border-awac-primary hover:text-awac-primary active:scale-[0.98]"
                >
                  <span className="material-icons text-base">refresh</span>
                  Actualiser le statut
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </main>

      <Footer />
    </div>
  )
}
