import { useState, type FormEvent } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { loginAdmin } from '../../hooks/useAdminProfile'
import { ApiError } from '../../utils/api'
import awacLogo from '../../assets/awac.png'

export const Route = createFileRoute('/admin/login')({
  component: AdminLogin,
})

const FIELD_CLASS =
  'w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-awac-primary focus:ring-2 focus:ring-awac-primary/20 outline-none transition-all text-sm'
const LABEL_CLASS = 'block text-xs font-semibold text-gray-500 uppercase tracking-wider'

function AdminLogin() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const submitLogin = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setErrorMessage('')
    try {
      await loginAdmin(email, password)
      void navigate({ to: '/admin' })
    } catch (error) {
      // Le 429 vient du limiteur de tentatives : distinguer les deux messages
      // évite de faire croire à un mot de passe faux après un blocage.
      const status = error instanceof ApiError ? error.status : undefined
      setErrorMessage(
        status === 429
          ? 'Trop de tentatives — réessayez dans quelques minutes.'
          : 'Identifiants invalides.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-awac-dark flex items-center justify-center px-6 selection:bg-awac-primary/20">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-3">
          <img src={awacLogo} alt="AWAC" className="h-16 w-auto mx-auto brightness-0 invert" />
          <h1 className="text-white font-heading font-black text-2xl tracking-tight uppercase">
            Espace admin
          </h1>
          <p className="text-white/50 font-sans text-sm">Awards des Couturier·e·s du Mono</p>
        </div>

        <form
          className="bg-white rounded-[2.5rem_0_2.5rem_0] shadow-2xl p-8 space-y-5"
          onSubmit={submitLogin}
        >
          <div className="space-y-1">
            <label htmlFor="admin-email" className={LABEL_CLASS}>
              Email
            </label>
            <input
              id="admin-email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              autoComplete="username"
              required
              className={FIELD_CLASS}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="admin-password" className={LABEL_CLASS}>
              Mot de passe
            </label>
            <input
              id="admin-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              autoComplete="current-password"
              required
              className={FIELD_CLASS}
            />
          </div>

          {errorMessage ? (
            <p className="text-sm text-red-500" role="alert">
              {errorMessage}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="btn-awac w-full text-[11px] py-3.5"
          >
            {submitting ? (
              <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
            ) : null}
            {submitting ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  )
}
