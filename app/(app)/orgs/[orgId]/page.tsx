import Link from "next/link";
import { Disclaimer, OrgTabs } from "@/components/OrgTabs";
import { DISCLAIMER, getOrgContext, pct } from "@/lib/compliance";

type GroupStats = {
  group_id: string; total: number; implemented: number; partial: number; not_implemented: number;
  not_applicable: number; not_assessed: number; evidence_missing: number;
};
type Dashboard = {
  total: number;
  status: Record<"implemented" | "partially_implemented" | "not_implemented" | "not_applicable" | "not_assessed", number>;
  evidence: { needs_evidence: number; provided: number; partially_provided: number; not_provided: number };
  framework_specific: number;
  groups: GroupStats[];
};

const SEGMENTS = [
  ["implemented", "Implemented"],
  ["partially_implemented", "Partially implemented"],
  ["not_implemented", "Not implemented"],
  ["not_applicable", "Not applicable"],
  ["not_assessed", "Not assessed"]
] as const;

export default async function OrganisationDashboard({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  const ctx = await getOrgContext(orgId);
  const { supabase, org, groupById } = ctx;

  const [{ data }, { data: recent }] = await Promise.all([
    supabase.rpc("org_dashboard", { p_organisation_id: orgId }),
    supabase
      .from("control_assessments")
      .select("scf_id, status, evidence_status, updated_at, scf_controls(scf_control_name)")
      .eq("organisation_id", orgId)
      .order("updated_at", { ascending: false })
      .limit(5)
  ]);
  const d = data as Dashboard | null;
  const req = (q: string) => `/orgs/${orgId}/requirements?${q}`;

  if (!d || ctx.selected.size === 0) {
    return (
      <>
        <OrgTabs orgId={orgId} orgName={org.name} active="overview" showMembers={ctx.canManageScope} />
        <section className="card empty-state">
          <h2>No frameworks selected yet</h2>
          <p>Choose which frameworks apply to {org.name} to build its unified requirements list.</p>
          <Link className="btn btn-primary" href={`/orgs/${orgId}/frameworks`}>Choose frameworks</Link>
        </section>
      </>
    );
  }

  const s = d.status;
  const applicable = d.total - s.not_applicable;
  const assessed = d.total - s.not_assessed;
  const gaps = s.not_implemented + s.partially_implemented;

  return (
    <>
      <OrgTabs orgId={orgId} orgName={org.name} active="overview" showMembers={ctx.canManageScope} />
      <Disclaimer text={DISCLAIMER} />

      <section className="kpis" aria-label="Key figures">
        <Link className="card kpi" href={req("")}>
          <span className="kpi-label">Unified requirements</span>
          <span className="kpi-value">{d.total}</span>
          <span className="kpi-sub">across {ctx.selected.size} selected framework{ctx.selected.size === 1 ? "" : "s"}</span>
        </Link>
        <Link className="card kpi" href={req("status=not_assessed")}>
          <span className="kpi-label">Assessment progress</span>
          <span className="kpi-value">{pct(assessed, d.total)}%</span>
          <span className="kpi-sub">{assessed} assessed · {s.not_assessed} still to assess</span>
        </Link>
        <Link className="card kpi kpi-warn" href={req("status=gaps")}>
          <span className="kpi-label">Open gaps</span>
          <span className="kpi-value">{gaps}</span>
          <span className="kpi-sub">{s.not_implemented} not implemented · {s.partially_implemented} partial</span>
        </Link>
        <Link className="card kpi" href={req("evidence=missing")}>
          <span className="kpi-label">Evidence still missing</span>
          <span className="kpi-value">{d.evidence.not_provided + d.evidence.partially_provided}</span>
          <span className="kpi-sub">of {d.evidence.needs_evidence} implemented or partial requirements</span>
        </Link>
      </section>

      <section className="card">
        <div className="card-head"><h2>Assessment status</h2><span className="muted small">{applicable} applicable · {s.not_applicable} marked not applicable</span></div>
        <div className="stacked stacked-lg" role="img" aria-label="Assessment status breakdown">
          {SEGMENTS.filter(([k]) => s[k] > 0).map(([k, label]) => (
            <span key={k} className={`seg status-${k}`} style={{ flex: s[k] }} title={`${label}: ${s[k]}`} />
          ))}
        </div>
        <ul className="legend">
          {SEGMENTS.map(([k, label]) => (
            <li key={k}><Link href={req(`status=${k}`)}><span className={`dot status-${k}`} />{label} <strong>{s[k]}</strong></Link></li>
          ))}
        </ul>
      </section>

      <section className="card">
        <div className="card-head"><h2>Evidence</h2><span className="muted small">Tracked separately: “Implemented” does not mean evidence has been provided</span></div>
        <div className="evidence-grid">
          <div><span className="kpi-value small-value">{d.evidence.provided}</span><span className="muted small">Evidence provided</span></div>
          <div><span className="kpi-value small-value">{d.evidence.partially_provided}</span><span className="muted small">Partially provided</span></div>
          <div><span className="kpi-value small-value warn">{d.evidence.not_provided}</span><span className="muted small">Not provided</span></div>
        </div>
      </section>

      <section className="card">
        <div className="card-head"><h2>By framework</h2><span className="muted small">A requirement shared by several frameworks counts once in each</span></div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Framework</th><th className="num">Requirements</th><th className="num">Assessed</th><th className="num">Gaps</th><th className="num">Evidence missing</th><th>Progress</th></tr></thead>
            <tbody>
              {d.groups.map((g) => {
                const done = g.total - g.not_assessed;
                return (
                  <tr key={g.group_id}>
                    <td><Link href={req(`fw=${g.group_id}`)}>{groupById.get(g.group_id)?.name ?? g.group_id}</Link></td>
                    <td className="num">{g.total}</td>
                    <td className="num">{done}</td>
                    <td className="num"><Link href={req(`fw=${g.group_id}&status=gaps`)}>{g.not_implemented + g.partial}</Link></td>
                    <td className="num"><Link href={req(`fw=${g.group_id}&evidence=missing`)}>{g.evidence_missing}</Link></td>
                    <td className="bar-cell"><div className="meter" role="img" aria-label={`${pct(done, g.total)}% assessed`}><span style={{ width: `${pct(done, g.total)}%` }} /></div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="hint">{d.framework_specific} requirement{d.framework_specific === 1 ? " is" : "s are"} framework-specific (the SCF maps {d.framework_specific === 1 ? "it" : "them"} to only one of the eight frameworks). <Link href={req("specific=1")}>Show them</Link>.</p>
      </section>

      <section className="card">
        <div className="card-head"><h2>Recently updated</h2></div>
        {recent && recent.length > 0 ? (
          <ul className="member-list">
            {recent.map((r) => {
              const control = r.scf_controls as unknown as { scf_control_name: string } | null;
              return (
                <li key={r.scf_id}>
                  <Link href={`/orgs/${orgId}/requirements/${encodeURIComponent(r.scf_id)}`}><code>{r.scf_id}</code> {control?.scf_control_name}</Link>
                  <span className="muted small">{new Date(r.updated_at).toLocaleDateString("en-GB")}</span>
                </li>
              );
            })}
          </ul>
        ) : <p className="empty">No assessments recorded yet.</p>}
      </section>
    </>
  );
}
