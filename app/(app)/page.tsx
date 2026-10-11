import Link from "next/link";
import { Notice } from "@/components/Notice";
import { isPlatformOwner, requireUser, ROLE_LABELS, type OrgRole } from "@/lib/auth";

export const metadata = { title: "Organisations — DATADEFENZ GRC" };

export default async function HomePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const { supabase, user } = await requireUser();
  const owner = await isPlatformOwner(supabase, user.id);

  // RLS returns only organisations this user may see.
  const [{ data: orgs }, { data: mine }] = await Promise.all([
    supabase.from("organisations").select("id, name, slug").order("name"),
    supabase.from("memberships").select("organisation_id, role").eq("user_id", user.id)
  ]);
  const roleByOrg = new Map((mine ?? []).map((m) => [m.organisation_id as string, m.role as OrgRole]));

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Organisations</h1>
          <p className="muted">
            {owner ? "As a platform owner you can see every customer organisation." : "Customer organisations you are a member of."}
          </p>
        </div>
      </header>
      <Notice code={params.error ?? params.message} />
      {orgs && orgs.length > 0 ? (
        <ul className="org-list">
          {orgs.map((org) => {
            const role = roleByOrg.get(org.id);
            return (
              <li key={org.id} className="card org-card">
                <Link href={`/orgs/${org.id}`} className="org-link">
                  <strong>{org.name}</strong>
                  <span className="muted small">{org.slug}</span>
                </Link>
                <span className="pill">{role ? ROLE_LABELS[role] : "Platform owner access"}</span>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="card empty-state">
          <p>You are not a member of any organisation yet. Ask a DATADEFENZ platform owner to add you.</p>
        </div>
      )}
    </>
  );
}
