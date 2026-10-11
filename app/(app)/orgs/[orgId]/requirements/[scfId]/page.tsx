import Link from "next/link";
import { notFound } from "next/navigation";
import { MappingTable, type Mapping, type MappingReview } from "@/components/MappingTable";
import { Notice } from "@/components/Notice";
import { Disclaimer, OrgTabs } from "@/components/OrgTabs";
import { AssessmentBadge, ContentStatusTag, EvidenceBadge } from "@/components/StatusBadges";
import { SubmitButton } from "@/components/SubmitButton";
import {
  ASSESSABLE, ASSESSMENT_LABELS, DISCLAIMER, EVIDENCE_LABELS, getOrgContext, sortGroupIds,
  type AssessmentStatus, type ContentStatus, type EvidenceStatus
} from "@/lib/compliance";
import { addEvidence, removeEvidence, saveAssessment, saveEvidenceStatus } from "./actions";

type Guidance = {
  plain_summary: string | null; implementation_guidance: string | null; technical_references: string | null;
  evidence_expected: string | null; evidence_example: string | null; status: ContentStatus; reviewed_at: string | null;
};
type FrameworkNote = { group_id: string; note: string; status: ContentStatus };

function GuidanceText({ value, missing }: { value: string | null | undefined; missing: string }) {
  return value ? <p className="pre-line">{value}</p> : <p className="empty">{missing}</p>;
}

export default async function RequirementPage({ params, searchParams }: {
  params: Promise<{ orgId: string; scfId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { orgId, scfId: rawId } = await params;
  const query = await searchParams;
  const scfId = decodeURIComponent(rawId);
  if (!/^[A-Z]{2,4}-\d{2}(\.\d+)*$/.test(scfId)) notFound();

  const ctx = await getOrgContext(orgId);
  const { supabase, groups, groupById, selected, owner } = ctx;

  const [controlRes, reviewsRes, guidanceRes, notesRes, assessmentRes, libRes] = await Promise.all([
    supabase.from("scf_controls")
      .select("scf_id, scf_control_name, scf_domain, description, control_question, scf_mappings(framework, focal_document_name, ids, group_id, sort_order)")
      .eq("scf_id", scfId).maybeSingle(),
    supabase.from("mapping_reviews").select("framework, status, reviewed_ids, note, reviewed_at").eq("scf_id", scfId),
    supabase.from("requirement_guidance")
      .select("plain_summary, implementation_guidance, technical_references, evidence_expected, evidence_example, status, reviewed_at")
      .eq("scf_id", scfId).maybeSingle(),
    supabase.from("framework_notes").select("group_id, note, status").eq("scf_id", scfId),
    supabase.from("control_assessments")
      .select("id, status, evidence_status, owner_name, notes, assessed_on, updated_at")
      .eq("organisation_id", orgId).eq("scf_id", scfId).maybeSingle(),
    supabase.from("scf_library").select("source, version, license").order("imported_at", { ascending: false }).limit(1).maybeSingle()
  ]);
  const control = controlRes.data;
  if (!control) notFound();

  const mappings = control.scf_mappings as unknown as Mapping[];
  const reviews = (reviewsRes.data ?? []) as MappingReview[];
  const guidance = guidanceRes.data as Guidance | null;
  const notes = (notesRes.data ?? []) as FrameworkNote[];
  const assessment = assessmentRes.data;
  const lib = libRes.data ?? { source: "Secure Controls Framework (SCF)", version: "2026.3", license: "CC BY-ND 4.0" };

  const mappedGroups = new Set(mappings.map((m) => m.group_id));
  const inScope = sortGroupIds([...mappedGroups].filter((g) => selected.has(g)), groups);
  const outOfScope = mappings.filter((m) => !selected.has(m.group_id));
  const frameworkSpecific = mappedGroups.size === 1;

  const status = (assessment?.status ?? "not_assessed") as AssessmentStatus;
  const evidenceStatus = (assessment?.evidence_status ?? "not_provided") as EvidenceStatus;

  const { data: evidence } = assessment
    ? await supabase.from("evidence_items").select("id, title, description, storage_path, created_at")
        .eq("organisation_id", orgId).eq("assessment_id", assessment.id).order("created_at")
    : { data: [] as { id: string; title: string; description: string | null; storage_path: string | null; created_at: string }[] };
  const paths = (evidence ?? []).map((e) => e.storage_path).filter((p): p is string => Boolean(p));
  const { data: signed } = paths.length
    ? await supabase.storage.from("evidence").createSignedUrls(paths, 300)
    : { data: [] as { path: string | null; signedUrl: string }[] };
  const urlByPath = new Map<string, string>();
  for (const s of signed ?? []) if (s.path && s.signedUrl) urlByPath.set(s.path, s.signedUrl);

  const visibleGuidance = guidance && (guidance.status === "reviewed" || owner) ? guidance : null;
  const canRemoveEvidence = owner || ctx.role === "customer_admin";

  return (
    <>
      <OrgTabs orgId={orgId} orgName={ctx.org.name} active="requirements" showMembers={ctx.canManageScope} />
      <Notice code={query.message} />

      <header className="page-head">
        <div>
          <p className="muted small"><Link href={`/orgs/${orgId}/requirements`}>Requirements</Link> / {control.scf_domain}</p>
          <h1 className="h1-sm"><code>{control.scf_id}</code> {control.scf_control_name}</h1>
          <p className="requirement-meta">
            {inScope.map((g) => <span key={g} className="fw-tag">{groupById.get(g)?.name ?? g}</span>)}
            {frameworkSpecific && <span className="tag tag-specific">Framework-specific</span>}
          </p>
        </div>
        <span className="requirement-status">
          <AssessmentBadge status={status} />
          <EvidenceBadge status={evidenceStatus} />
        </span>
      </header>

      {inScope.length === 0 && (
        <p className="notice notice-error">This requirement is not mapped to any framework currently in {ctx.org.name}&apos;s scope.</p>
      )}

      <div className="detail-grid">
        <div className="detail-main">
          <section className="card">
            <h2>Requirement</h2>
            {visibleGuidance?.plain_summary ? (
              <>
                <h3>In practice {visibleGuidance.status === "draft" && <ContentStatusTag status="draft" />}</h3>
                <p className="pre-line">{visibleGuidance.plain_summary}</p>
              </>
            ) : (
              <p className="empty">A DATADEFENZ plain-language summary has not been written and reviewed for this requirement yet. The SCF statement below is the authoritative text.</p>
            )}
            <h3>SCF control statement</h3>
            <p className="pre-line">{control.description}</p>
            <h3>SCF control question</h3>
            <p className="pre-line muted">{control.control_question}</p>
            <p className="hint">Source: {lib.source} {lib.version} ({lib.license}), shown verbatim.</p>
          </section>

          <section className="card">
            <div className="card-head">
              <h2>Framework references</h2>
              <span className="muted small">Exact identifiers as published in the SCF mapping</span>
            </div>
            <MappingTable mappings={mappings.filter((m) => selected.has(m.group_id))} reviews={reviews} groups={groups} />
            {outOfScope.length > 0 && (
              <details className="more">
                <summary>Also mapped to {new Set(outOfScope.map((m) => m.group_id)).size} framework(s) outside your scope</summary>
                <MappingTable mappings={outOfScope} reviews={reviews} groups={groups} />
              </details>
            )}
            <p className="hint">
              The SCF source file lists which identifiers relate to this control but not whether the relationship is
              full or partial. Check each framework&apos;s own text for obligations beyond this requirement.
            </p>
          </section>

          <section className="card">
            <h2>Implementation guide {visibleGuidance?.status === "draft" && <ContentStatusTag status="draft" />}</h2>
            <GuidanceText value={visibleGuidance?.implementation_guidance}
              missing="No reviewed implementation guide yet. DATADEFENZ has not authored and reviewed guidance for this requirement, so none is shown." />
            <h3>Technical references (e.g. NIST, CIS)</h3>
            <GuidanceText value={visibleGuidance?.technical_references}
              missing="No reviewed technical references recorded yet. The repository does not contain NIST or CIS guidance text, so references must be added by a DATADEFENZ expert." />
          </section>

          <section className="card">
            <h2>Evidence</h2>
            <h3>Evidence expected</h3>
            <GuidanceText value={visibleGuidance?.evidence_expected} missing="Expected evidence has not been defined and reviewed yet." />
            <h3>Example of suitable evidence</h3>
            {visibleGuidance?.evidence_example ? (
              <div className="example"><span className="tag tag-example">Example only</span><p className="pre-line">{visibleGuidance.evidence_example}</p></div>
            ) : <p className="empty">No reviewed evidence example yet.</p>}
          </section>

          <section className="card">
            <h2>Framework-specific attention</h2>
            {frameworkSpecific && (
              <p>The SCF maps this requirement to one framework only, so treat it as a framework-specific obligation rather than shared work.</p>
            )}
            {inScope.length > 0 ? (
              <ul className="note-list">
                {inScope.map((g) => {
                  const note = notes.find((n) => n.group_id === g && (n.status === "reviewed" || owner));
                  return (
                    <li key={g}>
                      <strong>{groupById.get(g)?.name ?? g}</strong>{" "}
                      {note ? <>{note.status === "draft" && <ContentStatusTag status="draft" />}<p className="pre-line">{note.note}</p></>
                        : <span className="muted small">No reviewed framework-specific note yet.</span>}
                    </li>
                  );
                })}
              </ul>
            ) : <p className="empty">No frameworks in scope.</p>}
          </section>
        </div>

        <aside className="detail-side">
          <section className="card">
            <h2>Assessment</h2>
            {ctx.canAssess ? (
              <form action={saveAssessment.bind(null, orgId, scfId)} className="form">
                <fieldset className="radio-group">
                  <legend>Implementation status</legend>
                  {ASSESSABLE.map((s) => (
                    <label key={s} className="radio"><input type="radio" name="status" value={s} defaultChecked={status === s} required /> {ASSESSMENT_LABELS[s]}</label>
                  ))}
                  <label className="radio"><input type="radio" name="status" value="not_assessed" defaultChecked={status === "not_assessed"} /> {ASSESSMENT_LABELS.not_assessed}</label>
                </fieldset>
                <label><span>Control owner</span><input name="owner_name" defaultValue={assessment?.owner_name ?? ""} maxLength={200} /></label>
                <label><span>Assessed on</span><input type="date" name="assessed_on" defaultValue={assessment?.assessed_on ?? ""} /></label>
                <label><span>Assessment notes</span><textarea name="notes" rows={5} maxLength={10000} defaultValue={assessment?.notes ?? ""} /></label>
                <SubmitButton pendingText="Saving…">Save assessment</SubmitButton>
              </form>
            ) : (
              <dl className="facts">
                <div><dt>Status</dt><dd><AssessmentBadge status={status} /></dd></div>
                <div><dt>Control owner</dt><dd>{assessment?.owner_name ?? "—"}</dd></div>
                <div><dt>Assessed on</dt><dd>{assessment?.assessed_on ?? "—"}</dd></div>
                {assessment?.notes && <div className="facts-block"><dt>Notes</dt><dd className="pre-line">{assessment.notes}</dd></div>}
              </dl>
            )}
            {assessment?.updated_at && <p className="hint">Last updated {new Date(assessment.updated_at).toLocaleString("en-GB")}</p>}
          </section>

          <section className="card">
            <h2>Evidence status</h2>
            <p className="hint">Tracked separately from the implementation status: “Implemented” does not mean evidence has been provided.</p>
            {ctx.canAssess ? (
              <form action={saveEvidenceStatus.bind(null, orgId, scfId)} className="form form-inline">
                <select name="evidence_status" defaultValue={evidenceStatus} aria-label="Evidence status">
                  {Object.entries(EVIDENCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <SubmitButton className="btn btn-ghost" pendingText="Saving…">Save</SubmitButton>
              </form>
            ) : <EvidenceBadge status={evidenceStatus} />}

            <h3>Evidence records</h3>
            {evidence && evidence.length > 0 ? (
              <ul className="evidence-list">
                {evidence.map((e) => (
                  <li key={e.id}>
                    <strong>{e.title}</strong>
                    {e.description && <p className="pre-line small">{e.description}</p>}
                    <span className="evidence-actions">
                      {e.storage_path && urlByPath.get(e.storage_path) && (
                        <a href={urlByPath.get(e.storage_path) ?? undefined} rel="noopener">Download file</a>
                      )}
                      <span className="muted small">{new Date(e.created_at).toLocaleDateString("en-GB")}</span>
                      {canRemoveEvidence && (
                        <form action={removeEvidence.bind(null, orgId, scfId, e.id)}>
                          <SubmitButton className="btn btn-danger btn-xs" pendingText="Removing…">Remove</SubmitButton>
                        </form>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            ) : <p className="empty">No evidence records yet.</p>}

            {ctx.canAssess && (
              <form action={addEvidence.bind(null, orgId, scfId)} className="form evidence-form">
                <label><span>Title</span><input name="title" required maxLength={300} placeholder="e.g. Access review sign-off, Q3" /></label>
                <label><span>Description or location</span><textarea name="description" rows={3} maxLength={10000} /></label>
                <label><span>File (optional, max 10 MB)</span><input type="file" name="file" /></label>
                <SubmitButton className="btn btn-ghost" pendingText="Uploading…">Add evidence</SubmitButton>
                <p className="hint">Files are stored in the organisation&apos;s private storage folder. Adding a record does not change the evidence status.</p>
              </form>
            )}
          </section>
          <Disclaimer text={DISCLAIMER} />
        </aside>
      </div>
    </>
  );
}
