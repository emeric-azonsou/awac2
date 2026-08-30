import { createFileRoute } from '@tanstack/react-router'
import './a-propos.css'

export const Route = createFileRoute('/a-propos')({
  component: APropos,
})

// Reste du scaffold Vue d'origine, porté tel quel : cette page n'a jamais reçu
// de contenu réel.
function APropos() {
  return (
    <div className="about">
      <h1>This is an about page</h1>
    </div>
  )
}
