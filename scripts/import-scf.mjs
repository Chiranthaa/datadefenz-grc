// Loads the SCF 2026.3 control library into Supabase, verbatim, from
// data/scf/scf-2026.3-eight-frameworks.json. Safe to re-run.
// Uses the service-role/secret key from .env.local. Run: npm run scf:import

import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { clientOptions, secretKey, supabaseUrl } from "./_env.mjs";

const FILE = new URL("../data/scf/scf-2026.3-eight-frameworks.json", import.meta.url);
const BATCH = 500;

const scf = JSON.parse(await readFile(FILE, "utf8"));
const db = createClient(supabaseUrl(), secretKey(), clientOptions);
const meta = scf.metadata;

async function run(label, promise) {
  const { error } = await promise;
  if (error) {
    console.error(`${label} failed: ${error.message}`);
    process.exit(1);
  }
}

async function inBatches(rows, fn) {
  for (let i = 0; i < rows.length; i += BATCH) await fn(rows.slice(i, i + BATCH));
}

const groupOfSource = {};
scf.framework_groups.forEach((g) => g.source_names.forEach((name) => { groupOfSource[name] = g.id; }));

await run("Library metadata", db.from("scf_library").upsert({
  version: meta.version,
  source: meta.source,
  source_url: meta.source_url,
  license: meta.license,
  license_url: meta.license_url,
  terms_url: meta.terms_url,
  notice: meta.notice,
  imported_at: new Date().toISOString()
}));

await run("Framework groups", db.from("scf_framework_groups").upsert(
  scf.framework_groups.map((g, i) => ({ id: g.id, name: g.name, source_names: g.source_names, sort_order: i }))
));

const controls = scf.controls.map((c, i) => ({
  scf_id: c.scf_id,
  library_version: meta.version,
  scf_domain: c.scf_domain,
  scf_domain_identifier: c.scf_domain_identifier,
  scf_control_name: c.scf_control_name,
  description: c.description,
  control_question: c.control_question,
  sort_order: i
}));
await inBatches(controls, (rows) => run("Controls", db.from("scf_controls").upsert(rows)));

// The library holds one SCF version: replace all mappings so re-runs stay exact.
await run("Clearing mappings", db.from("scf_mappings").delete().gte("id", 0));

const mappings = [];
for (const c of scf.controls) {
  c.mappings.forEach((m, i) => {
    const groupId = groupOfSource[m.framework];
    if (!groupId) {
      console.error(`Mapping framework "${m.framework}" on ${c.scf_id} is not in any framework group.`);
      process.exit(1);
    }
    mappings.push({
      scf_id: c.scf_id,
      group_id: groupId,
      framework: m.framework,
      focal_document_identifier: m.focal_document_identifier,
      focal_document_name: m.focal_document_name,
      ids: m.ids,
      sort_order: i
    });
  });
}
await inBatches(mappings, (rows) => run("Mappings", db.from("scf_mappings").insert(rows)));

const [{ count: controlCount }, { count: mappingCount }] = await Promise.all([
  db.from("scf_controls").select("*", { count: "exact", head: true }),
  db.from("scf_mappings").select("*", { count: "exact", head: true })
]);
console.log(`Imported ${meta.source} ${meta.version}: ${controlCount} controls, ${mappingCount} mapping rows, ${scf.framework_groups.length} framework groups.`);
if (controlCount !== scf.controls.length || mappingCount !== mappings.length) {
  console.error(`Count mismatch: expected ${scf.controls.length} controls and ${mappings.length} mappings.`);
  process.exit(1);
}
