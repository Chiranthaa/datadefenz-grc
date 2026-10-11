-- =====================================================================
-- DATADEFENZ GRC — 0002 shared SCF control library
-- Secure Controls Framework (SCF) 2026.3 — https://securecontrolsframework.com
-- Licensed CC BY-ND 4.0 — https://creativecommons.org/licenses/by-nd/4.0/
-- SCF license terms — https://securecontrolsframework.com/commercial-license
--
-- The library is shared by all organisations and is READ-ONLY for every
-- application user. It is loaded verbatim from
-- data/scf/scf-2026.3-eight-frameworks.json by scripts/import-scf.mjs,
-- which runs locally with the service-role key. No API role can insert,
-- update or delete library rows.
-- =====================================================================

create table public.scf_library (
  version      text primary key,
  source       text not null,
  source_url   text not null,
  license      text not null,
  license_url  text not null,
  terms_url    text not null,
  notice       text not null,
  imported_at  timestamptz not null default now()
);

create table public.scf_framework_groups (
  id            text primary key,
  name          text not null,
  source_names  text[] not null,
  sort_order    integer not null
);

create table public.scf_controls (
  scf_id                 text primary key,
  library_version        text not null references public.scf_library (version),
  scf_domain             text not null,
  scf_domain_identifier  text not null,
  scf_control_name       text not null,
  description            text not null,
  control_question       text not null,
  sort_order             integer not null
);
create index scf_controls_domain_idx on public.scf_controls (scf_domain);

create table public.scf_mappings (
  id                         bigint generated always as identity primary key,
  scf_id                     text not null references public.scf_controls (scf_id) on delete cascade,
  group_id                   text not null references public.scf_framework_groups (id),
  framework                  text not null,
  focal_document_identifier  text not null,
  focal_document_name        text not null,
  ids                        text[] not null,
  sort_order                 integer not null
);
create index scf_mappings_scf_id_idx on public.scf_mappings (scf_id);
create index scf_mappings_group_idx on public.scf_mappings (group_id, scf_id);

-- Read-only for signed-in users; nothing for anonymous visitors.
revoke all on public.scf_library, public.scf_framework_groups, public.scf_controls, public.scf_mappings
  from anon, authenticated;
grant select on public.scf_library, public.scf_framework_groups, public.scf_controls, public.scf_mappings
  to authenticated;

alter table public.scf_library          enable row level security;
alter table public.scf_framework_groups enable row level security;
alter table public.scf_controls         enable row level security;
alter table public.scf_mappings         enable row level security;

create policy "signed-in users can read the SCF library"
  on public.scf_library for select to authenticated using (true);
create policy "signed-in users can read SCF framework groups"
  on public.scf_framework_groups for select to authenticated using (true);
create policy "signed-in users can read SCF controls"
  on public.scf_controls for select to authenticated using (true);
create policy "signed-in users can read SCF mappings"
  on public.scf_mappings for select to authenticated using (true);
-- Deliberately no insert / update / delete policies.
