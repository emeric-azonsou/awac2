import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { voteService } from '../utils/voteService'
import { listPendingVotes, forgetPendingVote } from '../utils/pendingVotes'
import './VoteReminderBanner.css'

interface ConfirmedVote {
  receipt_code: string
  candidate_name: string
}

export function VoteReminderBanner() {
  const [confirmedVotes, setConfirmedVotes] = useState<ConfirmedVote[]>([])

  // Au montage, on interroge le statut des votes mémorisés sur cet appareil :
  // ceux qui sont confirmés donnent une bannière, ceux qui sont confirmés ou
  // rejetés sont oubliés du stockage local.
  useEffect(() => {
    let cancelled = false

    const checkPendingVotes = async () => {
      for (const pending of listPendingVotes()) {
        try {
          const receipt = await voteService.getReceipt(pending.receipt_code)
          if (cancelled) return
          if (receipt.payment_status === 'confirmed') {
            setConfirmedVotes((current) => [
              ...current,
              { receipt_code: receipt.receipt_code, candidate_name: receipt.candidate_name },
            ])
            forgetPendingVote(pending.receipt_code)
          } else if (receipt.payment_status === 'rejected') {
            forgetPendingVote(pending.receipt_code)
          }
        } catch {
          // Reçu injoignable : on laisse le vote en attente pour un prochain essai.
        }
      }
    }

    void checkPendingVotes()
    return () => {
      cancelled = true
    }
  }, [])

  const dismiss = (code: string) => {
    setConfirmedVotes((current) => current.filter((vote) => vote.receipt_code !== code))
  }

  if (confirmedVotes.length === 0) return null

  return (
    <div
      className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:right-6 sm:max-w-sm z-40 space-y-2"
      role="status"
    >
      {confirmedVotes.map((vote) => (
        <div
          key={vote.receipt_code}
          className="banner-enter flex items-start gap-3 bg-white border border-green-500/30 rounded-2xl shadow-xl px-4 py-3"
        >
          <span className="material-icons text-green-500 shrink-0" aria-hidden="true">
            check_circle
          </span>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-sm text-gray-900 font-semibold">
              Votre vote pour {vote.candidate_name} a bien été comptabilisé !
            </p>
            <Link
              to="/recu/$code"
              params={{ code: vote.receipt_code }}
              className="inline-block text-xs text-awac-primary font-semibold hover:underline"
            >
              Voir mon reçu →
            </Link>
          </div>
          <button
            className="p-1 rounded-lg hover:bg-gray-100 transition-colors shrink-0"
            aria-label="Fermer la notification"
            onClick={() => dismiss(vote.receipt_code)}
          >
            <span className="material-icons text-base text-gray-400" aria-hidden="true">
              close
            </span>
          </button>
        </div>
      ))}
    </div>
  )
}
