import { useEffect, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { voteService, type Candidate } from '../utils/voteService'
import { useVotePricing } from '../hooks/useVotePricing'
import { MIN_VOTE_QUANTITY, clampVoteQuantity } from '../utils/voteQuantity'
import { CATEGORIES, filterByCategory } from '../utils/candidateCategories'
import { VoteQuantityStepper } from './VoteQuantityStepper'
import { CandidateShareCompact } from './CandidateShareCompact'
import { VoteModal, type VotedResult } from './VoteModal'
import defaultPhoto from '../assets/candidat/candidat.jpg'
import './Vote.css'

const formatBadgeNumber = (index: number) => String(index + 1).padStart(2, '0')

function formatVotes(count: number): string {
  const value = Number(count) || 0
  if (value >= 10000) return `${Math.round(value / 1000)}k`
  if (value >= 1000) return `${(value / 1000).toFixed(1).replace('.', ',').replace(',0', '')}k`
  return String(value)
}

function rankClass(index: number): string {
  if (index === 0) return 'card-first'
  if (index === 1) return 'card-second'
  if (index === 2) return 'card-third'
  return 'card-other'
}

const FIRST_CATEGORY = CATEGORIES[0]?.key ?? ''

export function Vote() {
  const sectionRef = useRef<HTMLElement | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [candidats, setCandidats] = useState<Candidate[]>([])
  const [activeCategory, setActiveCategory] = useState(FIRST_CATEGORY)
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null)
  const [voteQuantities, setVoteQuantities] = useState<Record<string, number>>({})
  const { unitPrice, currency, loadVotePricing } = useVotePricing()

  const displayedCandidats = filterByCategory(candidats, activeCategory)
  const categoryCount = (key: string) => filterByCategory(candidats, key).length

  const getQuantity = (candidateId: string) => voteQuantities[candidateId] ?? MIN_VOTE_QUANTITY
  const setQuantity = (candidateId: string, value: number) => {
    setVoteQuantities((current) => ({ ...current, [candidateId]: clampVoteQuantity(value) }))
  }

  useEffect(() => {
    const loadCandidates = async () => {
      setLoading(true)
      setError('')
      try {
        setCandidats(await voteService.getCandidates())
      } catch (err) {
        console.error('Erreur chargement candidats:', err)
        setError('Impossible de charger les candidats.')
      } finally {
        setLoading(false)
      }
    }
    void loadCandidates()
    void loadVotePricing()
  }, [loadVotePricing])

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsVisible(true)
          observer.unobserve(entry.target)
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' },
    )
    observer.observe(section)
    return () => observer.disconnect()
  }, [])

  // Après un vote confirmé, le compteur du candidat est mis à jour et la
  // grille reclassée. La version Vue mutait l'objet puis triait en place ;
  // ici on produit un nouveau tableau, comme React l'exige.
  const onVoted = (result: VotedResult) => {
    const candidateId = selectedCandidate?.id
    if (!candidateId) return
    setCandidats((current) =>
      current
        .map((candidate) =>
          candidate.id === candidateId
            ? { ...candidate, vote_count: result.votes_after }
            : candidate,
        )
        .sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0)),
    )
  }

  const revealed = isVisible ? 'opacity-100 translate-y-0' : ''

  return (
    <section
      id="candidats"
      ref={sectionRef}
      className="awac-vote bg-[#F9F8F6] py-24 md:py-32 border-t border-gray-100 selection:bg-awac-primary/10"
    >
      <div className="container mx-auto px-6 max-w-6xl">
        <div className="text-center max-w-xl mx-auto mb-10 space-y-4">
          <h2
            className={`text-gray-900 font-heading font-black text-4xl md:text-5xl tracking-tight uppercase leading-none opacity-0 translate-y-8 transition-all duration-700 ease-out ${revealed}`}
          >
            Qui va gagner les awards ?
          </h2>

          <p
            className={`text-gray-500 font-sans text-sm md:text-base font-medium opacity-0 translate-y-8 transition-all duration-700 ease-out delay-150 ${revealed}`}
          >
            Découvrez les créateurs du Mono et propulsez votre favori en tête.
          </p>
        </div>

        <div className="flex justify-center gap-3 mb-14" role="group" aria-label="Choisir la catégorie">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              type="button"
              className={`category-tab ${activeCategory === cat.key ? 'category-tab-active' : ''}`}
              aria-pressed={activeCategory === cat.key}
              onClick={() => setActiveCategory(cat.key)}
            >
              {cat.label}
              <span className="tabular-nums opacity-70">· {categoryCount(cat.key)}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-awac-primary border-t-transparent" />
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-500">{error}</div>
        ) : displayedCandidats.length === 0 ? (
          <div className="text-center py-12 text-gray-400">Aucun candidat pour le moment.</div>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 max-w-5xl mx-auto">
          {displayedCandidats.map((candidat, index) => (
            <div
              key={candidat.id}
              className={`flex flex-col group relative bg-white border rounded-[2.5rem_0_2.5rem_0] overflow-hidden transition-all duration-500 hover:-translate-y-1 ${
                isVisible ? 'card-visible' : ''
              } ${rankClass(index)}`}
              style={{ transitionDelay: isVisible ? `${0.1 + index * 0.08}s` : '0s' }}
            >
              <Link
                to="/candidat/$id"
                params={{ id: candidat.id }}
                className="relative block w-full h-[280px] overflow-hidden bg-gradient-to-b from-[#FBF7F4] via-[#F6EFEA] to-[#EFE6DF]"
                aria-label={`Voir les réalisations de ${candidat.full_name}`}
              >
                <img
                  src={candidat.profile_photo_url || defaultPhoto}
                  alt={candidat.full_name}
                  className="w-full h-full object-cover object-top transition-transform duration-700"
                  onError={(event) => {
                    event.currentTarget.src = defaultPhoto
                  }}
                />

                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white via-white/70 to-transparent" />

                <div
                  className={`absolute top-4 left-4 z-20 bg-black/40 backdrop-blur-md border border-white/20 text-white font-heading font-black text-[10px] tracking-widest px-3 py-1.5 rounded-full shadow-sm rank-badge ${
                    isVisible ? 'rank-visible' : ''
                  }`}
                  style={{ transitionDelay: isVisible ? `${0.3 + index * 0.08}s` : '0s' }}
                >
                  N<sup>o</sup> {formatBadgeNumber(index)}
                </div>
              </Link>

              <div className="p-5 space-y-4 bg-white relative">
                <div className="flex justify-between items-end">
                  <div className="space-y-0.5">
                    <h3 className="text-gray-900 font-heading font-black text-lg uppercase tracking-wide">
                      <Link
                        to="/candidat/$id"
                        params={{ id: candidat.id }}
                        className="hover:text-awac-primary transition-colors duration-300"
                      >
                        {candidat.full_name}
                      </Link>
                    </h3>

                    <p className="text-gray-500 font-sans font-medium text-xs tracking-wider uppercase">
                      votes obtenus
                    </p>
                  </div>

                  <div
                    className="rank-medallion shrink-0 grid place-items-center w-14 h-14 rounded-full font-heading font-black text-base leading-none ring-1 ring-black/5 select-none px-1"
                    aria-label={`${candidat.vote_count || 0} votes obtenus`}
                  >
                    {formatVotes(candidat.vote_count || 0)}
                  </div>
                </div>

                <div className="h-[1px] w-full bg-gray-100" />

                <VoteQuantityStepper
                  value={getQuantity(candidat.id)}
                  unitPrice={unitPrice}
                  currency={currency}
                  candidateName={candidat.full_name}
                  onChange={(value) => setQuantity(candidat.id, value)}
                />

                <div className="flex flex-col gap-3 w-full">
                  <Link
                    to="/candidat/$id"
                    params={{ id: candidat.id }}
                    className="w-full border border-gray-200 text-gray-700 font-heading font-bold text-[11px] tracking-widest uppercase py-3 rounded-xl transition-all duration-300 hover:border-awac-primary hover:text-awac-primary flex items-center justify-center gap-2 px-4 active:scale-[0.98]"
                  >
                    <span className="material-icons text-base shrink-0">photo_library</span>
                    <span className="font-heading font-black tracking-wider">
                      Voir ses réalisations
                    </span>
                  </Link>

                  <CandidateShareCompact candidate={candidat} />

                  <button
                    onClick={() => setSelectedCandidate(candidat)}
                    className="btn-awac w-full text-[11px] py-3.5 px-4"
                  >
                    <span className="material-icons text-base shrink-0">how_to_vote</span>
                    <span className="font-heading font-black tracking-wider">VOTER</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <VoteModal
        candidate={selectedCandidate}
        initialQuantity={selectedCandidate ? getQuantity(selectedCandidate.id) : MIN_VOTE_QUANTITY}
        unitPrice={unitPrice}
        currency={currency}
        onClose={() => setSelectedCandidate(null)}
        onVoted={onVoted}
      />
    </section>
  )
}
