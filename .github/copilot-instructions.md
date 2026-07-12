# Copilot instructions for awac

This file helps Copilot sessions work effectively in this repository.

---

## Build, test, and lint commands

- Setup: `npm install`
- Dev server (hot reload): `npm run dev`
- Production build: `npm run build`
- Preview production build locally: `npm run preview`
- Code formatting: `npm run format` (Prettier; runs on `src/`)

Notes:
- No test runner or linter scripts are present in package.json as of this commit.
- Node engines declared: `^22.18.0 || >=24.12.0` (follow this for CI/runners).

---

## High-level architecture

- Framework: Vue 3 app built with Vite (vite.config.js).
- UI styling: Tailwind CSS (tailwind.config.js) with custom color palette under the `awac` key and custom font families.
- App entry: `src/main.js` mounts `App.vue` and uses the router.
- Routing: `src/router/index.js` is present but contains no declared routes (app currently composes components directly in `App.vue`).
- UI organization:
  - `src/components/` — reusable UI components (Navbar, Hero, Footer, Vote, Works, Prix, etc.)
  - `src/views/` — page-level view components (HomeView, AboutView)
  - `src/assets/` — images, CSS; `src/assets/main.css` includes Tailwind layers and a small set of component utility classes
- Vite alias: `@` → `./src` (configured in vite.config.js).
- Notable dependencies (listed in package.json): `@supabase/supabase-js`, `@vueuse/core`, `gsap`, `vue-router`. They may be present for future features but are not required to run the dev server.

---

## Key conventions and repository-specific patterns

- File layout: follow `src/components/` for small, reusable pieces and `src/views/` for page-level views.
- Styling:
  - Tailwind base/components/utilities are used; `src/assets/main.css` defines global base styles and some component utility classes (`.btn-primary`, `.input-field`). Prefer using Tailwind utilities and these project classes.
  - Tailwind config exposes `awac` color tokens (use `bg-awac-primary`, `text-awac-dark`, etc.).
- Formatting: Prettier is the supported formatter via `npm run format` — run before commits/PRs.
- Entry points:
  - `index.html` bootstraps the app and is part of Vite build.
  - `App.vue` currently composes the site directly; router-view is present but routes are empty — adding new pages usually means adding a view and registering a route in `src/router/index.js`.
- Assets: import images from `src/assets` using relative paths or the `@` alias.

---

## Files integrated from repository docs

- Key commands and setup were taken from `README.md` and package.json scripts.

---

If you want Copilot to follow any extra project rules (naming, state management, strict typing choices, or to add test/lint scaffolding), add a short file (CONVENTIONS.md or CONTRIBUTING.md) and Copilot will integrate it.
