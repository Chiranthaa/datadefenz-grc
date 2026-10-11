import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";

type Mapping = { framework: string; focal_document_name: string; ids: string[]; group_id: string; sort_order: number };

export default async function ControlPage({ params }: { params: Promise<{ scfId: string }> }) {
  const { scfId } = await params;
  const id = decodeURIComponent(scfId);
  if (!/^[A-Z]{2,4}-\d{2}(\.\d+)*$/.test(id)) notFound();

  const { supabase } = await requireUser();
  const [{ data: control }, { data: groups }] = await Promise.all([
    supabase
      .from("scf_controls")
      .select("scf_id, scf_control_name, scf_domain, description, control_question, scf_mappings(framework, focal_document_name, ids, group_id, sort_order)")
      .eq("scf_id", id)
      .maybeSingle(),
    supabase.from("scf_framework_groups").select("id, name, sort_order").order("sort_order")
  ]);
  if (!control) notFound();

  const mappings = (control.scf_mappings as unknown as Mapping[]).sort((a, b) => a.sort_order - b.sort_order);
  const byGroup = (groups ?? [])
    .map((g) => ({ group: g, items: mappings.filter((m) => m.group_id === g.id) }))
    .filter((g) => g.items.length > 0);

  return (
    <>
      <header className="page-head">
        <div>
          <p className="muted small"><Link href="/controls">SCF library</Link> / {control.scf_domain}</p>
          <h1><code>{control.scf_id}</code> {control.scf_control_name}</h1>
        </div>
      </header>
      <section className="card">
        <p className="pre-line">{control.description}</p>
        <h3>SCF control question</h3>
        <p className="pre-line muted">{control.control_question}</p>
      </section>
      <section className="card">
        <h2>Framework mappings</h2>
        {byGroup.map(({ group, items }) => (
          <div key={group.id} className="mapping-group">
            <div className="mapping-group-name">{group.name}</div>
            <div>
              {items.map((m) => (
                <div key={m.framework} className="mapping">
                  <div className="muted small" title={m.focal_document_name}>{m.framework}</div>
                  <div>{m.ids.map((x) => <code key={x}>{x}</code>)}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>
    </>
  );
}
