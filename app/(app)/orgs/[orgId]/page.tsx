import Link from "next/link";
import { notFound } from "next/navigation";
import { isPlatformOwner, requireUser, roleIn, ROLE_LABELS, UUID_RE, type OrgRole } from "@/lib/auth";

const STATUS_LABELS: Record<string, string> = {
  not_assessed: "Not assessed",
  implemented: "Implemented",
  partially_implemented: "Partially implemented",
  not_implemented: "Not implemented",
  not_applicable: "Not applicable"
};

export default async function OrganisationPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  if (!UUID_RE.test(orgId)) notFound();

  const { supabase, user } = await requireUser();
  // RLS: returns nothing for organisations the user does not belong to.
  const { data: org } = await supabase.from("organisations").select("id, name, slug").eq("id", orgId).maybeSingle();
  if (!org) notFound();

  const [role, owner, members, assessments, evidence] = await Promise.all([
    roleIn(supabase, orgId, user.id),
    isPlatformOwner(supabase, user.id),
    supabase.from("memberships").select("id, role, profiles(email, full_name)").eq("organisation_id", orgId),
    supabase
      .from("control_assessments")
      .select("id, scf_id, status, owner_name, notes, assessed_on, scf_controls(scf_control_name)")
      .eq("organisation_id", orgId)
      .order("scf_id"),
    supabase.from("evidence_items").select("id, title, storage_path, created_at").eq("organisation_id", orgId).order("created_at")
  ]);
  const canManage = owner || role === "customer_admin";

  return (
    <>
      <header className="page-head">
        <div>
          <p className="muted small"><Link href="/">Organisations</Link> /</p>
          <h1>{org.name}</h1>
          <p className="muted">Your access: {role ? ROLE_LABELS[role] : "Platform owner"}</p>
        </div>
        {canManage && <Link href={`/orgs/${orgId}/members`} className="btn btn-primary">Manage members</Link>}
      </header>

      <section className="card">
        <div className="card-head"><h2>Control assessments</h2><span className="muted small">{assessments.data?.length ?? 0} records</span></div>
        {assessments.data && assessments.data.length > 0 ? (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>SCF control</th><th>Status</th><th>Owner</th><th>Assessed</th><th>Notes</th></tr></thead>
              <tbody>
                {assessments.data.map((a) => {
                  const control = a.scf_controls as unknown as { scf_control_name: string } | null;
                  return (
                    <tr key={a.id}>
                      <td><Link href={`/controls/${encodeURIComponent(a.scf_id)}`}><code>{a.scf_id}</code></Link> {control?.scf_control_name}</td>
                      <td><span className={`badge status-${a.status}`}><span className="dot" />{STATUS_LABELS[a.status] ?? a.status}</span></td>
                      <td>{a.owner_name ?? "—"}</td>
                      <td>{a.assessed_on ?? "—"}</td>
                      <td className="notes">{a.notes ?? ""}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="empty">No assessments recorded yet.</p>
        )}
        <p className="hint">Assessment editing arrives in a later iteration. Records shown here are protected by organisation-level Row Level Security.</p>
      </section>

      <div className="grid-2">
        <section className="card">
          <div className="card-head"><h2>Members</h2><span className="muted small">{members.data?.length ?? 0}</span></div>
          <ul className="member-list">
            {(members.data ?? []).map((m) => {
              const profile = m.profiles as unknown as { email: string; full_name: string | null } | null;
              return (
                <li key={m.id}>
                  <span><strong>{profile?.full_name ?? profile?.email}</strong><span className="muted small">{profile?.email}</span></span>
                  <span className="pill">{ROLE_LABELS[m.role as OrgRole]}</span>
                </li>
              );
            })}
          </ul>
        </section>
        <section className="card">
          <div className="card-head"><h2>Evidence records</h2><span className="muted small">Private storage</span></div>
          {evidence.data && evidence.data.length > 0 ? (
            <ul className="member-list">
              {evidence.data.map((e) => (
                <li key={e.id}><span><strong>{e.title}</strong><span className="muted small">{e.storage_path ?? "No file"}</span></span></li>
              ))}
            </ul>
          ) : (
            <p className="empty">No evidence recorded yet.</p>
          )}
        </section>
      </div>
    </>
  );
}
