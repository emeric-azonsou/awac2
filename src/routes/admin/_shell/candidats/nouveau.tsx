import { createFileRoute } from '@tanstack/react-router'
import { CandidateForm } from '../../../../components/admin/CandidateForm'

export const Route = createFileRoute('/admin/_shell/candidats/nouveau')({
  component: () => <CandidateForm candidate={null} />,
})
