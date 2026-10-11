// Verifies, against your real Supabase project and through the same API the
// app uses (publishable/anon key + user sessions), that the two fictional
// test organisations cannot read or change each other's records or files.
// Run after `npm run seed:test`:  npm run verify:isolation

import { createClient } from "@supabase/supabase-js";
import { clientOptions, publishableKey, supabaseUrl, testPassword, TEST_USERS } from "./_env.mjs";

const url = supabaseUrl();
const key = publishableKey();
const password = testPassword();
const results = [];

function check(name, pass, detail = "") {
  results.push({ name, pass, detail });
}

async function signIn(userKey) {
  const user = TEST_USERS.find((u) => u.key === userKey);
  const client = createClient(url, key, clientOptions);
  const { error } = await client.auth.signInWithPassword({ email: user.email, password });
  if (error) {
    console.error(`Could not sign in as ${user.email}: ${error.message}. Did you run npm run seed:test?`);
    process.exit(1);
  }
  return client;
}

const rows = (res) => (res.error ? null : res.data ?? []);
const denied = (res) => Boolean(res.error) || (Array.isArray(res.data) && res.data.length === 0);

// Organisation ids, looked up as the platform owner.
const owner = await signIn("owner");
const allOrgs = rows(await owner.from("organisations").select("id, slug")) ?? [];
const id = Object.fromEntries(allOrgs.map((o) => [o.slug, o.id]));
const NW = id["northwind-test"];
const BW = id["brightwater-test"];
if (!NW || !BW) {
  console.error("Test organisations not found. Run npm run seed:test first.");
  process.exit(1);
}
check("platform owner sees both test organisations", Boolean(NW && BW));

async function crossTenantChecks(label, client, ownOrg, otherOrg) {
  const orgs = rows(await client.from("organisations").select("id"));
  check(`${label}: sees only its own organisation`, orgs?.length === 1 && orgs[0].id === ownOrg, JSON.stringify(orgs));

  const own = rows(await client.from("control_assessments").select("id, organisation_id"));
  check(`${label}: reads its own assessments`, own?.length > 0 && own.every((r) => r.organisation_id === ownOrg));

  check(`${label}: cannot read other org's assessments`,
    denied(await client.from("control_assessments").select("id").eq("organisation_id", otherOrg)));
  check(`${label}: cannot read other org's evidence records`,
    denied(await client.from("evidence_items").select("id").eq("organisation_id", otherOrg)));
  check(`${label}: cannot read other org's memberships`,
    denied(await client.from("memberships").select("id").eq("organisation_id", otherOrg)));

  const insert = await client.from("control_assessments").insert({ organisation_id: otherOrg, scf_id: "GOV-02" }).select();
  check(`${label}: cannot create records in other org`, Boolean(insert.error), insert.error?.code);

  check(`${label}: cannot update other org's assessments`,
    denied(await client.from("control_assessments").update({ notes: "cross-tenant write" }).eq("organisation_id", otherOrg).select()));
  check(`${label}: cannot delete other org's assessments`,
    denied(await client.from("control_assessments").delete().eq("organisation_id", otherOrg).select()));

  const firstOwn = own?.[0];
  if (firstOwn) {
    const move = await client.from("control_assessments").update({ organisation_id: otherOrg }).eq("id", firstOwn.id).select();
    check(`${label}: cannot move a record to other org`, Boolean(move.error), move.error?.code);
  }

  const rpc = await client.rpc("add_organisation_member", { p_organisation_id: otherOrg, p_email: "viewer@northwind.test", p_role: "read_only" });
  check(`${label}: cannot add members to other org`, Boolean(rpc.error), rpc.error?.code);

  const list = await client.storage.from("evidence").list(otherOrg);
  check(`${label}: cannot list other org's files`, denied(list));
  const download = await client.storage.from("evidence").download(`${otherOrg}/fictional-policy.txt`);
  check(`${label}: cannot download other org's file`, Boolean(download.error));
  const upload = await client.storage.from("evidence")
    .upload(`${otherOrg}/cross-tenant.txt`, new Blob(["x"], { type: "text/plain" }), { upsert: true });
  check(`${label}: cannot upload into other org's folder`, Boolean(upload.error));

  const ownFile = await client.storage.from("evidence").download(`${ownOrg}/fictional-policy.txt`);
  check(`${label}: can download its own file`, !ownFile.error);
}

await crossTenantChecks("Northwind admin", await signIn("nwAdmin"), NW, BW);
await crossTenantChecks("Brightwater admin", await signIn("bwAdmin"), BW, NW);

// Role checks inside one organisation.
const viewer = await signIn("nwViewer");
const viewerInsert = await viewer.from("control_assessments").insert({ organisation_id: NW, scf_id: "GOV-02" }).select();
check("read-only user cannot create records", Boolean(viewerInsert.error), viewerInsert.error?.code);
check("read-only user cannot update records",
  denied(await viewer.from("control_assessments").update({ notes: "x" }).eq("organisation_id", NW).select()));

const assessor = await signIn("nwAssessor");
check("assessor cannot delete records",
  denied(await assessor.from("control_assessments").delete().eq("organisation_id", NW).select()));
const assessorRpc = await assessor.rpc("add_organisation_member", { p_organisation_id: NW, p_email: "admin@brightwater.test", p_role: "assessor" });
check("assessor cannot add members", Boolean(assessorRpc.error), assessorRpc.error?.code);

// Shared SCF library: readable, never writable.
const scfCount = await assessor.from("scf_controls").select("*", { count: "exact", head: true });
check("SCF library is readable by signed-in users", !scfCount.error && scfCount.count > 0, `${scfCount.count} controls`);
const scfEdit = await owner.from("scf_controls").update({ description: "edited" }).eq("scf_id", "GOV-02").select();
check("SCF library cannot be edited, even by a platform owner", denied(scfEdit));

const ownerSelf = await owner.from("platform_owners").insert({ user_id: (await viewer.auth.getUser()).data.user.id });
check("platform owners cannot be added through the API", Boolean(ownerSelf.error), ownerSelf.error?.code);

// Not signed in.
const anon = createClient(url, key, clientOptions);
check("anonymous visitor cannot read organisations", denied(await anon.from("organisations").select("id")));
check("anonymous visitor cannot read assessments", denied(await anon.from("control_assessments").select("id")));
check("anonymous visitor cannot read the SCF library", denied(await anon.from("scf_controls").select("scf_id").limit(1)));

// Report.
for (const r of results) console.log(`${r.pass ? "PASS" : "FAIL"}  ${r.name}${!r.pass && r.detail ? `  (${r.detail})` : ""}`);
const failed = results.filter((r) => !r.pass).length;
console.log(`\n${results.length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
