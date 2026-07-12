Stores folder convention (Pinia)

- Use Pinia for application state: create one store per domain (auth, candidates, forms, votes, ui).
- Files: src/stores/auth.js, src/stores/candidates.js, etc.
- Do not implement stores that depend on DB until Supabase schema and services exist.
