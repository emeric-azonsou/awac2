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
      {/* Popup déclenché au scroll : pas de wrapper de mise en page, la carte
          se positionne elle-même en overlay fixe une fois le seuil franchi. */}
      <FinalWarning />
      <Vote />
      <Prix />
      <Footer />
    </>
  )
}
