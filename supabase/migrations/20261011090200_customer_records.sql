-- =====================================================================
-- DATADEFENZ GRC — 0003 customer-specific records and private evidence
-- Every row belongs to exactly one organisation. RLS limits each user to
-- the organisations they are a member of; roles decide who may write.
--
--   customer_admin  read + write assessments/evidence, manage members
--   assessor        read + write assessments/evidence
--   read_only       read only
--   platform owner  all of the above, in every organisation
-- =====================================================================

create type public.assessment_status as enum (
  'not_assessed', 'implemented', 'partially_implemented', 'not_implemented', 'not_applicable'
);

create table public.control_assessments (
  id               uuid primary key default gen_random_uuid(),
  organisation_id  uuid not null references public.organisations (id) on delete cascade,
  scf_id           text not null references public.scf_controls (scf_id),
  status           public.assessment_status not null default 'not_assessed',
  owner_name       text check (char_length(owner_name) <= 200),
  notes            text check (char_length(notes) <= 10000),
  assessed_on      date,
  created_at       timestamptz not null default now(),
  created_by       uuid references auth.users (id) on delete set null,
  updated_at       timestamptz not null default now(),
  unique (organisation_id, scf_id),
  -- Lets child tables prove they belong to the same organisation.
  unique (id, organisation_id)
);

create table public.evidence_items (
  id               uuid primary key default gen_random_uuid(),
  organisation_id  uuid not null references public.organisations (id) on delete cascade,
  assessment_id    uuid,
  title            text not null check (char_length(title) between 1 and 300),
  description      text check (char_length(description) <= 10000),
  -- Object path in the private "evidence" bucket: <organisation_id>/<file>
  storage_path     text check (storage_path is null or storage_path like organisation_id::text || '/%'),
  created_at       timestamptz not null default now(),
  created_by       uuid references auth.users (id) on delete set null,
  updated_at       timestamptz not null default now(),
  -- Evidence can only be linked to an assessment of the SAME organisation.
  foreign key (assessment_id, organisation_id)
    references public.control_assessments (id, organisation_id) on delete set null (assessment_id)
);
create index evidence_items_org_idx on public.evidence_items (organisation_id);

create trigger control_assessments_set_created_by before insert on public.control_assessments
  for each row execute function private.set_created_by();
create trigger control_assessments_touch_updated before update on public.control_assessments
  for each row execute function private.touch_updated();
create trigger evidence_items_set_created_by before insert on public.evidence_items
  for each row execute function private.set_created_by();
create trigger evidence_items_touch_updated before update on public.evidence_items
  for each row execute function private.touch_updated();

-- organisation_id is not in the UPDATE column grants, so a record can
-- never be moved to another organisation.
revoke all on public.control_assessments, public.evidence_items from anon, authenticated;
grant select, insert, delete on public.control_assessments, public.evidence_items to authenticated;
grant update (status, owner_name, notes, assessed_on) on public.control_assessments to authenticated;
grant update (title, description, assessment_id, storage_path) on public.evidence_items to authenticated;

alter table public.control_assessments enable row level security;
alter table public.evidence_items      enable row level security;

-- control_assessments
create policy "members can read assessments"
  on public.control_assessments for select to authenticated
  using (private.is_org_member(organisation_id));

create policy "admins and assessors can create assessments"
  on public.control_assessments for insert to authenticated
  with check (private.has_org_role(organisation_id, array['customer_admin', 'assessor']::public.org_role[]));

create policy "admins and assessors can update assessments"
  on public.control_assessments for update to authenticated
  using (private.has_org_role(organisation_id, array['customer_admin', 'assessor']::public.org_role[]))
  with check (private.has_org_role(organisation_id, array['customer_admin', 'assessor']::public.org_role[]));

create policy "admins can delete assessments"
  on public.control_assessments for delete to authenticated
  using (private.has_org_role(organisation_id, array['customer_admin']::public.org_role[]));

-- evidence_items
create policy "members can read evidence records"
  on public.evidence_items for select to authenticated
  using (private.is_org_member(organisation_id));

create policy "admins and assessors can create evidence records"
  on public.evidence_items for insert to authenticated
  with check (private.has_org_role(organisation_id, array['customer_admin', 'assessor']::public.org_role[]));

create policy "admins and assessors can update evidence records"
  on public.evidence_items for update to authenticated
  using (private.has_org_role(organisation_id, array['customer_admin', 'assessor']::public.org_role[]))
  with check (private.has_org_role(organisation_id, array['customer_admin', 'assessor']::public.org_role[]));

create policy "admins can delete evidence records"
  on public.evidence_items for delete to authenticated
  using (private.has_org_role(organisation_id, array['customer_admin']::public.org_role[]));

-- ---------------------------------------------------------------------
-- Private Storage bucket for evidence files.
-- Object names must start with the organisation id: <org_id>/<path>.
-- ---------------------------------------------------------------------

-- Returns the organisation id encoded in an object path, or null.
create function private.storage_path_org_id(object_name text)
returns uuid
language sql immutable set search_path = ''
as $$
  select case
    when split_part(object_name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then split_part(object_name, '/', 1)::uuid
  end;
$$;
revoke execute on function private.storage_path_org_id(text) from public, anon;
grant execute on function private.storage_path_org_id(text) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit)
values ('evidence', 'evidence', false, 26214400)  -- 25 MB per file
on conflict (id) do update set public = false;

create policy "evidence files: members can read"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'evidence'
    and private.is_org_member(private.storage_path_org_id(name))
  );

create policy "evidence files: admins and assessors can upload"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'evidence'
    and private.has_org_role(private.storage_path_org_id(name), array['customer_admin', 'assessor']::public.org_role[])
  );

create policy "evidence files: admins and assessors can replace"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'evidence'
    and private.has_org_role(private.storage_path_org_id(name), array['customer_admin', 'assessor']::public.org_role[])
  )
  with check (
    bucket_id = 'evidence'
    and private.has_org_role(private.storage_path_org_id(name), array['customer_admin', 'assessor']::public.org_role[])
  );

create policy "evidence files: admins can delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'evidence'
    and private.has_org_role(private.storage_path_org_id(name), array['customer_admin']::public.org_role[])
  );
