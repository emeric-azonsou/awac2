import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return <p className="p-8 font-heading">Socle TanStack Start opérationnel.</p>
}
