import Link from "next/link";
import { Disclaimer, OrgTabs } from "@/components/OrgTabs";
import { AssessmentBadge, EvidenceBadge } from "@/components/StatusBadges";
import { ASSESSMENT_LABELS, DISCLAIMER, EVIDENCE_LABELS, getOrgContext, sortGroupIds, type OrgRequirementRow } from "@/lib/compliance";

const PAGE_SIZE = 50;
type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");

export default async function RequirementsPage({ params, searchParams }: {
  params: Promise<{ orgId: string }>;
  searchParams: Promise<Params>;
}) {
  const { orgId } = await params;
  const sp = await searchParams;
  const ctx = await getOrgContext(orgId);
  const { supabase, groups, groupById, selectedGroups } = ctx;

  const fw = selectedGroups.some((g) => g.id === one(sp.fw)) ? one(sp.fw) : "";
  const status = one(sp.status);
  const evidence = one(sp.evidence);
  const domain = one(sp.domain).slice(0, 200);
  const q = one(sp.q).trim().slice(0, 100);
  const specific = one(sp.specific) === "1";
  const page = Math.max(1, Number.parseInt(one(sp.page) || "1", 10) || 1);

  const { data: domains } = await supabase.rpc("scf_domains");

  let query = supabase.rpc("org_requirements", { p_organisation_id: orgId }, { count: "exact" });
  if (fw) query = query.contains("selected_groups", [fw]);
  if (status === "gaps") query = query.in("status", ["not_implemented", "partially_implemented"]);
  else if (status in ASSESSMENT_LABELS) query = query.eq("status", status);
  if (evidence === "missing") query = query.in("status", ["implemented", "partially_implemented"]).neq("evidence_status", "provided");
  else if (evidence in EVIDENCE_LABELS) query = query.eq("evidence_status", evidence);
  if (domain) query = query.eq("scf_domain", domain);
  if (specific) query = query.eq("all_group_count", 1);
  if (q) {
    const term = q.replace(/[%_,()\\*]/g, " ");
    query = query.or(`scf_id.ilike.*${term}*,scf_control_name.ilike.*${term}*,owner_name.ilike.*${term}*`);
  }
  const { data, count, error } = await query.order("sort_order").range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  const rows = (data ?? []) as OrgRequirementRow[];
  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const link = (p: number) => {
    const u = new URLSearchParams();
    if (fw) u.set("fw", fw);
    if (status) u.set("status", status);
    if (evidence) u.set("evidence", evidence);
    if (domain) u.set("domain", domain);
    if (q) u.set("q", q);
    if (specific) u.set("specific", "1");
    if (p > 1) u.set("page", String(p));
    const s = u.toString();
    return `/orgs/${orgId}/requirements${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <OrgTabs orgId={orgId} orgName={ctx.org.name} active="requirements" showMembers={ctx.canManageScope} />
      {selectedGroups.length === 0 ? (
        <section className="card empty-state">
          <p>No frameworks are selected yet.</p>
          <Link className="btn btn-primary" href={`/orgs/${orgId}/frameworks`}>Choose frameworks</Link>
        </section>
      ) : (
        <>
          <Disclaimer text={DISCLAIMER} />
          <form className="card toolbar" method="get">
            <label className="grow"><span>Search</span><input name="q" defaultValue={q} placeholder="SCF ID, requirement or owner" /></label>
            <label>
              <span>Framework</span>
              <select name="fw" defaultValue={fw}>
                <option value="">All selected</option>
                {selectedGroups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </label>
            <label>
              <span>Assessment</span>
              <select name="status" defaultValue={status}>
                <option value="">Any status</option>
                <option value="gaps">Gaps (not or partially implemented)</option>
                {Object.entries(ASSESSMENT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
            <label>
              <span>Evidence</span>
              <select name="evidence" defaultValue={evidence}>
                <option value="">Any</option>
                <option value="missing">Missing (implemented/partial without full evidence)</option>
                {Object.entries(EVIDENCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
            <label>
              <span>SCF domain</span>
              <select name="domain" defaultValue={domain}>
                <option value="">All domains</option>
                {((domains ?? []) as string[]).map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </label>
            <label className="check"><input type="checkbox" name="specific" value="1" defaultChecked={specific} /> <span>Framework-specific only</span></label>
            <button type="submit" className="btn btn-primary">Apply</button>
            <Link className="btn btn-ghost" href={`/orgs/${orgId}/requirements`}>Clear</Link>
          </form>

          <p className="muted">
            {error ? "Requirements could not be loaded." : `${total} unified requirement${total === 1 ? "" : "s"} · page ${page} of ${pages}`}
          </p>

          <ul className="requirement-list">
            {rows.map((r) => {
              const evidenceApplies = r.status === "implemented" || r.status === "partially_implemented";
              return (
                <li key={r.scf_id} className="card requirement-row">
                  <Link href={`/orgs/${orgId}/requirements/${encodeURIComponent(r.scf_id)}`} className="requirement-main">
                    <span className="requirement-title"><code>{r.scf_id}</code> <strong>{r.scf_control_name}</strong></span>
                    <span className="requirement-meta">
                      <span className="muted small">{r.scf_domain}</span>
                      {sortGroupIds(r.selected_groups, groups).map((id) => (
                        <span key={id} className="fw-tag">{groupById.get(id)?.name ?? id}</span>
                      ))}
                      {r.all_group_count === 1 && <span className="tag tag-specific">Framework-specific</span>}
                    </span>
                  </Link>
                  <span className="requirement-status">
                    <AssessmentBadge status={r.status} />
                    {(evidenceApplies || r.evidence_status !== "not_provided") && <EvidenceBadge status={r.evidence_status} />}
                  </span>
                </li>
              );
            })}
          </ul>
          {rows.length === 0 && !error && <p className="empty">No requirements match these filters.</p>}

          <nav className="pager" aria-label="Pages">
            {page > 1 && <Link className="btn btn-ghost" href={link(page - 1)}>Previous</Link>}
            {page < pages && <Link className="btn btn-ghost" href={link(page + 1)}>Next</Link>}
          </nav>
        </>
      )}
    </>
  );
}
