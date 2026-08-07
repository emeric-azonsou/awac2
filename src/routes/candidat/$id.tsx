import { useEffect, useState } from 'react'
import { createFileRoute, Link, useNavigate, useRouter } from '@tanstack/react-router'
import { voteService, type CandidateWithPhotos } from '../../utils/voteService'
import { ApiError } from '../../utils/api'
import { useVotePricing } from '../../hooks/useVotePricing'
import { MIN_VOTE_QUANTITY } from '../../utils/voteQuantity'
import { getFirstName, shouldAutoOpenVote, resolveSiteOrigin } from '../../utils/candidateShare'
import { getCategoryLabel } from '../../utils/candidateCategories'
import { VoteQuantityStepper } from '../../components/VoteQuantityStepper'
import { CandidateShareCompact } from '../../components/CandidateShareCompact'
import { VoteModal, type VotedResult } from '../../components/VoteModal'
import { Footer } from '../../components/Footer'
import awacLogo from '../../assets/awac.png'
import defaultPhoto from '../../assets/candidat/candidat.jpg'
import './$id.css'

interface LoaderResult {
  candidate: CandidateWithPhotos | null
  notFound: boolean
  failed: boolean
  siteOrigin: string
}

// Les robots sociaux exigent des URLs absolues pour og:image et og:url. head()
// est synchrone et n'a pas accès à la requête ; l'origine est donc résolue dans
// le loader, qui lui est asynchrone et s'exécute côté serveur.
async function currentSiteOrigin(): Promise<string> {
  const configured = import.meta.env.VITE_SITE_URL ?? ''
  if (!import.meta.env.SSR) return resolveSiteOrigin(configured, window.location.origin)
  const { getRequest } = await import('@tanstack/react-start/server')
  return resolveSiteOrigin(configured, new URL(getRequest().url).origin)
}

// Remplace useAsyncData : le chargement se fait côté serveur pour que les
// balises OpenGraph du partage soient présentes dans le HTML livré. Un fetch
// client les rendrait invisibles aux robots de WhatsApp et Facebook.
export const Route = createFileRoute('/candidat/$id')({
  loader: async ({ params }): Promise<LoaderResult> => {
    const siteOrigin = await currentSiteOrigin()
    try {
      const candidate = await voteService.getCandidate(params.id)
      return { candidate, notFound: false, failed: false, siteOrigin }
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        return { candidate: null, notFound: true, failed: false, siteOrigin }
      }
      console.error('Erreur chargement candidat:', err)
      return { candidate: null, notFound: false, failed: true, siteOrigin }
    }
  },
  head: ({ loaderData }) => {
    const candidate = loaderData?.candidate
    const siteOrigin = loaderData?.siteOrigin ?? ''
    const title = candidate ? `${candidate.full_name} — Awards des Couturier·e·s du Mono` : 'AWAC'
    const description = candidate
      ? `Vote pour ${candidate.full_name} et propulse ce talent vers la victoire aux Awards des Couturier·e·s du Mono.`
      : 'Awards des Couturier·e·s du Mono'
    const photo = candidate?.profile_photo_url
    const ogImage = !photo
      ? `${siteOrigin}/favicon-512.png`
      : photo.startsWith('http')
        ? photo
        : `${siteOrigin}${photo}`

    return {
      meta: [
        { title },
        { name: 'description', content: description },
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        { property: 'og:image', content: ogImage },
        ...(candidate
          ? [{ property: 'og:url', content: `${siteOrigin}/candidat/${candidate.id}` }]
          : []),
        { name: 'twitter:card', content: 'summary_large_image' },
      ],
    }
  },
  component: CandidatePage,
})

function CandidatePage() {
  const { candidate: loaded, notFound, failed } = Route.useLoaderData()
  const router = useRouter()
  const navigate = useNavigate()
  const [candidate, setCandidate] = useState(loaded)
  const [showVote, setShowVote] = useState(false)
  const [voteQuantity, setVoteQuantity] = useState(MIN_VOTE_QUANTITY)
  const { unitPrice, currency, loadVotePricing } = useVotePricing()

  useEffect(() => setCandidate(loaded), [loaded])

  useEffect(() => {
    void loadVotePricing()
    const query = Object.fromEntries(new URLSearchParams(window.location.search))
    if (shouldAutoOpenVote(query)) {
      if (loaded) setShowVote(true)
      // Le paramètre `vote` est retiré de l'URL après ouverture, pour qu'un
      // rechargement ne rouvre pas la modale.
      const { vote: _vote, ...rest } = query
      void navigate({
        to: '/candidat/$id',
        params: { id: loaded?.id ?? '' },
        search: rest,
        replace: true,
      })
    }
  }, [loaded, loadVotePricing, navigate])

  const firstName = getFirstName(candidate?.full_name ?? '')
  const categoryLabel = getCategoryLabel(candidate?.category)

  const onVoted = (result: VotedResult) => {
    setCandidate((current) => (current ? { ...current, vote_count: result.votes_after } : current))
  }

  return (
    <div className="awac-candidat min-h-screen bg-[#F9F8F6] selection:bg-awac-primary/10">
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
            className="hidden sm:flex items-center gap-1.5 text-gray-500 hover:text-awac-primary font-sans font-semibold text-xs uppercase tracking-wider transition-colors"
          >
            <span className="material-icons text-base">arrow_back</span>
            Tous les candidats
          </Link>

          {candidate ? (
            <button onClick={() => setShowVote(true)} className="btn-awac text-[11px] py-2.5 px-5">
              <span className="material-icons text-base">how_to_vote</span>
              Voter
            </button>
          ) : null}
        </div>
      </header>

      {notFound ? (
        <div className="container mx-auto px-6 max-w-xl text-center py-32 space-y-6">
          <span className="material-icons text-6xl text-gray-300">person_search</span>
          <h1 className="text-gray-900 font-heading font-black text-3xl uppercase tracking-tight">
            Candidat introuvable
          </h1>
          <p className="text-gray-500 font-sans text-sm">
            Ce profil n&apos;existe pas ou n&apos;est plus en compétition.
          </p>
          <Link
            to="/"
            hash="candidats"
            className="inline-flex items-center gap-2 px-6 py-3 bg-awac-primary text-white font-heading font-black text-[11px] tracking-widest uppercase rounded-xl hover:bg-awac-primaryDark transition-colors"
          >
            <span className="material-icons text-base">arrow_back</span>
            Voir tous les candidats
          </Link>
        </div>
      ) : failed ? (
        <div className="container mx-auto px-6 max-w-xl text-center py-32 space-y-6">
          <span className="material-icons text-6xl text-gray-300">wifi_off</span>
          <p className="text-gray-500 font-sans text-sm">
            Impossible de charger ce profil. Vérifiez votre connexion.
          </p>
          <button
            onClick={() => void router.invalidate()}
            className="inline-flex items-center gap-2 px-6 py-3 bg-awac-primary text-white font-heading font-black text-[11px] tracking-widest uppercase rounded-xl hover:bg-awac-primaryDark transition-colors"
          >
            <span className="material-icons text-base">refresh</span>
            Réessayer
          </button>
        </div>
      ) : candidate ? (
        <main>
          <section className="container mx-auto px-6 max-w-6xl pt-12 md:pt-20 pb-16">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-16 items-end">
              <div className="md:col-span-5 profile-reveal">
                <div className="relative w-full max-w-sm mx-auto md:mx-0 h-[420px] overflow-hidden bg-gray-100 rounded-[2.5rem_0_2.5rem_0] border border-gray-200">
                  <img
                    src={candidate.profile_photo_url || defaultPhoto}
                    alt={`Portrait de ${candidate.full_name}`}
                    className="w-full h-full object-cover object-top"
                    onError={(event) => {
                      event.currentTarget.src = defaultPhoto
                    }}
                  />
                </div>
              </div>

              <div className="md:col-span-7 space-y-5 text-center md:text-left profile-reveal profile-reveal-delayed">
                <h1
                  className="text-gray-900 font-heading font-black text-4xl md:text-6xl tracking-tight uppercase leading-none"
                  style={{ textWrap: 'balance' }}
                >
                  {candidate.full_name}
                </h1>

                {candidate.atelier || candidate.commune || categoryLabel ? (
                  <p className="text-gray-500 font-sans font-medium text-sm md:text-base tracking-wider uppercase">
                    {candidate.atelier ? (
                      <span className="text-gray-900 font-semibold">{candidate.atelier}</span>
                    ) : null}
                    {candidate.atelier && candidate.commune ? <span> · </span> : null}
                    {candidate.commune ? <span>{candidate.commune}</span> : null}
                    {(candidate.atelier || candidate.commune) && categoryLabel ? (
                      <span> · </span>
                    ) : null}
                    {categoryLabel ? <span>Catégorie {categoryLabel}</span> : null}
                  </p>
                ) : null}

                <div className="flex items-center justify-center md:justify-start gap-3">
                  <span className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-full px-5 py-2.5 shadow-sm">
                    <span className="material-icons text-awac-primary text-lg">how_to_vote</span>
                    <span className="font-heading font-black text-2xl text-gray-900">
                      {candidate.vote_count}
                    </span>
                    <span className="text-gray-500 font-sans font-medium text-xs tracking-wider uppercase">
                      votes
                    </span>
                  </span>
                </div>

                <p className="text-gray-500 font-sans text-sm md:text-base leading-relaxed max-w-md mx-auto md:mx-0">
                  Chaque vote de 100 F rapproche {firstName} de la victoire aux Awards des
                  Couturier·e·s du Mono.
                </p>

                <div className="max-w-xs mx-auto md:mx-0">
                  <VoteQuantityStepper
                    value={voteQuantity}
                    unitPrice={unitPrice}
                    currency={currency}
                    candidateName={candidate.full_name}
                    onChange={setVoteQuantity}
                  />
                </div>

                <button onClick={() => setShowVote(true)} className="btn-awac text-xs py-4 px-8">
                  <span className="material-icons text-lg">how_to_vote</span>
                  Voter pour {firstName}
                </button>

                <div className="md:justify-start">
                  <CandidateShareCompact candidate={candidate} />
                </div>
              </div>
            </div>
          </section>

          <section className="border-t border-gray-100 bg-white">
            <div className="container mx-auto px-6 max-w-6xl py-16 md:py-24">
              <h2 className="text-gray-900 font-heading font-black text-3xl md:text-4xl tracking-tight uppercase leading-none mb-12">
                Ses réalisations
              </h2>

              {candidate.photos.length === 0 ? (
                <div className="text-center py-16 space-y-4">
                  <span className="material-icons text-5xl text-gray-200">checkroom</span>
                  <p className="text-gray-500 font-sans text-sm">
                    Les créations de {firstName} arrivent bientôt. Vous pouvez déjà voter pour
                    soutenir {firstName} !
                  </p>
                </div>
              ) : (
                <div className="space-y-10">
                  {candidate.photos[0] ? (
                    <figure className="gallery-item">
                      <div className="w-full max-h-[70vh] overflow-hidden rounded-[2.5rem_0_2.5rem_0] bg-gray-100">
                        <img
                          src={candidate.photos[0].photo_url}
                          alt={
                            candidate.photos[0].caption || `Réalisation de ${candidate.full_name}`
                          }
                          className="w-full h-full object-cover"
                          loading="eager"
                        />
                      </div>
                      {candidate.photos[0].caption ? (
                        <figcaption className="mt-3 text-gray-500 font-sans text-sm">
                          {candidate.photos[0].caption}
                        </figcaption>
                      ) : null}
                    </figure>
                  ) : null}

                  {candidate.photos.length > 1 ? (
                    <div
                      className="grid gap-8"
                      style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}
                    >
                      {candidate.photos.slice(1).map((photo) => (
                        <figure key={photo.id} className="gallery-item">
                          <div className="w-full h-[380px] overflow-hidden rounded-2xl bg-gray-100">
                            <img
                              src={photo.photo_url}
                              alt={photo.caption || `Réalisation de ${candidate.full_name}`}
                              className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                              loading="lazy"
                            />
                          </div>
                          {photo.caption ? (
                            <figcaption className="mt-3 text-gray-500 font-sans text-sm">
                              {photo.caption}
                            </figcaption>
                          ) : null}
                        </figure>
                      ))}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </section>

          <section className="bg-awac-dark py-16 md:py-20">
            <div className="container mx-auto px-6 max-w-3xl text-center space-y-6">
              <h2
                className="text-white font-heading font-black text-3xl md:text-4xl tracking-tight uppercase leading-none"
                style={{ textWrap: 'balance' }}
              >
                Propulsez {firstName} vers la victoire
              </h2>
              <button onClick={() => setShowVote(true)} className="btn-awac text-xs px-8 py-4">
                <span className="material-icons text-lg">how_to_vote</span>
                Voter pour {firstName}
              </button>
            </div>
          </section>

          <div className="sm:hidden fixed bottom-0 inset-x-0 z-30 p-4 bg-gradient-to-t from-white via-white/95 to-transparent pointer-events-none">
            <button
              onClick={() => setShowVote(true)}
              className="btn-awac w-full py-3.5 text-[11px] pointer-events-auto"
            >
              <span className="material-icons text-base">how_to_vote</span>
              Voter pour {firstName} — {candidate.vote_count} votes
            </button>
          </div>

          <VoteModal
            candidate={showVote ? candidate : null}
            initialQuantity={voteQuantity}
            unitPrice={unitPrice}
            currency={currency}
            onClose={() => setShowVote(false)}
            onVoted={onVoted}
          />
        </main>
      ) : null}

      <Footer />
    </div>
  )
}
