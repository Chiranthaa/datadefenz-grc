-- =====================================================================
-- DATADEFENZ GRC — 0001 core tenancy
-- Organisations (tenants), user profiles, memberships with roles,
-- platform owners, and the Row Level Security (RLS) that isolates
-- customer records by organisation.
--
-- Security model
--   * Every customer-specific table carries organisation_id and has RLS
--     enabled. Access is decided only by the caller's membership rows.
--   * Platform owners (DATADEFENZ staff) are listed in platform_owners.
--     That table cannot be written through the API: rows are added with
--     the SQL editor or service-role tooling only.
--   * The Next.js app uses the anon key + the signed-in user's session.
--     The service-role key is never used by the app.
-- =====================================================================

-- Helper functions live in a schema that is not exposed through the API.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;
alter default privileges in schema private revoke execute on functions from public;

create type public.org_role as enum ('customer_admin', 'assessor', 'read_only');

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------

create table public.organisations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 2 and 200),
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 63),
  created_at  timestamptz not null default now(),
  created_by  uuid references auth.users (id) on delete set null
);

create table public.platform_owners (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now()
);

create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  full_name   text check (char_length(full_name) <= 200),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index profiles_email_lower_idx on public.profiles (lower(email));

create table public.memberships (
  id               uuid primary key default gen_random_uuid(),
  organisation_id  uuid not null references public.organisations (id) on delete cascade,
  user_id          uuid not null references public.profiles (id) on delete cascade,
  role             public.org_role not null,
  created_at       timestamptz not null default now(),
  created_by       uuid references auth.users (id) on delete set null,
  unique (organisation_id, user_id)
);
create index memberships_user_id_idx on public.memberships (user_id);

-- ---------------------------------------------------------------------
-- Access helpers (SECURITY DEFINER so they can read memberships without
-- recursing through memberships' own RLS). They only ever answer
-- questions about the calling user (auth.uid()).
-- ---------------------------------------------------------------------

create function private.is_platform_owner()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.platform_owners p
    where p.user_id = (select auth.uid())
  );
$$;

create function private.is_org_member(org_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select private.is_platform_owner() or exists (
    select 1 from public.memberships m
    where m.organisation_id = org_id
      and m.user_id = (select auth.uid())
  );
$$;

create function private.has_org_role(org_id uuid, roles public.org_role[])
returns boolean
language sql stable security definer set search_path = ''
as $$
  select private.is_platform_owner() or exists (
    select 1 from public.memberships m
    where m.organisation_id = org_id
      and m.user_id = (select auth.uid())
      and m.role = any (roles)
  );
$$;

create function private.shares_org_with(other_user uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships mine
    join public.memberships theirs on theirs.organisation_id = mine.organisation_id
    where mine.user_id = (select auth.uid())
      and theirs.user_id = other_user
  );
$$;

-- ---------------------------------------------------------------------
-- Audit helpers: who created / last changed a row comes from the session,
-- not from client-supplied values.
-- ---------------------------------------------------------------------

create function private.set_created_by()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  -- auth.uid() is null for service-role scripts; keep their value.
  if (select auth.uid()) is not null then
    new.created_by := (select auth.uid());
  end if;
  return new;
end;
$$;

create function private.touch_updated()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger organisations_set_created_by before insert on public.organisations
  for each row execute function private.set_created_by();
create trigger memberships_set_created_by before insert on public.memberships
  for each row execute function private.set_created_by();
create trigger profiles_touch_updated before update on public.profiles
  for each row execute function private.touch_updated();

-- ---------------------------------------------------------------------
-- Profiles are created and kept in sync from Supabase Auth.
-- ---------------------------------------------------------------------

create function private.handle_auth_user_change()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, coalesce(new.email, ''), new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_auth_user_change();
create trigger on_auth_user_email_changed after update of email on auth.users
  for each row execute function private.handle_auth_user_change();

-- Backfill users that existed before this migration.
insert into public.profiles (id, email, full_name)
select u.id, coalesce(u.email, ''), u.raw_user_meta_data ->> 'full_name'
from auth.users u
on conflict (id) do nothing;

-- Helper functions: callable by signed-in users (policies need them), never
-- by anonymous visitors.
revoke execute on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated;

-- ---------------------------------------------------------------------
-- Privileges. Supabase grants broad table privileges to anon and
-- authenticated by default; narrow them explicitly. RLS still applies
-- on top of these grants.
-- ---------------------------------------------------------------------

revoke all on public.organisations, public.platform_owners, public.profiles, public.memberships
  from anon, authenticated;

grant select, insert, delete on public.organisations to authenticated;
grant update (name) on public.organisations to authenticated;

grant select on public.platform_owners to authenticated;

grant select on public.profiles to authenticated;
grant update (full_name) on public.profiles to authenticated;

grant select, insert, delete on public.memberships to authenticated;
grant update (role) on public.memberships to authenticated;

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------

alter table public.organisations   enable row level security;
alter table public.platform_owners enable row level security;
alter table public.profiles        enable row level security;
alter table public.memberships     enable row level security;

-- organisations
create policy "members can read their organisations"
  on public.organisations for select to authenticated
  using (private.is_org_member(id));

create policy "platform owners can create organisations"
  on public.organisations for insert to authenticated
  with check (private.is_platform_owner());

create policy "customer admins can rename their organisation"
  on public.organisations for update to authenticated
  using (private.has_org_role(id, array['customer_admin']::public.org_role[]))
  with check (private.has_org_role(id, array['customer_admin']::public.org_role[]));

create policy "platform owners can delete organisations"
  on public.organisations for delete to authenticated
  using (private.is_platform_owner());

-- platform_owners: users may only see whether they themselves are one.
create policy "users can see their own platform owner flag"
  on public.platform_owners for select to authenticated
  using (user_id = (select auth.uid()));

-- profiles
create policy "users can read profiles of people they work with"
  on public.profiles for select to authenticated
  using (
    id = (select auth.uid())
    or private.is_platform_owner()
    or private.shares_org_with(id)
  );

create policy "users can update their own profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- memberships
create policy "members can read memberships of their organisations"
  on public.memberships for select to authenticated
  using (private.is_org_member(organisation_id));

create policy "customer admins can add members"
  on public.memberships for insert to authenticated
  with check (private.has_org_role(organisation_id, array['customer_admin']::public.org_role[]));

create policy "customer admins can change member roles"
  on public.memberships for update to authenticated
  using (private.has_org_role(organisation_id, array['customer_admin']::public.org_role[]))
  with check (private.has_org_role(organisation_id, array['customer_admin']::public.org_role[]));

create policy "customer admins can remove members"
  on public.memberships for delete to authenticated
  using (private.has_org_role(organisation_id, array['customer_admin']::public.org_role[]));

-- ---------------------------------------------------------------------
-- RPC: add an existing user to an organisation by email.
-- Users are created by DATADEFENZ (Supabase Auth invite); public sign-up
-- is disabled, so this only links accounts that already exist.
-- ---------------------------------------------------------------------

create function public.add_organisation_member(
  p_organisation_id uuid,
  p_email text,
  p_role public.org_role
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_user_id uuid;
  v_membership_id uuid;
begin
  if not private.has_org_role(p_organisation_id, array['customer_admin']::public.org_role[]) then
    raise exception 'Not authorised to manage members of this organisation'
      using errcode = '42501';
  end if;

  select p.id into v_user_id
  from public.profiles p
  where lower(p.email) = lower(trim(p_email));

  if v_user_id is null then
    raise exception 'No user account exists for that email address'
      using errcode = 'P0002',
            hint = 'Ask a platform owner to invite the user in Supabase Auth first.';
  end if;

  insert into public.memberships (organisation_id, user_id, role, created_by)
  values (p_organisation_id, v_user_id, p_role, (select auth.uid()))
  on conflict (organisation_id, user_id) do update set role = excluded.role
  returning id into v_membership_id;

  return v_membership_id;
end;
$$;

revoke execute on function public.add_organisation_member(uuid, text, public.org_role) from public, anon;
grant execute on function public.add_organisation_member(uuid, text, public.org_role) to authenticated;
