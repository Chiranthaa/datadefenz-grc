-- =====================================================================
-- DATADEFENZ GRC — 0004 core compliance workflow
--
--  * Framework scope per organisation (which of the eight SCF framework
--    groups apply to a customer).
--  * Unified requirements = SCF controls mapped to at least one selected
--    group. One row per SCF control, however many frameworks it covers.
--  * Evidence status tracked separately from implementation status.
--  * DATADEFENZ-authored guidance, framework-specific notes and mapping
--    reviews: shared content written only by platform owners, with an
--    explicit draft -> reviewed status. Customers see reviewed content
--    only. Nothing here alters SCF source data (CC BY-ND 4.0).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Framework scope per organisation
-- ---------------------------------------------------------------------
create table public.organisation_frameworks (
  organisation_id  uuid not null references public.organisations (id) on delete cascade,
  group_id         text not null references public.scf_framework_groups (id),
  created_at       timestamptz not null default now(),
  created_by       uuid references auth.users (id) on delete set null,
  primary key (organisation_id, group_id)
);

create trigger organisation_frameworks_set_created_by before insert on public.organisation_frameworks
  for each row execute function private.set_created_by();

revoke all on public.organisation_frameworks from anon, authenticated;
grant select, insert, delete on public.organisation_frameworks to authenticated;
alter table public.organisation_frameworks enable row level security;

create policy "members can read framework scope"
  on public.organisation_frameworks for select to authenticated
  using (private.is_org_member(organisation_id));
create policy "customer admins can add frameworks"
  on public.organisation_frameworks for insert to authenticated
  with check (private.has_org_role(organisation_id, array['customer_admin']::public.org_role[]));
create policy "customer admins can remove frameworks"
  on public.organisation_frameworks for delete to authenticated
  using (private.has_org_role(organisation_id, array['customer_admin']::public.org_role[]));

-- ---------------------------------------------------------------------
-- 2. Evidence status, separate from implementation status
-- ---------------------------------------------------------------------
create type public.evidence_status as enum ('not_provided', 'partially_provided', 'provided');

alter table public.control_assessments
  add column evidence_status public.evidence_status not null default 'not_provided',
  add column updated_by uuid references auth.users (id) on delete set null;

create function private.set_updated_by()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if (select auth.uid()) is not null then
    new.updated_by := (select auth.uid());
  end if;
  return new;
end;
$$;

create trigger control_assessments_set_updated_by before insert or update on public.control_assessments
  for each row execute function private.set_updated_by();

grant update (evidence_status) on public.control_assessments to authenticated;

-- ---------------------------------------------------------------------
-- 3. DATADEFENZ content: guidance, framework notes, mapping reviews
-- ---------------------------------------------------------------------
create type public.content_status as enum ('draft', 'reviewed');

create table public.requirement_guidance (
  scf_id                  text primary key references public.scf_controls (scf_id) on delete cascade,
  plain_summary           text check (char_length(plain_summary) <= 5000),
  implementation_guidance text check (char_length(implementation_guidance) <= 20000),
  technical_references    text check (char_length(technical_references) <= 10000),
  evidence_expected       text check (char_length(evidence_expected) <= 10000),
  evidence_example        text check (char_length(evidence_example) <= 10000),
  status                  public.content_status not null default 'draft',
  authored_by             uuid references auth.users (id) on delete set null,
  updated_at              timestamptz not null default now(),
  reviewed_by             uuid references auth.users (id) on delete set null,
  reviewed_at             timestamptz
);

create table public.framework_notes (
  scf_id       text not null references public.scf_controls (scf_id) on delete cascade,
  group_id     text not null references public.scf_framework_groups (id),
  note         text not null check (char_length(note) between 1 and 10000),
  status       public.content_status not null default 'draft',
  authored_by  uuid references auth.users (id) on delete set null,
  updated_at   timestamptz not null default now(),
  reviewed_by  uuid references auth.users (id) on delete set null,
  reviewed_at  timestamptz,
  primary key (scf_id, group_id)
);

-- Review state of one SCF mapping entry (control x source framework).
-- No row = "sourced": as published by SCF, not independently reviewed.
-- reviewed_ids pins the identifiers that were checked, so a later SCF
-- import that changes them shows the review as out of date.
create type public.mapping_review_status as enum ('reviewed', 'needs_validation');

create table public.mapping_reviews (
  scf_id        text not null references public.scf_controls (scf_id) on delete cascade,
  framework     text not null check (char_length(framework) <= 200),
  status        public.mapping_review_status not null,
  reviewed_ids  text[] not null,
  note          text check (char_length(note) <= 5000),
  reviewed_by   uuid references auth.users (id) on delete set null,
  reviewed_at   timestamptz not null default now(),
  primary key (scf_id, framework)
);

-- Authorship and review stamps always come from the session.
create function private.stamp_curated_content()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  content_changed boolean;
begin
  if tg_table_name = 'requirement_guidance' then
    content_changed := tg_op = 'INSERT' or (new.plain_summary, new.implementation_guidance, new.technical_references,
      new.evidence_expected, new.evidence_example) is distinct from (old.plain_summary, old.implementation_guidance,
      old.technical_references, old.evidence_expected, old.evidence_example);
  else
    content_changed := tg_op = 'INSERT' or new.note is distinct from old.note;
  end if;

  if content_changed then
    new.authored_by := coalesce((select auth.uid()), new.authored_by);
  end if;
  new.updated_at := now();

  if new.status = 'reviewed' and (tg_op = 'INSERT' or old.status <> 'reviewed' or content_changed) then
    new.reviewed_by := coalesce((select auth.uid()), new.reviewed_by);
    new.reviewed_at := now();
  elsif new.status = 'draft' then
    new.reviewed_by := null;
    new.reviewed_at := null;
  end if;
  return new;
end;
$$;

create trigger requirement_guidance_stamp before insert or update on public.requirement_guidance
  for each row execute function private.stamp_curated_content();
create trigger framework_notes_stamp before insert or update on public.framework_notes
  for each row execute function private.stamp_curated_content();

create function private.stamp_mapping_review()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  new.reviewed_by := coalesce((select auth.uid()), new.reviewed_by);
  new.reviewed_at := now();
  return new;
end;
$$;

create trigger mapping_reviews_stamp before insert or update on public.mapping_reviews
  for each row execute function private.stamp_mapping_review();

revoke all on public.requirement_guidance, public.framework_notes, public.mapping_reviews from anon, authenticated;
grant select, insert, update, delete on public.requirement_guidance, public.framework_notes, public.mapping_reviews to authenticated;

alter table public.requirement_guidance enable row level security;
alter table public.framework_notes      enable row level security;
alter table public.mapping_reviews      enable row level security;

-- Customers see reviewed content only; platform owners also see drafts.
create policy "reviewed guidance is visible to signed-in users"
  on public.requirement_guidance for select to authenticated
  using (status = 'reviewed' or private.is_platform_owner());
create policy "platform owners write guidance"
  on public.requirement_guidance for all to authenticated
  using (private.is_platform_owner()) with check (private.is_platform_owner());

create policy "reviewed framework notes are visible to signed-in users"
  on public.framework_notes for select to authenticated
  using (status = 'reviewed' or private.is_platform_owner());
create policy "platform owners write framework notes"
  on public.framework_notes for all to authenticated
  using (private.is_platform_owner()) with check (private.is_platform_owner());

create policy "mapping review status is visible to signed-in users"
  on public.mapping_reviews for select to authenticated using (true);
create policy "platform owners write mapping reviews"
  on public.mapping_reviews for all to authenticated
  using (private.is_platform_owner()) with check (private.is_platform_owner());

-- ---------------------------------------------------------------------
-- 4. Read models. SECURITY INVOKER: RLS on organisation_frameworks and
--    control_assessments applies, so non-members get empty results.
-- ---------------------------------------------------------------------

-- One row per unified requirement in the organisation's scope.
--   selected_groups     groups (of those selected) the control maps to
--   all_group_count     how many of the eight groups SCF maps it to;
--                       1 = framework-specific requirement
create function public.org_requirements(p_organisation_id uuid)
returns table (
  scf_id            text,
  scf_control_name  text,
  scf_domain        text,
  sort_order        integer,
  selected_groups   text[],
  selected_count    integer,
  all_group_count   integer,
  status            public.assessment_status,
  evidence_status   public.evidence_status,
  owner_name        text,
  updated_at        timestamptz
)
language sql stable security invoker set search_path = ''
as $$
  with scope as (
    select f.group_id from public.organisation_frameworks f
    where f.organisation_id = p_organisation_id
  ),
  per_control as (
    select m.scf_id,
           array_agg(distinct m.group_id) filter (where m.group_id in (select group_id from scope)) as selected_groups,
           count(distinct m.group_id)::integer as all_group_count
    from public.scf_mappings m
    group by m.scf_id
  )
  select c.scf_id, c.scf_control_name, c.scf_domain, c.sort_order,
         p.selected_groups, cardinality(p.selected_groups), p.all_group_count,
         coalesce(a.status, 'not_assessed'::public.assessment_status),
         coalesce(a.evidence_status, 'not_provided'::public.evidence_status),
         a.owner_name, a.updated_at
  from per_control p
  join public.scf_controls c on c.scf_id = p.scf_id
  left join public.control_assessments a
    on a.organisation_id = p_organisation_id and a.scf_id = p.scf_id
  where p.selected_groups is not null;
$$;

-- Aggregates for the organisation dashboard.
create function public.org_dashboard(p_organisation_id uuid)
returns jsonb
language sql stable security invoker set search_path = ''
as $$
  with r as (select * from public.org_requirements(p_organisation_id)),
  needs_evidence as (
    select * from r where status in ('implemented', 'partially_implemented')
  ),
  per_group as (
    select g.id as group_id, g.sort_order,
           count(r.scf_id) as total,
           count(r.scf_id) filter (where r.status = 'implemented') as implemented,
           count(r.scf_id) filter (where r.status = 'partially_implemented') as partial,
           count(r.scf_id) filter (where r.status = 'not_implemented') as not_implemented,
           count(r.scf_id) filter (where r.status = 'not_applicable') as not_applicable,
           count(r.scf_id) filter (where r.status = 'not_assessed') as not_assessed,
           count(r.scf_id) filter (where r.status in ('implemented', 'partially_implemented')
                                     and r.evidence_status <> 'provided') as evidence_missing
    from public.scf_framework_groups g
    join public.organisation_frameworks f on f.group_id = g.id and f.organisation_id = p_organisation_id
    left join r on g.id = any (r.selected_groups)
    group by g.id, g.sort_order
  )
  select jsonb_build_object(
    'total', (select count(*) from r),
    'status', jsonb_build_object(
      'implemented',           (select count(*) from r where status = 'implemented'),
      'partially_implemented', (select count(*) from r where status = 'partially_implemented'),
      'not_implemented',       (select count(*) from r where status = 'not_implemented'),
      'not_applicable',        (select count(*) from r where status = 'not_applicable'),
      'not_assessed',          (select count(*) from r where status = 'not_assessed')
    ),
    'evidence', jsonb_build_object(
      'needs_evidence',     (select count(*) from needs_evidence),
      'provided',           (select count(*) from needs_evidence where evidence_status = 'provided'),
      'partially_provided', (select count(*) from needs_evidence where evidence_status = 'partially_provided'),
      'not_provided',       (select count(*) from needs_evidence where evidence_status = 'not_provided')
    ),
    'framework_specific', (select count(*) from r where all_group_count = 1),
    'groups', coalesce((select jsonb_agg(to_jsonb(pg) - 'sort_order' order by pg.sort_order) from per_group pg), '[]'::jsonb)
  );
$$;

-- Per-group size of the shared library (for the framework selection page).
create function public.scf_group_stats()
returns table (group_id text, controls integer, framework_specific integer)
language sql stable security invoker set search_path = ''
as $$
  with per_control as (
    select scf_id, count(distinct group_id) as n from public.scf_mappings group by scf_id
  )
  select m.group_id,
         count(distinct m.scf_id)::integer,
         count(distinct m.scf_id) filter (where pc.n = 1)::integer
  from public.scf_mappings m
  join per_control pc on pc.scf_id = m.scf_id
  group by m.group_id;
$$;

-- Distinct SCF domains (avoids the API's row limit on scf_controls).
create function public.scf_domains()
returns setof text
language sql stable security invoker set search_path = ''
as $$
  select distinct scf_domain from public.scf_controls order by 1;
$$;

revoke execute on function public.org_requirements(uuid), public.org_dashboard(uuid), public.scf_group_stats(), public.scf_domains() from public, anon;
grant execute on function public.org_requirements(uuid), public.org_dashboard(uuid), public.scf_group_stats(), public.scf_domains() to authenticated;
revoke execute on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated;
