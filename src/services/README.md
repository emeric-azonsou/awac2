Services convention

- All Supabase DB and Storage calls must go through service modules in src/services/. Example: src/services/supabaseService.js
- Components MUST NOT call Supabase directly.
- Wait for supabase/ migrations and RLS policies to be in place before implementing services.
