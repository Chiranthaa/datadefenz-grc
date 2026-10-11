import { Notice } from "@/components/Notice";
import { OrgTabs } from "@/components/OrgTabs";
import { SubmitButton } from "@/components/SubmitButton";
import { getOrgContext } from "@/lib/compliance";
import { saveFrameworks } from "./actions";

export default async function FrameworksPage({ params, searchParams }: {
  params: Promise<{ orgId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { orgId } = await params;
  const query = await searchParams;
  const ctx = await getOrgContext(orgId);
  const { data: stats } = await ctx.supabase.rpc("scf_group_stats");
  const statById = new Map(((stats ?? []) as { group_id: string; controls: number; framework_specific: number }[]).map((s) => [s.group_id, s]));
  const editable = ctx.canManageScope;

  return (
    <>
      <OrgTabs orgId={orgId} orgName={ctx.org.name} active="frameworks" showMembers={ctx.canManageScope} />
      <Notice code={query.message} />
      <section className="card">
        <h2>Frameworks in scope</h2>
        <p className="muted">
          Choose the frameworks that apply to {ctx.org.name}. The requirements list combines them: where the SCF maps one
          requirement to several selected frameworks, it appears once with every framework reference.
          {!editable && " Only a customer admin or DATADEFENZ platform owner can change the scope."}
        </p>
        <form action={saveFrameworks.bind(null, orgId)} className="framework-form">
          <fieldset disabled={!editable}>
            <legend className="visually-hidden">Frameworks</legend>
            <ul className="framework-options">
              {ctx.groups.map((g) => {
                const s = statById.get(g.id);
                return (
                  <li key={g.id}>
                    <label className="framework-option">
                      <input type="checkbox" name="group" value={g.id} defaultChecked={ctx.selected.has(g.id)} />
                      <span>
                        <strong>{g.name}</strong>
                        <span className="muted small">SCF sources: {g.source_names.join(" · ")}</span>
                        {s && <span className="muted small">{s.controls} SCF requirements mapped · {s.framework_specific} specific to this framework</span>}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </fieldset>
          {editable && <SubmitButton pendingText="Saving…">Save scope</SubmitButton>}
        </form>
        <p className="hint">
          Removing a framework hides its requirements but keeps any assessments already recorded; they reappear if the
          framework is selected again. Mappings come from the Secure Controls Framework (SCF) 2026.3.
        </p>
      </section>
    </>
  );
}
