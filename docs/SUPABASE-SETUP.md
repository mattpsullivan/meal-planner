# Pillar B — Supabase Backend Setup Runbook

Step-by-step to stand up the backend (accounts, per-person profiles, cross-device sync)
behind the static Pages frontend. Two audiences:

- **Matt (console steps)** — Parts 1, 3, 4, and the secrets in Part 5. Only you can do these
  (they create accounts and secrets). Do them once; hand the outputs to the implementing agent.
- **Implementing agent (code steps)** — Parts 2, 5, 6. Runs in the devcontainer / node:22.

Console UIs drift; if a menu label differs from what's written, follow the concept (the
provider settings, the credentials screen). Nothing here deploys the app.

> **What the agent needs from you to start:** (1) `Project URL`, (2) `anon`/publishable API key,
> (3) confirmation that Google is enabled as an auth provider, and (4) that the app URL is in the
> Supabase redirect allow-list. That's it — the anon key is public by design (RLS protects data).

---

## Part 1 — Create the Supabase project (Matt)

1. Sign in at <https://supabase.com> → **New project**.
2. Pick/create an org, name it (e.g. `meal-planner`), set a **database password** (save it in your
   password manager — you rarely need it but can't recover it), choose the closest **region**
   (e.g. US East). Create; provisioning takes ~2 minutes.
3. Grab the API details: **Project Settings → API**. Copy:
   - **Project URL** — `https://<project-ref>.supabase.co` (note the `<project-ref>`; you need it in Part 3).
   - **anon / publishable key** — the client-side key. Safe to ship in the frontend.
   - **Do NOT use** the `service_role` / secret key anywhere in the app — it bypasses RLS.

Free tier is plenty for a family of ~5.

---

## Part 2 — Database schema + RLS (agent)

Apply via the Supabase CLI (`supabase init` → `supabase migration new profiles` → paste →
`supabase db push`) or the dashboard **SQL Editor**. Keep the SQL in `supabase/migrations/` in
the repo so it's reproducible.

```sql
-- Households and per-person profiles.
create extension if not exists "pgcrypto";

create table household (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create type profile_role as enum ('adult', 'teen');

create table profile (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  household_id uuid not null references household (id) on delete cascade,
  name text not null,
  role profile_role not null default 'adult',
  birth_year int,
  sex text,
  activity_level text,
  calorie_target int,       -- nullable; teens stay null (awareness-only, no deficit)
  protein_g int,
  carb_g int,
  fat_g int,
  created_at timestamptz not null default now()
);

-- The household ids the current user belongs to. SECURITY DEFINER so it can read `profile`
-- without tripping the profile RLS policy that calls it (avoids infinite recursion).
create or replace function auth_household_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select household_id from profile where user_id = auth.uid();
$$;

alter table household enable row level security;
alter table profile   enable row level security;

-- household: members read/update theirs; any authenticated user may create one (bootstrapping).
create policy "household readable by members" on household
  for select to authenticated using (id in (select auth_household_ids()));
create policy "household updatable by members" on household
  for update to authenticated using (id in (select auth_household_ids()));
create policy "household insert by authenticated" on household
  for insert to authenticated with check (true);

-- profile: readable by anyone in the same household; you manage only your own row.
create policy "profiles readable within household" on profile
  for select to authenticated using (household_id in (select auth_household_ids()));
create policy "user inserts own profile" on profile
  for insert to authenticated with check (user_id = auth.uid());
create policy "user updates own profile" on profile
  for update to authenticated using (user_id = auth.uid());
```

**Bootstrapping flow** (in the app): a new user creates a `household` row, then inserts their own
`profile` (with `user_id = auth.uid()` and that `household_id`). Family members join by being added
to the same `household_id`. Later pillars (`food_log`, `plan_assignment`, `cook_session`) follow
the same RLS shape — scope by `auth_household_ids()`, and scope personal rows (logs) to
`user_id = auth.uid()`.

**Teens are awareness-only** (locked decision): leave `calorie_target` null for `role = 'teen'`
and never render a deficit goal for them.

---

## Part 3 — Google Cloud OAuth client (Matt)

1. <https://console.cloud.google.com> → create or select a project.
2. **APIs & Services → OAuth consent screen**: choose **External**. Fill app name + your support
   email. Scopes needed are just `email`, `profile`, `openid` (non-sensitive — no Google
   verification required). Add your family's Google accounts as **Test users** (or publish the app;
   with only non-sensitive scopes, publishing needs no review).
3. **APIs & Services → Credentials → Create credentials → OAuth client ID → Web application.**
   - **Authorized JavaScript origins:**
     - `https://mattpsullivan.github.io`
     - `http://localhost:5173` (Vite dev)
   - **Authorized redirect URIs** — this is the important one, and it points at **Supabase**, not
     your app:
     - `https://<project-ref>.supabase.co/auth/v1/callback`
       (use the `<project-ref>` from Part 1)
   - Create → copy the **Client ID** and **Client secret**.

---

## Part 4 — Wire Google into Supabase (Matt)

1. Supabase dashboard → **Authentication → Providers → Google** → enable it → paste the **Client
   ID** and **Client secret** from Part 3 → save.
2. **Authentication → URL Configuration:**
   - **Site URL:** `https://mattpsullivan.github.io/vegan-meal-prep/`
   - **Redirect URLs** (allow-list — `redirectTo` must match one of these, wildcards allowed):
     - `https://mattpsullivan.github.io/vegan-meal-prep/**`
     - `http://localhost:5173/**`

> The OAuth round-trip is: app calls `signInWithOAuth` → Google → **Supabase**
> `/auth/v1/callback` → Supabase redirects back to your `redirectTo` (must be allow-listed above).
> Because the app is served under the base path `/vegan-meal-prep/`, `redirectTo` must include it.

---

## Part 5 — App env + client (agent, + Matt adds the CI secrets)

- **Local dev:** create `.env.local` (gitignored) with:
  ```
  VITE_SUPABASE_URL=https://<project-ref>.supabase.co
  VITE_SUPABASE_ANON_KEY=<anon key>
  ```
  Commit a `.env.example` with the keys blank. Confirm `.env*` (except `.env.example`) is gitignored.
- **Pages build (Matt):** Vite inlines `VITE_*` at **build time**, so CI needs them. GitHub repo →
  **Settings → Secrets and variables → Actions** → add `VITE_SUPABASE_URL` and
  `VITE_SUPABASE_ANON_KEY` (repo **Variables** are fine — both are public). The agent then edits
  `deploy.yml` to pass them into the build step's `env:`.
- **Client module (agent):** `@supabase/supabase-js` → `createClient(url, anonKey)` in one typed
  module; `detectSessionInUrl` on (default) handles the PKCE callback. Auth state via a hook;
  server state via TanStack Query (already in the stack); local UI state via Zustand.

---

## Part 6 — Verify (agent)

- [ ] Google sign-in works end-to-end against the real redirect URL (and localhost in dev — that's
      why both are allow-listed).
- [ ] **RLS holds:** with two test users in different households, confirm user A cannot read or
      write user B's rows — test in the SQL editor / a scripted query, not just the UI.
- [ ] Migrations apply cleanly from scratch (`supabase db reset` locally).
- [ ] Teen profiles show no deficit target.
- [ ] `pnpm check` + `pnpm format:check` green. Commit; do **not** deploy without Matt's go.

---

## Gotchas

- **Redirect base path** is the #1 cause of an auth loop — `redirectTo`, the Site URL, and the
  allow-list must all include `/vegan-meal-prep/`.
- **anon key is public** — that's expected. RLS is the security boundary; the `service_role` key
  must never reach the client or the repo.
- **RLS recursion** — the `profile` select policy queries `profile`; the `security definer`
  `auth_household_ids()` function is what prevents infinite recursion. Don't inline that subquery.
- **Repo rename is deferred**, so the Pages URL stays `/vegan-meal-prep/`. If the repo is ever
  renamed, every URL above (origins, Site URL, allow-list) must be updated.
