# Setup guide — multi-tenant foundation

This guide connects the app to **your own Supabase project**. Every
credential stays in `.env.local` on your machine (git-ignored). Never commit
keys, paste them into chat, issues or pull requests, or put them in
GitHub Pages.

> Use a **separate development/test project** for this foundation. It is
> seeded with fictional accounts and data only. Do not load real customer
> data until hosting, backups, logging and access reviews are agreed.

## 1. Create the Supabase project

1. In the [Supabase dashboard](https://supabase.com/dashboard) create a new
   project, e.g. `datadefenz-grc-dev`. Choose a region that matches your
   data-residency commitments (for EU customers, an EU region).
2. Store the database password in your password manager. The app never
   needs it.

## 2. Configure Supabase Auth

In **Authentication**:

| Setting | Where | Value |
|---|---|---|
| Email provider | Sign In / Providers → Email | Enabled |
| Allow new users to sign up | Sign In / Providers (user signups) | **Off** — DATADEFENZ creates accounts by invitation |
| Confirm email | Sign In / Providers → Email | On |
| Minimum password length | Sign In / Providers → Email (password settings) | 12 or more, with character requirements |
| Leaked password protection | Same section (paid plans) | On, if available |
| Site URL | URL Configuration | `http://localhost:3000` for local work |
| Redirect URLs | URL Configuration | `http://localhost:3000/auth/confirm` |

Supabase renames dashboard sections from time to time; if a label differs,
search the Auth settings for the setting name.

**Email templates** (Authentication → Emails → Templates). Point the links at
the app's `/auth/confirm` route so they work with server-side sessions:

- *Reset password*: replace the link with
  `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/update-password`
- *Invite user*: replace the link with
  `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/update-password`

Supabase's built-in email sender is rate-limited and meant for testing.
Configure your own SMTP provider (Authentication → Emails → SMTP) before any
real use. To try the reset flow end to end, invite a test account at an
inbox you control; the seeded `.test` addresses never receive email.

## 3. Apply the database migrations

The schema lives in `supabase/migrations/` and must be applied in filename
order:

1. `20261011090000_core_tenancy.sql` — organisations, profiles, memberships, roles, RLS
2. `20261011090100_scf_library.sql` — shared read-only SCF library
3. `20261011090200_customer_records.sql` — assessments, evidence, private `evidence` bucket

**Option A — SQL editor (simplest).** Open *SQL Editor* in the dashboard and
run each file's full contents, in the order above.

**Option B — Supabase CLI.**

```sh
npx supabase login
npx supabase init          # only if prompted; keeps the existing migrations
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

Then check **Project Settings → Data API → Exposed schemas** lists only
`public` (and `graphql_public`). Do **not** expose the `private` schema.

## 4. Local environment

```sh
cp .env.example .env.local
```

Fill in `.env.local` from **Project Settings → API Keys** (and the project
URL from *Data API*):

- `NEXT_PUBLIC_SUPABASE_URL` — project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — publishable key (`sb_publishable_…`), or the legacy anon key
- `SUPABASE_SECRET_KEY` — secret key (`sb_secret_…`), or the legacy service_role key.
  **Only the local scripts use it. It bypasses RLS; never ship it to the app or a browser.**
- `SEED_TEST_PASSWORD` — a password you choose (16+ characters) for the fictional test accounts
- `SEED_TARGET_IS_TEST_PROJECT=yes` — confirms this is a test project

Requires Node.js 20.6 or newer.

```sh
npm install
npm run scf:import        # loads SCF 2026.3 verbatim (1,028 controls)
npm run seed:test         # fictional users, 2 organisations, sample records and files
npm run verify:isolation  # cross-organisation checks against your project
npm run dev               # http://localhost:3000
```

## 5. Fictional test accounts

All use the `SEED_TEST_PASSWORD` from your `.env.local`. The `.test`
domain is reserved and never receives email.

| Email | Access |
|---|---|
| `platform.owner@datadefenz.test` | Platform owner (all organisations) |
| `admin@northwind.test` | Customer admin — Northwind Process Industries (TEST) |
| `assessor@northwind.test` | Assessor — Northwind |
| `viewer@northwind.test` | Read-only — Northwind |
| `admin@brightwater.test` | Customer admin — Brightwater Utilities (TEST) |
| `assessor@brightwater.test` | Assessor — Brightwater |

## 6. Real DATADEFENZ users (later)

1. Authentication → Users → **Invite user** (sends the invite email).
2. To make someone a platform owner, run in the SQL editor:

   ```sql
   insert into public.platform_owners (user_id)
   select id from auth.users where email = 'name@your-domain';
   ```

   Platform ownership cannot be granted from the app or the API.
3. Customer users: invite them in Supabase Auth, then a platform owner or the
   customer's admin adds them on the organisation's **Members** page.

## 7. Verifying tenant isolation

See [SECURITY-MODEL.md](SECURITY-MODEL.md#verifying-isolation) for the
verification layers (local SQL tests, automated API checks against your
project, a two-browser manual test, and an SQL editor spot-check).
