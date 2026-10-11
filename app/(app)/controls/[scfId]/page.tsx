import Link from "next/link";
import { notFound } from "next/navigation";
import { MappingTable, type Mapping, type MappingReview } from "@/components/MappingTable";
import { Notice } from "@/components/Notice";
import { ContentStatusTag } from "@/components/StatusBadges";
import { SubmitButton } from "@/components/SubmitButton";
import { isPlatformOwner, requireUser } from "@/lib/auth";
import type { ContentStatus, FrameworkGroup } from "@/lib/compliance";
import { reviewMapping, saveFrameworkNote, saveGuidance } from "./actions";

type Guidance = {
  plain_summary: string | null; implementation_guidance: string | null; technical_references: string | null;
  evidence_expected: string | null; evidence_example: string | null; status: ContentStatus;
  updated_at: string; reviewed_at: string | null; authored_by: string | null; reviewed_by: string | null;
};

const GUIDANCE_FIELDS = [
  ["plain_summary", "Plain-language summary", "What the requirement means in practice, in your own words (do not paraphrase SCF text closely).", 4],
  ["implementation_guidance", "Implementation guide", "Practical steps for IT and OT environments.", 8],
  ["technical_references", "Technical references", "Cite sources by name and identifier, e.g. a NIST SP or CIS Safeguard you have verified.", 4],
  ["evidence_expected", "Evidence expected", "What an assessor should expect to see.", 4],
  ["evidence_example", "Example of suitable evidence", "Shown to customers labelled “Example only”.", 4]
] as const;

export default async function ControlPage({ params, searchParams }: {
  params: Promise<{ scfId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { scfId } = await params;
  const query = await searchParams;
  const id = decodeURIComponent(scfId);
  if (!/^[A-Z]{2,4}-\d{2}(\.\d+)*$/.test(id)) notFound();

  const { supabase, user } = await requireUser();
  const [owner, controlRes, groupsRes, reviewsRes, guidanceRes, notesRes] = await Promise.all([
    isPlatformOwner(supabase, user.id),
    supabase.from("scf_controls")
      .select("scf_id, scf_control_name, scf_domain, description, control_question, scf_mappings(framework, focal_document_name, ids, group_id, sort_order)")
      .eq("scf_id", id).maybeSingle(),
    supabase.from("scf_framework_groups").select("id, name, source_names, sort_order").order("sort_order"),
    supabase.from("mapping_reviews").select("framework, status, reviewed_ids, note, reviewed_at").eq("scf_id", id),
    supabase.from("requirement_guidance").select("*").eq("scf_id", id).maybeSingle(),
    supabase.from("framework_notes").select("group_id, note, status").eq("scf_id", id)
  ]);
  const control = controlRes.data;
  if (!control) notFound();

  const groups = (groupsRes.data ?? []) as FrameworkGroup[];
  const mappings = control.scf_mappings as unknown as Mapping[];
  const reviews = (reviewsRes.data ?? []) as MappingReview[];
  const guidance = guidanceRes.data as Guidance | null;
  const notes = (notesRes.data ?? []) as { group_id: string; note: string; status: ContentStatus }[];
  const mappedGroupIds = groups.map((g) => g.id).filter((gid) => mappings.some((m) => m.group_id === gid));
  const selfReviewed = guidance?.status === "reviewed" && guidance.reviewed_by && guidance.reviewed_by === guidance.authored_by;

  return (
    <>
      <header className="page-head">
        <div>
          <p className="muted small"><Link href="/controls">SCF library</Link> / {control.scf_domain}</p>
          <h1 className="h1-sm"><code>{control.scf_id}</code> {control.scf_control_name}</h1>
        </div>
      </header>
      <Notice code={query.message} />

      <section className="card">
        <h3>SCF control statement</h3>
        <p className="pre-line">{control.description}</p>
        <h3>SCF control question</h3>
        <p className="pre-line muted">{control.control_question}</p>
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Framework mappings</h2>
          <span className="muted small">Identifiers exactly as published by the SCF</span>
        </div>
        <MappingTable
          mappings={mappings}
          reviews={reviews}
          groups={groups}
          renderActions={owner ? (m) => (
            <form action={reviewMapping.bind(null, control.scf_id, m.framework)} className="form-inline review-form">
              <input name="note" placeholder="Review note (optional)" maxLength={5000} aria-label={`Review note for ${m.framework}`} />
              <button className="btn btn-ghost btn-xs" name="intent" value="reviewed">Mark reviewed</button>
              <button className="btn btn-ghost btn-xs" name="intent" value="needs_validation">Needs validation</button>
              <button className="btn btn-ghost btn-xs" name="intent" value="clear">Reset to sourced</button>
            </form>
          ) : undefined}
        />
        {owner && <p className="hint">Mark a mapping reviewed only after checking it against the framework&apos;s own text. The review is pinned to the identifiers shown; if a later SCF import changes them, it is flagged as out of date.</p>}
      </section>

      {owner ? (
        <>
          <section className="card">
            <div className="card-head">
              <h2>DATADEFENZ guidance</h2>
              {guidance ? <ContentStatusTag status={guidance.status} /> : <span className="muted small">Not written yet</span>}
            </div>
            <p className="muted">
              Written by DATADEFENZ, separate from SCF content. Customers only see it once it is marked reviewed. Never add a
              technical instruction or reference you have not verified against its source.
            </p>
            {selfReviewed && <p className="notice">Reviewed by the same person who wrote it. A second reviewer is recommended.</p>}
            <form action={saveGuidance.bind(null, control.scf_id)} className="form">
              {GUIDANCE_FIELDS.map(([key, label, hint, rows]) => (
                <label key={key}>
                  <span>{label}</span>
                  <textarea name={key} rows={rows} defaultValue={guidance?.[key] ?? ""} />
                  <span className="hint">{hint}</span>
                </label>
              ))}
              <div className="form-inline">
                <SubmitButton className="btn btn-ghost" pendingText="Saving…">Save as draft</SubmitButton>
                <button type="submit" name="intent" value="review" className="btn btn-primary">Save and mark reviewed</button>
              </div>
            </form>
          </section>

          <section className="card">
            <h2>Framework-specific notes</h2>
            <p className="muted">Obligations of one framework that go beyond the shared requirement. Leave empty and save to delete.</p>
            {mappedGroupIds.map((gid) => {
              const note = notes.find((n) => n.group_id === gid);
              return (
                <form key={gid} action={saveFrameworkNote.bind(null, control.scf_id, gid)} className="form note-form">
                  <label>
                    <span>{groups.find((g) => g.id === gid)?.name} {note && <ContentStatusTag status={note.status} />}</span>
                    <textarea name="note" rows={3} defaultValue={note?.note ?? ""} maxLength={10000} />
                  </label>
                  <div className="form-inline">
                    <SubmitButton className="btn btn-ghost btn-xs" pendingText="Saving…">Save as draft</SubmitButton>
                    <button type="submit" name="intent" value="review" className="btn btn-ghost btn-xs">Save and mark reviewed</button>
                  </div>
                </form>
              );
            })}
          </section>
        </>
      ) : (
        guidance?.status === "reviewed" && (
          <section className="card">
            <h2>DATADEFENZ guidance <ContentStatusTag status="reviewed" /></h2>
            {GUIDANCE_FIELDS.map(([key, label]) => guidance[key] && (
              <div key={key}><h3>{label}</h3><p className="pre-line">{guidance[key]}</p></div>
            ))}
          </section>
        )
      )}
    </>
  );
}
