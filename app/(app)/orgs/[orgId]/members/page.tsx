import Link from "next/link";
import { notFound } from "next/navigation";
import { Notice } from "@/components/Notice";
import { SubmitButton } from "@/components/SubmitButton";
import { isPlatformOwner, requireUser, roleIn, ROLE_LABELS, UUID_RE, type OrgRole } from "@/lib/auth";
import { addMember, changeRole, removeMember } from "./actions";

export default async function MembersPage({ params, searchParams }: {
  params: Promise<{ orgId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { orgId } = await params;
  const query = await searchParams;
  if (!UUID_RE.test(orgId)) notFound();

  const { supabase, user } = await requireUser();
  const { data: org } = await supabase.from("organisations").select("id, name").eq("id", orgId).maybeSingle();
  if (!org) notFound();

  const [role, owner, { data: members }] = await Promise.all([
    roleIn(supabase, orgId, user.id),
    isPlatformOwner(supabase, user.id),
    supabase.from("memberships").select("id, role, user_id, profiles(email, full_name)").eq("organisation_id", orgId)
  ]);
  if (!owner && role !== "customer_admin") notFound();

  const roleOptions = (Object.keys(ROLE_LABELS) as OrgRole[]).map((r) => (
    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
  ));

  return (
    <>
      <header className="page-head">
        <div>
          <p className="muted small"><Link href="/">Organisations</Link> / <Link href={`/orgs/${orgId}`}>{org.name}</Link> /</p>
          <h1>Members</h1>
          <p className="muted">Add existing user accounts to this organisation and set their role.</p>
        </div>
      </header>
      <Notice code={query.message} />

      <section className="card">
        <h2>Add a member</h2>
        <form action={addMember.bind(null, orgId)} className="form form-inline">
          <label><span>Email</span><input name="email" type="email" required /></label>
          <label><span>Role</span><select name="role" defaultValue="read_only">{roleOptions}</select></label>
          <SubmitButton pendingText="Adding…">Add member</SubmitButton>
        </form>
        <p className="hint">The person must already have an account. Platform owners create accounts by inviting users in Supabase Auth.</p>
      </section>

      <section className="card">
        <h2>Current members</h2>
        <ul className="member-list">
          {(members ?? []).map((m) => {
            const profile = m.profiles as unknown as { email: string; full_name: string | null } | null;
            return (
              <li key={m.id}>
                <span>
                  <strong>{profile?.full_name ?? profile?.email}</strong>
                  <span className="muted small">{profile?.email}{m.user_id === user.id ? " (you)" : ""}</span>
                </span>
                <span className="member-actions">
                  <form action={changeRole.bind(null, orgId, m.id)} className="form-inline">
                    <select name="role" defaultValue={m.role} aria-label="Role">{roleOptions}</select>
                    <SubmitButton className="btn btn-ghost" pendingText="Saving…">Save</SubmitButton>
                  </form>
                  <form action={removeMember.bind(null, orgId, m.id)}>
                    <SubmitButton className="btn btn-danger" pendingText="Removing…">Remove</SubmitButton>
                  </form>
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
