<template>
  <footer
    class="bg-[#0B0B0B] text-white pt-20 pb-10 relative overflow-hidden selection:bg-awac-primary/20"
  >
    <div class="absolute inset-0 pointer-events-none z-0 opacity-10">
      <div
        class="absolute bottom-[-20%] left-[-10%] w-[30rem] h-[30rem] rounded-full bg-gradient-to-tr from-awac-primary to-transparent filter blur-3xl"
      ></div>
    </div>

    <div
      class="container mx-auto px-6 max-w-5xl relative z-10 flex flex-col items-center text-center space-y-12"
    >
      <div class="space-y-4 max-w-md">
        <h3 class="font-heading font-black text-xl md:text-2xl uppercase tracking-wider">
          Un doute sur un paiement ?
        </h3>

        <p class="text-gray-400 font-sans text-xs md:text-sm leading-relaxed">
          Notre équipe est disponible instantanément pour vérifier vos votes et vous accompagner.
        </p>

        <div class="pt-2">
          <a
            href="https://wa.me"
            target="_blank"
            class="inline-flex items-center justify-center gap-3 bg-[#25D366] hover:bg-[#20BA5A] text-white font-sans font-bold text-xs tracking-widest uppercase py-4 px-8 rounded-xl shadow-lg transition-all duration-300 transform hover:-translate-y-0.5"
          >
            <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path
                d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.713-1.457L0 24zm6.59-4.846c1.66.986 3.288 1.498 4.757 1.499 5.49-.002 9.935-4.466 9.938-9.978.002-2.671-1.033-5.181-2.909-7.06C16.56 1.734 14.057.693 11.385.693c-5.496 0-9.94 4.463-9.943 9.974-.001 1.83.5 3.61 1.448 5.161l-.971 3.549 3.63-.952zm11.642-4.94c-.266-.134-1.577-.779-1.821-.867-.244-.088-.423-.134-.6.134-.177.266-.688.867-.843 1.045-.155.177-.311.2-.577.067-.266-.134-1.124-.415-2.143-1.323-.792-.707-1.328-1.581-1.484-1.847-.156-.266-.016-.41.117-.542.121-.12.266-.31.4-.466.135-.156.179-.266.266-.443.088-.178.044-.333-.022-.466-.067-.134-.6-1.445-.822-1.977-.217-.521-.437-.451-.6-.46-.15-.008-.322-.008-.493-.008-.171 0-.45.064-.686.32-.236.256-.902.881-.902 2.148 0 1.268.922 2.493 1.05 2.659.127.166 1.815 2.772 4.398 3.887.615.265 1.094.423 1.467.542.617.196 1.178.168 1.62.102.493-.074 1.577-.644 1.8-.1.233-.51.222-1.01.223-.134.001-.134-.077-.244-.155-.377z"
              />
            </svg>
            <span>Assistance WhatsApp Bénin</span>
          </a>
        </div>
      </div>

      <div class="flex flex-col items-center space-y-3 pt-4">
        <span class="text-[10px] text-gray-500 font-sans uppercase tracking-[0.3em] font-bold">
          Suivez l'événement
        </span>

        <div class="flex items-center gap-6">
          <a
            href="https://tiktok.com"
            target="_blank"
            class="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 transition-all duration-300 hover:text-white hover:border-awac-primary hover:bg-gradient-to-br hover:from-awac-primary/20 hover:to-transparent hover:-translate-y-1 shadow-xs"
          >
            <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path
                d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.02 1.59 4.17 1.02 1.12 2.44 1.8 3.96 1.95v3.91c-1.8-.02-3.5-.66-4.88-1.74-.08-.06-.15-.12-.24-.19v6.52c-.05 2.16-.83 4.29-2.29 5.86-1.57 1.68-3.86 2.58-6.15 2.44-2.28-.15-4.41-1.32-5.74-3.08-1.46-1.92-1.92-4.47-1.26-6.8 1.11-3.66 4.96-5.88 8.67-4.82.09.03.18.06.26.1v4.11a3.636 3.636 0 00-3.3 2.1c-.55 1.25-.43 2.74.34 3.86.8 1.1 2.18 1.68 3.52 1.48 1.34-.2 2.37-1.31 2.57-2.65.04-.26.05-.52.05-.79V.02z"
              />
            </svg>
          </a>

          <a
            href="https://instagram.com"
            target="_blank"
            class="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 transition-all duration-300 hover:text-white hover:border-awac-primary hover:bg-gradient-to-br hover:from-awac-primary/20 hover:to-transparent hover:-translate-y-1 shadow-xs"
          >
            <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path
                d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"
              />
            </svg>
          </a>

          <a
            href="https://facebook.com"
            target="_blank"
            class="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 transition-all duration-300 hover:text-white hover:border-awac-accent hover:bg-gradient-to-br hover:from-awac-accent/20 hover:to-transparent hover:-translate-y-1 shadow-xs"
          >
            <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path
                d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.06c-1.243 0-1.43.771-1.43 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"
              />
            </svg>
          </a>
        </div>
      </div>

      <div class="w-full h-0 border-t border-dashed border-white/10"></div>

      <div
        class="flex flex-col md:flex-row items-center justify-between gap-6 w-full text-gray-500 font-sans text-[11px] tracking-widest uppercase font-medium"
      >
        <div class="flex items-center gap-2">
          <span>Événement Officiel :</span>
          <span class="text-white opacity-40 font-black tracking-normal">AWAC-MONO</span>
        </div>

        <div>&copy; 2026 AWAC-MONO. Tous droits réservés.</div>
      </div>
    </div>
  </footer>
</template>
