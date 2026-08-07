import { createFileRoute } from '@tanstack/react-router'
import { Navbar } from '../components/Navbar'
import { Hero } from '../components/Hero'
import { Works } from '../components/Works'
import { Vote } from '../components/Vote'
import { Prix } from '../components/Prix'
import { Footer } from '../components/Footer'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return (
    <>
      <Navbar />
      <Hero />
      <Works />
      <Vote />
      <Prix />
      <Footer />
    </>
  )
}
