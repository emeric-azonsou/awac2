import { createFileRoute, Link, Outlet, redirect, useNavigate } from '@tanstack/react-router'
import { fetchAdminProfile, logoutAdmin } from '../../hooks/useAdminProfile'
import awacLogo from '../../assets/awac.png'
import './_shell.css'

// Route de layout sans segment d'URL : /admin, /admin/votes et /admin/candidats
// passent par ici, mais /admin/login reste en dehors et n'est donc jamais
// protégé — c'est exactement l'exemption que faisait le middleware Nuxt.
export const Route = createFileRoute('/admin/_shell')({
  beforeLoad: async () => {
    try {
      return { adminProfile: await fetchAdminProfile() }
    } catch {
      throw redirect({ to: '/admin/login' })
    }
  },
  component: AdminShell,
})

const MENU_ITEMS = [
  { to: '/admin', label: 'Dashboard', icon: 'dashboard' },
  { to: '/admin/candidats', label: 'Candidats', icon: 'groups' },
  { to: '/admin/votes', label: 'Votes', icon: 'how_to_vote' },
] as const

function AdminShell() {
  const { adminProfile } = Route.useRouteContext()
  const navigate = useNavigate()

  const logout = async () => {
    try {
      await logoutAdmin()
    } finally {
      void navigate({ to: '/admin/login' })
    }
  }

  return (
    <div className="min-h-screen bg-[#F9F8F6] flex selection:bg-awac-primary/10">
      <aside className="hidden md:flex w-60 shrink-0 flex-col bg-awac-dark text-white">
        <Link to="/" className="flex items-center gap-3 px-6 h-20 border-b border-white/10">
          <img src={awacLogo} alt="AWAC" className="h-10 w-auto brightness-0 invert" />
          <span className="font-heading font-black text-xs tracking-widest uppercase text-white/80">
            Admin
          </span>
        </Link>

        <nav className="flex-1 py-6 space-y-1 px-3" aria-label="Navigation admin">
          {MENU_ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === '/admin' }}
              activeProps={{ className: 'nav-active' }}
              className="nav-item flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-white/60 hover:text-white hover:bg-white/5 transition-colors"
            >
              <span className="material-icons text-xl" aria-hidden="true">
                {item.icon}
              </span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="px-6 py-5 border-t border-white/10 space-y-3">
          <p className="text-xs text-white/50 truncate">{adminProfile?.email}</p>
          <button
            className="flex items-center gap-2 text-xs font-semibold text-white/60 hover:text-white transition-colors"
            onClick={() => void logout()}
          >
            <span className="material-icons text-base" aria-hidden="true">
              logout
            </span>
            Se déconnecter
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="md:hidden sticky top-0 z-40 bg-awac-dark text-white h-16 flex items-center justify-between px-4">
          <Link to="/admin" className="font-heading font-black text-sm tracking-widest uppercase">
            AWAC Admin
          </Link>
          <div className="flex items-center gap-1">
            {MENU_ITEMS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.to === '/admin' }}
                activeProps={{ className: 'text-awac-primary' }}
                className="grid place-items-center w-11 h-11 rounded-lg text-white/60 hover:text-white"
                aria-label={item.label}
              >
                <span className="material-icons text-xl" aria-hidden="true">
                  {item.icon}
                </span>
              </Link>
            ))}
            <button
              className="grid place-items-center w-11 h-11 rounded-lg text-white/60 hover:text-white"
              aria-label="Se déconnecter"
              onClick={() => void logout()}
            >
              <span className="material-icons text-xl" aria-hidden="true">
                logout
              </span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-6 md:p-10">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
