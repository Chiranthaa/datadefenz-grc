import Link from "next/link";
import { notFound } from "next/navigation";
import { Notice } from "@/components/Notice";
import { SubmitButton } from "@/components/SubmitButton";
import { isPlatformOwner, requireUser } from "@/lib/auth";
import { createOrganisation } from "./actions";

export const metadata = { title: "Platform admin — DATADEFENZ GRC" };

export default async function AdminPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const { supabase, user } = await requireUser();
  if (!(await isPlatformOwner(supabase, user.id))) notFound();

  const { data: orgs } = await supabase.from("organisations").select("id, name, slug, created_at, memberships(count)").order("name");

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Platform admin</h1>
          <p className="muted">Create customer organisations. Add each customer&apos;s first admin from the organisation&apos;s Members page.</p>
        </div>
      </header>
      <Notice code={params.message} />

      <section className="card">
        <h2>New organisation</h2>
        <form action={createOrganisation} className="form form-inline">
          <label><span>Name</span><input name="name" required minLength={2} maxLength={200} /></label>
          <label><span>Short name</span><input name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={63} placeholder="e.g. acme-energy" /></label>
          <SubmitButton pendingText="Creating…">Create organisation</SubmitButton>
        </form>
      </section>

      <section className="card">
        <h2>All organisations</h2>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Name</th><th>Short name</th><th>Members</th><th>Created</th></tr></thead>
            <tbody>
              {(orgs ?? []).map((o) => {
                const count = (o.memberships as unknown as { count: number }[])?.[0]?.count ?? 0;
                return (
                  <tr key={o.id}>
                    <td><Link href={`/orgs/${o.id}`}>{o.name}</Link></td>
                    <td><code>{o.slug}</code></td>
                    <td>{count}</td>
                    <td>{new Date(o.created_at).toLocaleDateString("en-GB")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="hint">Platform owners are added only with SQL in the Supabase dashboard (see docs/SETUP.md); there is no in-app way to grant it.</p>
      </section>
    </>
  );
}
