// Creates FICTIONAL test accounts, two test organisations, memberships,
// sample assessments, evidence records and evidence files.
// For a development/test Supabase project only. Run: npm run seed:test
//
// Requires in .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY
// (or SUPABASE_SERVICE_ROLE_KEY), SEED_TEST_PASSWORD, and
// SEED_TARGET_IS_TEST_PROJECT=yes as a deliberate safety switch.

import { createClient } from "@supabase/supabase-js";
import { clientOptions, requireEnv, secretKey, supabaseUrl, testPassword, TEST_ORGS, TEST_USERS } from "./_env.mjs";

if (requireEnv("SEED_TARGET_IS_TEST_PROJECT") !== "yes") {
  console.error("Refusing to seed: set SEED_TARGET_IS_TEST_PROJECT=yes only for a test project.");
  process.exit(1);
}

const db = createClient(supabaseUrl(), secretKey(), clientOptions);
const password = testPassword();

function must({ data, error }, label) {
  if (error) {
    console.error(`${label}: ${error.message}`);
    process.exit(1);
  }
  return data;
}

// --- users ---------------------------------------------------------------
const existing = new Map();
for (let page = 1; ; page++) {
  const data = must(await db.auth.admin.listUsers({ page, perPage: 1000 }), "Listing users");
  data.users.forEach((u) => existing.set(u.email?.toLowerCase(), u));
  if (data.users.length < 1000) break;
}

const userIds = {};
for (const u of TEST_USERS) {
  const found = existing.get(u.email);
  if (found) {
    must(await db.auth.admin.updateUserById(found.id, { password, user_metadata: { full_name: u.fullName } }), `Updating ${u.email}`);
    userIds[u.key] = found.id;
  } else {
    const data = must(await db.auth.admin.createUser({
      email: u.email, password, email_confirm: true, user_metadata: { full_name: u.fullName }
    }), `Creating ${u.email}`);
    userIds[u.key] = data.user.id;
  }
  must(await db.from("profiles").update({ full_name: u.fullName }).eq("id", userIds[u.key]), `Profile ${u.email}`);
}

// --- organisations and memberships ----------------------------------------
const orgs = must(await db.from("organisations").upsert(TEST_ORGS, { onConflict: "slug" }).select("id, slug"), "Organisations");
const orgId = Object.fromEntries(orgs.map((o) => [o.slug, o.id]));

for (const u of TEST_USERS) {
  if (u.platformOwner) {
    must(await db.from("platform_owners").upsert({ user_id: userIds[u.key] }), "Platform owner");
  } else {
    must(await db.from("memberships").upsert(
      { organisation_id: orgId[u.org], user_id: userIds[u.key], role: u.role },
      { onConflict: "organisation_id,user_id" }
    ), `Membership ${u.email}`);
  }
}

// --- framework scope (fictional choices) ------------------------------------
const SCOPES = {
  "northwind-test": ["iso27001", "iec62443", "nist80082", "nis2"],
  "brightwater-test": ["iso27001", "nis2", "gdpr", "soc2"]
};
for (const [slug, groupIds] of Object.entries(SCOPES)) {
  must(await db.from("organisation_frameworks").upsert(
    groupIds.map((group_id) => ({ organisation_id: orgId[slug], group_id })),
    { onConflict: "organisation_id,group_id" }
  ), `Framework scope ${slug}`);
}

// --- fictional assessment and evidence records -----------------------------
const { count } = await db.from("scf_controls").select("*", { count: "exact", head: true });
if (!count) {
  console.error("The SCF library is empty. Run `npm run scf:import` first.");
  process.exit(1);
}

const SAMPLES = {
  "northwind-test": [
    ["IAC-37", "partially_implemented", "partially_provided", "Test IAM Lead", "FICTIONAL: MFA enforced for VPN; OT jump host pending."],
    ["NET-06", "partially_implemented", "not_provided", "Test OT Engineer", "FICTIONAL: OT DMZ exists; broad rules between levels 2 and 3."],
    ["BCD-24", "implemented", "provided", "Test IT Ops Lead", "FICTIONAL: Immutable backups with quarterly restore tests."],
    ["GOV-02", "implemented", "not_provided", "Test CISO", "FICTIONAL: Programme charter approved; evidence still to be collected."]
  ],
  "brightwater-test": [
    ["IAC-37", "implemented", "provided", "Test Security Manager", "FICTIONAL: MFA enforced for all remote and privileged access."],
    ["IRO-08", "not_implemented", "not_provided", "Test CISO", "FICTIONAL: Incident response plan not yet drafted."],
    ["TPM-10", "partially_implemented", "partially_provided", "Test Procurement Lead", "FICTIONAL: Supplier risk reviews for SaaS only."]
  ]
};

for (const [slug, rows] of Object.entries(SAMPLES)) {
  const org = orgId[slug];
  const assessments = must(await db.from("control_assessments").upsert(
    rows.map(([scf_id, status, evidence_status, owner_name, notes]) => ({
      organisation_id: org, scf_id, status, evidence_status, owner_name, notes, assessed_on: "2026-09-15"
    })),
    { onConflict: "organisation_id,scf_id" }
  ).select("id, scf_id"), `Assessments ${slug}`);

  const path = `${org}/fictional-policy.txt`;
  const file = new Blob([`FICTIONAL test evidence for ${slug}. Not real customer data.\n`], { type: "text/plain" });
  must(await db.storage.from("evidence").upload(path, file, { upsert: true, contentType: "text/plain" }), `Evidence file ${slug}`);

  must(await db.from("evidence_items").delete().eq("organisation_id", org).eq("storage_path", path), `Evidence reset ${slug}`);
  must(await db.from("evidence_items").insert({
    organisation_id: org,
    assessment_id: assessments[0].id,
    title: "Fictional security policy (test file)",
    description: "FICTIONAL evidence record created by seed-test-data.mjs.",
    storage_path: path
  }), `Evidence record ${slug}`);
}

console.log("Seeded fictional test data:");
for (const u of TEST_USERS) {
  console.log(`  ${u.email.padEnd(34)} ${u.platformOwner ? "platform owner" : `${u.role} @ ${u.org}`}`);
}
console.log("All test accounts use the SEED_TEST_PASSWORD value from your .env.local.");
