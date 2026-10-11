# datadefenz-grc

Internal GRC platform for DATADEFENZ consulting work.

> **Status: multi-tenant foundation (not deployed).** Next.js + Supabase Auth,
> PostgreSQL with Row Level Security, and private Storage. Use a
> development/test Supabase project with the **fictional** test data only.
> The public GitHub Pages site of the earlier static prototype is not
> suitable for client data.

## What this foundation includes

- **Authentication** — email/password sign-in, sign-out and password reset
  (Supabase Auth, cookie sessions via `@supabase/ssr`). No public sign-up.
- **Organisations (tenants)** with **memberships and roles**: platform owner
  (DATADEFENZ), customer admin, assessor, read-only.
- **Row Level Security** isolating every customer-specific record and
  evidence file by organisation.
- **Shared SCF 2026.3 control library** — read-only for everyone, loaded
  verbatim from `data/scf/scf-2026.3-eight-frameworks.json`, with SCF
  attribution and license links on every signed-in page.
- **Compliance workflow** — per-customer framework selection, one unified
  requirements list (shared requirements appear once), exact framework
  references with provenance (sourced / reviewed / needs validation),
  assessment status, separately tracked evidence with private file storage,
  filters and a dashboard. See [docs/COMPLIANCE-WORKFLOW.md](docs/COMPLIANCE-WORKFLOW.md).
- **DATADEFENZ guidance layer** — platform owners write plain-language
  summaries, implementation guidance, technical references, expected and
  example evidence, framework-specific notes and mapping reviews; customers
  see reviewed content only.
- Screens: organisations, organisation dashboard, requirements, requirement
  detail, frameworks, members, platform admin, SCF library (with the
  consultant editor for platform owners).

## Getting started

Follow **[docs/SETUP.md](docs/SETUP.md)**. In short:

```sh
cp .env.example .env.local      # fill in from your Supabase project — never commit it
npm install
# apply supabase/migrations/*.sql to your project (SQL editor or `supabase db push`)
npm run scf:import
npm run seed:test
npm run verify:isolation
npm run dev
```

## Project structure

```
app/                         Next.js App Router pages, server actions, auth routes
  (app)/                     Signed-in area (organisations, members, admin, SCF library)
  login/ forgot-password/    Public auth pages
  auth/confirm/ auth/signout Email-link handler, POST-only sign-out
components/                  Shared UI (notices, submit button, SCF attribution)
lib/                         Supabase clients, auth helpers, env, messages
proxy.ts                     Session refresh + redirect to /login (Next.js 16 proxy)
supabase/migrations/         Database schema, RLS policies, storage bucket, workflow read models
supabase/config.toml         Supabase CLI config for local development (no secrets)
supabase/tests/local/        RLS isolation tests on a throwaway local PostgreSQL
scripts/                     Local-only tools: SCF import, test seed, isolation check
data/scf/                    SCF 2026.3 source file (unmodified)
docs/                        Setup guide, security model, compliance workflow and data provenance
prototype/                   Earlier static prototype (demo values only), kept for reference
```

## Security

See **[docs/SECURITY-MODEL.md](docs/SECURITY-MODEL.md)** for the role matrix,
how isolation is enforced, how to verify it, and the known limits.

- Credentials live only in `.env.local` (git-ignored).
- The app uses only the publishable/anon key; the secret/service-role key is
  used solely by local scripts.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js development server / production build / serve |
| `npm run typecheck` | TypeScript check |
| `npm run scf:import` | Load the SCF library into Supabase (secret key, local) |
| `npm run seed:test` | Create fictional test users, organisations and records (test projects only) |
| `npm run verify:isolation` | Check cross-organisation isolation against your project via the public API |
| `npm run test:rls-local` | Run the RLS test suite on a local PostgreSQL (no Supabase needed) |

## SCF attribution

Control content: [Secure Controls Framework (SCF)](https://securecontrolsframework.com)
2026.3, licensed under [CC BY-ND 4.0](https://creativecommons.org/licenses/by-nd/4.0/).
See also the [SCF license terms](https://securecontrolsframework.com/commercial-license).
SCF control text and mapping identifiers are stored and displayed verbatim.
