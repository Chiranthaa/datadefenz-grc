import { sortGroupIds, type FrameworkGroup } from "@/lib/compliance";

export type Mapping = { framework: string; focal_document_name: string; ids: string[]; group_id: string; sort_order: number };
export type MappingReview = { framework: string; status: "reviewed" | "needs_validation"; reviewed_ids: string[]; note: string | null; reviewed_at: string };

function sameIds(a: string[], b: string[]) {
  return a.length === b.length && [...a].sort().join("\u0000") === [...b].sort().join("\u0000");
}

// Where a mapping comes from and whether DATADEFENZ has checked it.
export function provenance(m: Mapping, review: MappingReview | undefined) {
  if (!review) return { key: "sourced", label: "Sourced: SCF 2026.3, not independently reviewed" };
  if (!sameIds(review.reviewed_ids, m.ids)) return { key: "outdated", label: "Review out of date: SCF identifiers changed since review" };
  if (review.status === "needs_validation") return { key: "needs-validation", label: "Needs validation" };
  return { key: "reviewed", label: `Reviewed by DATADEFENZ ${new Date(review.reviewed_at).toLocaleDateString("en-GB")}` };
}

// Framework references for one SCF control, grouped by framework group.
// Identifiers are shown exactly as supplied by the SCF.
export function MappingTable({ mappings, reviews, groups, highlight, renderActions }: {
  mappings: Mapping[];
  reviews: MappingReview[];
  groups: FrameworkGroup[];
  highlight?: Set<string>;
  renderActions?: (m: Mapping, review: MappingReview | undefined) => React.ReactNode;
}) {
  const reviewByFramework = new Map(reviews.map((r) => [r.framework, r]));
  const groupIds = sortGroupIds([...new Set(mappings.map((m) => m.group_id))], groups);
  const name = new Map(groups.map((g) => [g.id, g.name]));

  return (
    <div className="mapping-table">
      {groupIds.map((gid) => (
        <div key={gid} className={`mapping-group${highlight?.has(gid) ? " is-selected" : ""}`}>
          <div className="mapping-group-name">{name.get(gid) ?? gid}</div>
          <div>
            {mappings.filter((m) => m.group_id === gid).sort((a, b) => a.sort_order - b.sort_order).map((m) => {
              const review = reviewByFramework.get(m.framework);
              const p = provenance(m, review);
              return (
                <div key={m.framework} className="mapping">
                  <div className="mapping-head">
                    <span className="muted small" title={m.focal_document_name}>{m.framework}</span>
                    <span className={`prov prov-${p.key}`}>{p.label}</span>
                  </div>
                  <div>{m.ids.map((x) => <code key={x}>{x}</code>)}</div>
                  {review?.note && <p className="hint">Review note: {review.note}</p>}
                  {renderActions?.(m, review)}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
