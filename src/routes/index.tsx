import { createFileRoute } from '@tanstack/react-router'
import { UrgencyBanner } from '../components/UrgencyBanner'
import { Navbar } from '../components/Navbar'
import { Hero } from '../components/Hero'
import { Works } from '../components/Works'
import { FinalWarning } from '../components/FinalWarning'
import { Vote } from '../components/Vote'
import { Prix } from '../components/Prix'
import { Footer } from '../components/Footer'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return (
    <>
      <UrgencyBanner />
      <Navbar />
      <Hero />
      <Works />
      {/* L'avertissement précède immédiatement la grille : on lit la contrainte,
          puis on voit les candidats pour qui voter. */}
      <div className="bg-[#F9F8F6] pt-24 md:pt-32 px-6">
        <FinalWarning />
      </div>
      <Vote />
      <Prix />
      <Footer />
    </>
  )
}
