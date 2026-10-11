import Link from "next/link";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "SCF library — DATADEFENZ GRC" };

const PAGE_SIZE = 50;

export default async function ControlsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const q = (typeof params.q === "string" ? params.q : "").trim().slice(0, 100);
  const group = typeof params.group === "string" ? params.group : "";
  const page = Math.max(1, Number.parseInt(typeof params.page === "string" ? params.page : "1", 10) || 1);

  const { supabase } = await requireUser();
  const { data: groups } = await supabase.from("scf_framework_groups").select("id, name").order("sort_order");
  const validGroup = groups?.some((g) => g.id === group) ? group : "";

  let query = supabase
    .from("scf_controls")
    .select(validGroup ? "scf_id, scf_control_name, scf_domain, scf_mappings!inner(group_id)" : "scf_id, scf_control_name, scf_domain", { count: "exact" })
    .order("sort_order")
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (validGroup) query = query.eq("scf_mappings.group_id", validGroup);
  if (q) {
    // Escape characters with meaning in PostgREST filter syntax.
    const term = q.replace(/[%_,()\\*]/g, " ");
    query = query.or(`scf_id.ilike.*${term}*,scf_control_name.ilike.*${term}*,description.ilike.*${term}*`);
  }
  const { data, count } = await query;
  const controls = (data ?? []) as unknown as { scf_id: string; scf_control_name: string; scf_domain: string }[];
  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const href = (p: number) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (validGroup) sp.set("group", validGroup);
    if (p > 1) sp.set("page", String(p));
    const s = sp.toString();
    return `/controls${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <header className="page-head">
        <div>
          <h1>SCF control library</h1>
          <p className="muted">Shared, read-only library. Control text and mapping identifiers are shown exactly as published by the SCF.</p>
        </div>
      </header>

      <form className="card toolbar" method="get">
        <label className="grow"><span>Search</span><input name="q" defaultValue={q} placeholder="SCF ID, name or description" /></label>
        <label>
          <span>Framework group</span>
          <select name="group" defaultValue={validGroup}>
            <option value="">All framework groups</option>
            {(groups ?? []).map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </label>
        <button type="submit" className="btn btn-primary">Apply</button>
      </form>

      <p className="muted">{total.toLocaleString("en-GB")} controls · page {page} of {pages}</p>
      <ul className="control-list">
        {controls.map((c) => (
          <li key={c.scf_id} className="card control-row">
            <Link href={`/controls/${encodeURIComponent(c.scf_id)}`}>
              <code>{c.scf_id}</code> <strong>{c.scf_control_name}</strong>
            </Link>
            <span className="muted small">{c.scf_domain}</span>
          </li>
        ))}
      </ul>
      <nav className="pager" aria-label="Pages">
        {page > 1 && <Link className="btn btn-ghost" href={href(page - 1)}>Previous</Link>}
        {page < pages && <Link className="btn btn-ghost" href={href(page + 1)}>Next</Link>}
      </nav>
    </>
  );
}
