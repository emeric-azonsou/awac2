import { useEffect, useState, type FormEvent } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { listPendingVotes, type PendingVoteEntry } from '../../utils/pendingVotes'
import { Footer } from '../../components/Footer'
import awacLogo from '../../assets/awac.png'

export const Route = createFileRoute('/recu/')({
  component: ReceiptLookup,
})

function ReceiptLookup() {
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [recentVotes, setRecentVotes] = useState<PendingVoteEntry[]>([])

  // localStorage n'existe pas côté serveur : lecture après montage, comme la
  // version Vue le faisait dans onMounted.
  useEffect(() => {
    setRecentVotes(listPendingVotes())
  }, [])

  const openReceipt = (event: FormEvent) => {
    event.preventDefault()
    const normalized = code.trim().toUpperCase()
    if (!normalized.startsWith('AWAC-') || normalized.length < 15) {
      setErrorMessage('Le code ressemble à AWAC-…-XXXXXXXX, vérifiez votre saisie.')
      return
    }
    setErrorMessage('')
    void navigate({ to: '/recu/$code', params: { code: normalized } })
  }

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

      <main className="container mx-auto px-6 max-w-lg py-16 md:py-24 space-y-10">
        <div className="text-center space-y-4">
          <h1 className="text-gray-900 font-heading font-black text-3xl md:text-4xl tracking-tight uppercase leading-none">
            Vérifier mon vote
          </h1>
          <p className="text-gray-500 font-sans text-sm md:text-base">
            Saisissez le code reçu affiché lors de votre vote pour vérifier qu&apos;il a bien été
            comptabilisé.
          </p>
        </div>

        <form
          className="bg-white border border-gray-200 rounded-[2.5rem_0_2.5rem_0] shadow-sm p-8 space-y-4"
          onSubmit={openReceipt}
        >
          <label
            htmlFor="receipt-code"
            className="block text-xs font-semibold text-gray-500 uppercase tracking-wider"
          >
            Code reçu
          </label>
          <input
            id="receipt-code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            type="text"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="AWAC-0000000000000-XXXXXXXX"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-awac-primary focus:ring-2 focus:ring-awac-primary/20 outline-none transition-all font-mono text-sm"
          />
          {errorMessage ? <p className="text-sm text-red-500">{errorMessage}</p> : null}
          <button type="submit" className="btn-awac w-full text-[11px] py-3.5">
            <span className="material-icons text-base">receipt_long</span>
            Voir mon reçu
          </button>
        </form>

        {recentVotes.length > 0 ? (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">
              Vos votes récents sur cet appareil
            </p>
            {recentVotes.map((vote) => (
              <Link
                key={vote.receipt_code}
                to="/recu/$code"
                params={{ code: vote.receipt_code }}
                className="flex items-center justify-between gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3 hover:border-awac-primary transition-colors group"
              >
                <div className="min-w-0">
                  <p className="text-sm text-gray-900 font-semibold">{vote.candidate_name}</p>
                  <p className="font-mono text-[11px] text-gray-500 break-all">
                    {vote.receipt_code}
                  </p>
                </div>
                <span
                  className="material-icons text-gray-300 group-hover:text-awac-primary transition-colors shrink-0"
                  aria-hidden="true"
                >
                  chevron_right
                </span>
              </Link>
            ))}
          </div>
        ) : null}
      </main>

      <Footer />
    </div>
  )
}
