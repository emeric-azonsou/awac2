import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import awacLogo from '../assets/awac.png'
import './Navbar.css'

const NAV_LINK_CLASS =
  'text-gray-900 hover:text-awac-primary transition-colors duration-200 whitespace-nowrap relative group'
const UNDERLINE_CLASS =
  'absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-awac-primary to-awac-accent transition-all duration-300 group-hover:w-full'

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <nav
      className={`awac-navbar sticky top-0 z-50 backdrop-blur-md border-b border-white/20 shadow-[0_4px_30px_rgba(0,0,0,0.03)] transition-all duration-300 ${
        isScrolled ? 'bg-white/70 shadow-md' : 'bg-white/40'
      }`}
    >
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex justify-between items-center h-20 md:h-24 xl:h-22 relative">
          <div className="flex items-center flex-shrink-0">
            <a
              href="#accueil"
              className="transition-transform duration-200 hover:scale-105 block py-1"
            >
              <img
                src={awacLogo}
                alt="AWAC-MONO"
                className="h-24 md:h-28 xl:h-[12rem] w-auto max-w-[10rem] md:max-w-[14rem] xl:max-w-none object-contain object-left scale-110 origin-left"
              />
            </a>
          </div>

          <div className="hidden md:flex items-center space-x-4 lg:space-x-8 xl:space-x-10 font-sans text-[10px] lg:text-xs tracking-widest uppercase font-semibold">
            <a href="#concours" className={NAV_LINK_CLASS}>
              Le Concours
              <span className={UNDERLINE_CLASS} />
            </a>
            <a href="#comment-voter" className={NAV_LINK_CLASS}>
              Comment voter ?
              <span className={UNDERLINE_CLASS} />
            </a>
            <a href="#grand-prix" className={NAV_LINK_CLASS}>
              Le Grand Prix
              <span className={UNDERLINE_CLASS} />
            </a>
            <Link to="/recu" className={NAV_LINK_CLASS}>
              Vérifier mon vote
              <span className={UNDERLINE_CLASS} />
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/recu"
              className="md:hidden grid place-items-center w-11 h-11 rounded-md border border-gray-200 text-gray-700 hover:text-awac-primary hover:border-awac-primary transition-colors duration-200"
              aria-label="Vérifier mon vote"
            >
              <span className="material-icons text-xl">receipt_long</span>
            </Link>
            <a
              href="#candidats"
              className="btn-awac text-[10px] lg:text-xs py-3 px-4 lg:px-6 gap-2 lg:gap-3 rounded-md"
            >
              <span className="material-icons text-sm lg:text-base">how_to_vote</span>
              <span className="hidden xl:inline">VOTER RAPIDEMENT</span>
              <span className="xl:hidden">VOTER</span>
            </a>
          </div>
        </div>
      </div>
    </nav>
  )
}
