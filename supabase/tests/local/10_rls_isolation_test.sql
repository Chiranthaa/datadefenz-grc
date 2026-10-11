-- Row Level Security isolation tests for the DATADEFENZ GRC schema.
-- Run by supabase/tests/local/run.sh after the stubs and all migrations.
-- All people, organisations and records here are fictional.

\set ON_ERROR_STOP 1
\pset footer off
\o /dev/null

-- ---------------------------------------------------------------------
-- Test helpers
-- ---------------------------------------------------------------------
create schema test;
create table test.results (id serial primary key, name text not null, got text, expected text, ok boolean not null);
grant usage on schema test to anon, authenticated;

-- Runs one statement as the CURRENT role and always rolls its effects
-- back. Returns 'ok:<rows>' or 'err:<sqlstate>'.
create function test.try(statement text) returns text
language plpgsql security invoker
as $$
declare n integer;
begin
  begin
    execute statement;
    get diagnostics n = row_count;
    raise exception using errcode = 'T0001', message = n::text;
  exception
    when sqlstate 'T0001' then return 'ok:' || sqlerrm;
    when others then return 'err:' || sqlstate;
  end;
end;
$$;

create function test.check(name text, got text, expected text) returns void
language sql security definer
as $$
  insert into test.results (name, got, expected, ok) values (name, got, expected, got = expected);
$$;
grant execute on all functions in schema test to anon, authenticated;

-- ---------------------------------------------------------------------
-- Fictional fixture data (inserted as the database owner)
-- ---------------------------------------------------------------------
\set owner        '''00000000-0000-4000-8000-0000000000a0'''
\set nw_admin     '''00000000-0000-4000-8000-0000000000a1'''
\set nw_assessor  '''00000000-0000-4000-8000-0000000000a2'''
\set nw_viewer    '''00000000-0000-4000-8000-0000000000a3'''
\set bw_admin     '''00000000-0000-4000-8000-0000000000b1'''
\set bw_assessor  '''00000000-0000-4000-8000-0000000000b2'''
\set outsider     '''00000000-0000-4000-8000-0000000000c1'''
\set nw           '''11111111-1111-4111-8111-111111111111'''
\set bw           '''22222222-2222-4222-8222-222222222222'''
\set nw_assess    '''11111111-0000-4000-8000-00000000aaaa'''
\set bw_assess    '''22222222-0000-4000-8000-00000000bbbb'''

insert into auth.users (id, email) values
  (:owner,       'platform.owner@datadefenz.test'),
  (:nw_admin,    'admin@northwind.test'),
  (:nw_assessor, 'assessor@northwind.test'),
  (:nw_viewer,   'viewer@northwind.test'),
  (:bw_admin,    'admin@brightwater.test'),
  (:bw_assessor, 'assessor@brightwater.test'),
  (:outsider,    'no.access@datadefenz.test');

insert into public.platform_owners (user_id) values (:owner);

insert into public.organisations (id, name, slug) values
  (:nw, 'Northwind Process Industries (TEST)', 'northwind-test'),
  (:bw, 'Brightwater Utilities (TEST)', 'brightwater-test');

insert into public.memberships (organisation_id, user_id, role) values
  (:nw, :nw_admin, 'customer_admin'),
  (:nw, :nw_assessor, 'assessor'),
  (:nw, :nw_viewer, 'read_only'),
  (:bw, :bw_admin, 'customer_admin'),
  (:bw, :bw_assessor, 'assessor');

insert into public.scf_library (version, source, source_url, license, license_url, terms_url, notice)
values ('2026.3', 'Secure Controls Framework (SCF)', 'https://securecontrolsframework.com', 'CC BY-ND 4.0',
        'https://creativecommons.org/licenses/by-nd/4.0/', 'https://securecontrolsframework.com/commercial-license', 'test fixture');
insert into public.scf_framework_groups (id, name, source_names, sort_order) values ('nis2', 'NIS2', '{"EMEA EU NIS2 2022"}', 1);
insert into public.scf_controls (scf_id, library_version, scf_domain, scf_domain_identifier, scf_control_name, description, control_question, sort_order) values
  ('GOV-02', '2026.3', 'Governance', 'GOV', 'Fixture control A', 'Fixture description', 'Fixture question?', 1),
  ('IAC-37', '2026.3', 'Identification & Authentication', 'IAC', 'Fixture control B', 'Fixture description', 'Fixture question?', 2);

insert into public.control_assessments (id, organisation_id, scf_id, status, notes) values
  (:nw_assess, :nw, 'GOV-02', 'partially_implemented', 'Fictional Northwind note'),
  (:bw_assess, :bw, 'GOV-02', 'implemented', 'Fictional Brightwater note');

insert into public.evidence_items (organisation_id, assessment_id, title, storage_path) values
  (:nw, :nw_assess, 'Northwind fictional policy', '11111111-1111-4111-8111-111111111111/policy.txt'),
  (:bw, :bw_assess, 'Brightwater fictional policy', '22222222-2222-4222-8222-222222222222/policy.txt');

insert into storage.objects (bucket_id, name) values
  ('evidence', '11111111-1111-4111-8111-111111111111/policy.txt'),
  ('evidence', '22222222-2222-4222-8222-222222222222/policy.txt');

select test.check('fixture: profiles created by auth trigger', (select count(*)::text from public.profiles), '7');
select test.check('anon cannot execute RLS helper functions', has_function_privilege('anon', 'private.has_org_role(uuid, public.org_role[])', 'execute')::text, 'false');
select test.check('authenticated can execute RLS helper functions', has_function_privilege('authenticated', 'private.has_org_role(uuid, public.org_role[])', 'execute')::text, 'true');
select test.check('anon has no access to the private schema', has_schema_privilege('anon', 'private', 'usage')::text, 'false');
select test.check('fixture: evidence bucket is private', (select public::text from storage.buckets where id = 'evidence'), 'false');


-- =====================================================================
-- Northwind customer admin
-- =====================================================================
reset role;
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', false);
select test.check('nw_admin sees only own organisation', test.try('select * from public.organisations'), 'ok:1');
select test.check('nw_admin cannot read Brightwater organisation', test.try($$select * from public.organisations where slug = 'brightwater-test'$$), 'ok:0');
select test.check('nw_admin sees Northwind memberships only', test.try('select * from public.memberships'), 'ok:3');
select test.check('nw_admin sees profiles of own org only', test.try('select * from public.profiles'), 'ok:3');
select test.check('nw_admin cannot see Brightwater admin profile', test.try($$select * from public.profiles where email = 'admin@brightwater.test'$$), 'ok:0');
select test.check('nw_admin sees only Northwind assessments', test.try('select * from public.control_assessments'), 'ok:1');
select test.check('nw_admin sees only Northwind evidence records', test.try('select * from public.evidence_items'), 'ok:1');
select test.check('nw_admin cannot create assessment in Brightwater', test.try(format($$insert into public.control_assessments (organisation_id, scf_id) values (%L, 'IAC-37')$$, :bw)), 'err:42501');
select test.check('nw_admin cannot update Brightwater assessment', test.try(format($$update public.control_assessments set notes = 'x' where id = %L$$, :bw_assess)), 'ok:0');
select test.check('nw_admin cannot delete Brightwater assessment', test.try(format($$delete from public.control_assessments where id = %L$$, :bw_assess)), 'ok:0');
select test.check('nw_admin can create Northwind assessment', test.try(format($$insert into public.control_assessments (organisation_id, scf_id) values (%L, 'IAC-37')$$, :nw)), 'ok:1');
select test.check('nw_admin can update Northwind assessment', test.try(format($$update public.control_assessments set notes = 'updated' where id = %L$$, :nw_assess)), 'ok:1');
select test.check('nw_admin cannot move assessment to Brightwater', test.try(format($$update public.control_assessments set organisation_id = %L where id = %L$$, :bw, :nw_assess)), 'err:42501');
select test.check('created_by comes from the session, not the client', test.try(format($$with i as (insert into public.control_assessments (organisation_id, scf_id, created_by) values (%L, 'IAC-37', %L) returning created_by) select 1 from i where created_by = %L$$, :nw, :bw_admin, :nw_admin)), 'ok:1');
select test.check('nw_admin cannot link evidence to Brightwater assessment', test.try(format($$insert into public.evidence_items (organisation_id, assessment_id, title) values (%L, %L, 'x')$$, :nw, :bw_assess)), 'err:23503');
select test.check('nw_admin cannot point evidence at Brightwater storage path', test.try(format($$insert into public.evidence_items (organisation_id, title, storage_path) values (%L, 'x', %L)$$, :nw, '22222222-2222-4222-8222-222222222222/x.txt')), 'err:23514');
select test.check('nw_admin cannot add members to Brightwater', test.try(format($$insert into public.memberships (organisation_id, user_id, role) values (%L, %L, 'assessor')$$, :bw, :outsider)), 'err:42501');
select test.check('nw_admin cannot use RPC on Brightwater', test.try(format($$select public.add_organisation_member(%L, 'no.access@datadefenz.test', 'assessor')$$, :bw)), 'err:42501');
select test.check('nw_admin can add an existing user to Northwind via RPC', test.try(format($$select public.add_organisation_member(%L, 'no.access@datadefenz.test', 'read_only')$$, :nw)), 'ok:1');
select test.check('nw_admin cannot create organisations', test.try($$insert into public.organisations (name, slug) values ('Rogue Org', 'rogue')$$), 'err:42501');
select test.check('nw_admin can rename own organisation', test.try(format($$update public.organisations set name = 'Northwind renamed' where id = %L$$, :nw)), 'ok:1');
select test.check('nw_admin cannot rename Brightwater', test.try(format($$update public.organisations set name = 'pwned' where id = %L$$, :bw)), 'ok:0');
select test.check('nw_admin cannot change organisation slug', test.try(format($$update public.organisations set slug = 'x' where id = %L$$, :nw)), 'err:42501');
select test.check('nw_admin cannot make themselves platform owner', test.try(format($$insert into public.platform_owners (user_id) values (%L)$$, :nw_admin)), 'err:42501');
select test.check('nw_admin sees no platform owner rows', test.try('select * from public.platform_owners'), 'ok:0');
select test.check('nw_admin can read the SCF library', test.try('select * from public.scf_controls'), 'ok:2');
select test.check('nw_admin cannot insert SCF controls', test.try($$insert into public.scf_controls values ('X-1', '2026.3', 'd', 'D', 'n', 'd', 'q', 9)$$), 'err:42501');
select test.check('nw_admin cannot edit SCF controls', test.try($$update public.scf_controls set description = 'edited'$$), 'err:42501');
select test.check('nw_admin cannot delete SCF mappings', test.try('delete from public.scf_mappings'), 'err:42501');
select test.check('nw_admin sees only Northwind files', test.try('select * from storage.objects'), 'ok:1');
select test.check('nw_admin cannot read Brightwater file', test.try($$select * from storage.objects where name like '22222222-%'$$), 'ok:0');
select test.check('nw_admin cannot upload into Brightwater folder', test.try($$insert into storage.objects (bucket_id, name) values ('evidence', '22222222-2222-4222-8222-222222222222/evil.txt')$$), 'err:42501');
select test.check('nw_admin cannot upload outside an org folder', test.try($$insert into storage.objects (bucket_id, name) values ('evidence', 'not-an-org/evil.txt')$$), 'err:42501');
select test.check('nw_admin can upload into Northwind folder', test.try($$insert into storage.objects (bucket_id, name) values ('evidence', '11111111-1111-4111-8111-111111111111/new.txt')$$), 'ok:1');
select test.check('nw_admin cannot delete Brightwater file', test.try($$delete from storage.objects where name like '22222222-%'$$), 'ok:0');

-- =====================================================================
-- Northwind assessor
-- =====================================================================
reset role;
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a2","role":"authenticated"}', false);
select test.check('nw_assessor can create Northwind assessment', test.try(format($$insert into public.control_assessments (organisation_id, scf_id) values (%L, 'IAC-37')$$, :nw)), 'ok:1');
select test.check('nw_assessor can update Northwind assessment', test.try(format($$update public.control_assessments set status = 'implemented' where id = %L$$, :nw_assess)), 'ok:1');
select test.check('nw_assessor cannot delete assessments', test.try(format($$delete from public.control_assessments where id = %L$$, :nw_assess)), 'ok:0');
select test.check('nw_assessor cannot add members', test.try(format($$insert into public.memberships (organisation_id, user_id, role) values (%L, %L, 'assessor')$$, :nw, :outsider)), 'err:42501');
select test.check('nw_assessor cannot change roles', test.try(format($$update public.memberships set role = 'customer_admin' where user_id = %L$$, :nw_assessor)), 'ok:0');
select test.check('nw_assessor cannot use member RPC', test.try(format($$select public.add_organisation_member(%L, 'no.access@datadefenz.test', 'assessor')$$, :nw)), 'err:42501');
select test.check('nw_assessor can upload Northwind evidence file', test.try($$insert into storage.objects (bucket_id, name) values ('evidence', '11111111-1111-4111-8111-111111111111/a.txt')$$), 'ok:1');
select test.check('nw_assessor cannot delete evidence files', test.try($$delete from storage.objects where name like '11111111-%'$$), 'ok:0');
select test.check('nw_assessor sees no Brightwater assessments', test.try(format($$select * from public.control_assessments where organisation_id = %L$$, :bw)), 'ok:0');

-- =====================================================================
-- Northwind read-only
-- =====================================================================
reset role;
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a3","role":"authenticated"}', false);
select test.check('nw_viewer can read Northwind assessments', test.try('select * from public.control_assessments'), 'ok:1');
select test.check('nw_viewer cannot create assessments', test.try(format($$insert into public.control_assessments (organisation_id, scf_id) values (%L, 'IAC-37')$$, :nw)), 'err:42501');
select test.check('nw_viewer cannot update assessments', test.try(format($$update public.control_assessments set notes = 'x' where id = %L$$, :nw_assess)), 'ok:0');
select test.check('nw_viewer cannot create evidence records', test.try(format($$insert into public.evidence_items (organisation_id, title) values (%L, 'x')$$, :nw)), 'err:42501');
select test.check('nw_viewer can read Northwind files', test.try('select * from storage.objects'), 'ok:1');
select test.check('nw_viewer cannot upload files', test.try($$insert into storage.objects (bucket_id, name) values ('evidence', '11111111-1111-4111-8111-111111111111/v.txt')$$), 'err:42501');
select test.check('nw_viewer cannot rename organisation', test.try(format($$update public.organisations set name = 'x' where id = %L$$, :nw)), 'ok:0');

-- =====================================================================
-- Brightwater customer admin (the mirror image)
-- =====================================================================
reset role;
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000b1","role":"authenticated"}', false);
select test.check('bw_admin sees only own organisation', test.try('select * from public.organisations'), 'ok:1');
select test.check('bw_admin sees only Brightwater assessments', test.try(format($$select * from public.control_assessments where organisation_id = %L$$, :bw)), 'ok:1');
select test.check('bw_admin cannot read Northwind assessments', test.try(format($$select * from public.control_assessments where organisation_id = %L$$, :nw)), 'ok:0');
select test.check('bw_admin cannot read Northwind evidence records', test.try(format($$select * from public.evidence_items where organisation_id = %L$$, :nw)), 'ok:0');
select test.check('bw_admin cannot read Northwind memberships', test.try(format($$select * from public.memberships where organisation_id = %L$$, :nw)), 'ok:0');
select test.check('bw_admin cannot read Northwind files', test.try($$select * from storage.objects where name like '11111111-%'$$), 'ok:0');
select test.check('bw_admin cannot remove Northwind members', test.try(format($$delete from public.memberships where organisation_id = %L$$, :nw)), 'ok:0');

-- =====================================================================
-- Signed-in user with no memberships
-- =====================================================================
reset role;
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000c1","role":"authenticated"}', false);
select test.check('outsider sees no organisations', test.try('select * from public.organisations'), 'ok:0');
select test.check('outsider sees no assessments', test.try('select * from public.control_assessments'), 'ok:0');
select test.check('outsider sees no files', test.try('select * from storage.objects'), 'ok:0');
select test.check('outsider sees only own profile', test.try('select * from public.profiles'), 'ok:1');
select test.check('outsider can read the SCF library', test.try('select * from public.scf_controls'), 'ok:2');

-- =====================================================================
-- Platform owner (DATADEFENZ)
-- =====================================================================
reset role;
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a0","role":"authenticated"}', false);
select test.check('platform owner sees all organisations', test.try('select * from public.organisations'), 'ok:2');
select test.check('platform owner sees all memberships', test.try('select * from public.memberships'), 'ok:5');
select test.check('platform owner sees all assessments', test.try('select * from public.control_assessments'), 'ok:2');
select test.check('platform owner can create an organisation', test.try($$insert into public.organisations (name, slug) values ('Contoso Test Org', 'contoso-test')$$), 'ok:1');
select test.check('platform owner can add members anywhere', test.try(format($$select public.add_organisation_member(%L, 'no.access@datadefenz.test', 'read_only')$$, :bw)), 'ok:1');
select test.check('platform owner still cannot edit the SCF library', test.try($$update public.scf_controls set description = 'edited'$$), 'err:42501');
select test.check('platform owner cannot add platform owners via API', test.try(format($$insert into public.platform_owners (user_id) values (%L)$$, :outsider)), 'err:42501');

-- =====================================================================
-- Anonymous (not signed in)
-- =====================================================================
reset role;
set role anon;
select set_config('request.jwt.claims', '', false);
select test.check('anon cannot read organisations', test.try('select * from public.organisations'), 'err:42501');
select test.check('anon cannot read assessments', test.try('select * from public.control_assessments'), 'err:42501');
select test.check('anon cannot read the SCF library', test.try('select * from public.scf_controls'), 'err:42501');
select test.check('anon cannot read profiles', test.try('select * from public.profiles'), 'err:42501');
select test.check('anon cannot list files', test.try('select * from storage.objects'), 'ok:0');
select test.check('anon cannot call member RPC', test.try(format($$select public.add_organisation_member(%L, 'x@y.test', 'assessor')$$, :nw)), 'err:42501');
reset role;

\o
-- ---------------------------------------------------------------------
-- Report
-- ---------------------------------------------------------------------
select case when ok then 'PASS' else 'FAIL' end as result, name, got, expected
from test.results order by id;

select count(*) filter (where ok) as passed, count(*) filter (where not ok) as failed from test.results;

do $$
begin
  if exists (select 1 from test.results where not ok) then
    raise exception 'RLS isolation tests failed';
  end if;
end;
$$;
