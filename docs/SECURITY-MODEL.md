# Security model — multi-tenant foundation

## Principles

1. **The database enforces isolation.** Every customer-specific table has
   `organisation_id` and Row Level Security (RLS). The app's own role checks
   only decide what to *show*; RLS decides what anyone can *read or change*.
2. **The app never holds a key that bypasses RLS.** The Next.js app uses the
   publishable (anon) key plus the signed-in user's session. The secret
   (service-role) key is used only by local scripts in `scripts/` and is
   read from `.env.local`.
3. **No self-service escalation.** There is no public sign-up. Platform
   ownership can be granted only with SQL by someone with dashboard access.
4. **The SCF library is shared and read-only.** Signed-in users can read
   it; no API role, including platform owners, can change it.

## Roles

| Capability | Platform owner | Customer admin | Assessor | Read-only |
|---|:-:|:-:|:-:|:-:|
| See the organisation and its records | all orgs | own org | own org | own org |
| Create / update assessments and evidence | ✓ | ✓ | ✓ | – |
| Delete assessments and evidence | ✓ | ✓ | – | – |
| Upload evidence files | ✓ | ✓ | ✓ | – |
| Delete evidence files | ✓ | ✓ | – | – |
| Add members, change roles, remove members | ✓ | ✓ | – | – |
| Rename organisation | ✓ | ✓ | – | – |
| Choose frameworks in scope | ✓ | ✓ | – | – |
| Set evidence status, add evidence records | ✓ | ✓ | ✓ | – |
| Write DATADEFENZ guidance, framework notes, mapping reviews | ✓ | – | – | – |
| Read reviewed guidance and mapping review status | ✓ | ✓ | ✓ | ✓ |
| Read draft guidance | ✓ | – | – | – |
| Create / delete organisations | ✓ | – | – | – |
| Read SCF library | ✓ | ✓ | ✓ | ✓ |
| Change SCF library | – | – | – | – |

A user can belong to several organisations with a different role in each.

## How it is enforced

- **Helper functions** in the non-exposed `private` schema
  (`is_platform_owner`, `is_org_member`, `has_org_role`, `shares_org_with`)
  answer questions about the *calling* user only. They are `SECURITY
  DEFINER` with an empty `search_path`, so policies can check memberships
  without recursive RLS.
- **Column-level grants** stop records being moved between organisations:
  `organisation_id` is never updatable through the API. Organisation slugs
  and `created_by` are also protected (`created_by` is set from the session
  by a trigger).
- **Composite foreign keys** stop evidence being linked to another
  organisation's assessment. A check constraint stops evidence records
  pointing at another organisation's storage folder.
- **Private Storage.** The `evidence` bucket is private. Objects must be
  stored under `<organisation_id>/…`; storage policies apply the same
  membership and role rules to files.
- **Workflow read models** (`org_requirements`, `org_dashboard`) are
  `SECURITY INVOKER` functions, so they return nothing for organisations the
  caller is not a member of.
- **DATADEFENZ guidance** is shared across customers but writable only by
  platform owners; drafts are visible only to platform owners.
- **Anonymous visitors** have no table privileges at all.
- **Sessions** are cookie-based (`@supabase/ssr`). `proxy.ts` refreshes and
  validates them on every request and sends unauthenticated users to the
  login page. Server code verifies the user with the Auth server before
  loading data. Sign-out is POST-only. Redirect targets are restricted to
  same-site paths.
- **Password reset** never reveals whether an account exists.
- **Security headers**: frame denial, nosniff, strict referrer policy, HSTS,
  restrictive permissions policy. Search engines are told not to index.

## Verifying isolation

### 1. Local SQL tests (no Supabase needed)

`npm run test:rls-local` builds a throwaway PostgreSQL cluster, applies
small stand-ins for Supabase's `auth` and `storage` schemas, applies the
migrations, and runs 121 checks across all roles in
`supabase/tests/local/10_rls_isolation_test.sql`. Needs PostgreSQL 15+
installed locally. Mutating a policy (for example making assessments
readable by everyone) makes the suite fail, which shows the tests have
teeth.

### 2. Automated checks against your Supabase project

After `npm run seed:test`, run `npm run verify:isolation`. It signs in as
the fictional users **through the public API with the publishable key**,
exactly as a browser would, and checks that:

- each customer admin sees only its own organisation;
- neither organisation can read, create, update, delete or move the other's
  assessments, evidence records or memberships;
- neither can list, download or upload the other's evidence files;
- neither can add members to the other organisation;
- neither can read or change the other's framework scope, unified
  requirements or dashboard figures;
- customers cannot write DATADEFENZ guidance or mark mappings reviewed;
- read-only users cannot write, assessors cannot delete or manage members;
- the SCF library is readable but not editable, even by a platform owner;
- platform ownership cannot be granted through the API;
- signed-out visitors can read nothing.

Every line prints PASS or FAIL; the command exits non-zero on any failure.

### 3. Two-browser manual test

1. `npm run dev`.
2. In a normal window, sign in as `admin@northwind.test`. Open the
   Northwind organisation and copy its URL.
3. In a private window, sign in as `admin@brightwater.test`. You see only
   Brightwater. Paste the Northwind URL: you get **404 Not Found**.
4. Do the same with the Members page URL (`/orgs/<id>/members`).
5. Sign in as `platform.owner@datadefenz.test`: both organisations appear.

### 4. SQL editor spot-check

In the Supabase SQL editor, impersonate a user inside a transaction that is
always rolled back:

```sql
begin;
-- Look up the other organisation's id first (as the database owner).
select set_config('test.bw_org', (select id::text from public.organisations where slug = 'brightwater-test'), true);
-- Act as the Northwind admin.
select set_config('request.jwt.claims',
  json_build_object('sub', (select id from auth.users where email = 'admin@northwind.test'), 'role', 'authenticated')::text, true);
set local role authenticated;

select name from public.organisations;                                     -- only Northwind
select count(*) from public.control_assessments
  where organisation_id = current_setting('test.bw_org')::uuid;            -- 0
select count(*) from storage.objects
  where name like current_setting('test.bw_org') || '/%';                  -- 0
rollback;
```

## Known limits of this foundation

- No audit log yet (who changed what, when). Planned next.
- No MFA enforcement yet. Supabase supports TOTP MFA; enforcing `aal2`
  for platform owners and customer admins is recommended next.
- A customer admin can remove themselves or demote the last admin; a
  platform owner can restore access.
- Generated database types (`supabase gen types`) are not wired in yet.
- Not deployed. Hosting, backups, monitoring, rate limiting and incident
  response must be decided before any real customer data is loaded.
- The public GitHub Pages site (static prototype on the older branch) is
  not suitable for client data and should be switched off when no longer
  needed.
