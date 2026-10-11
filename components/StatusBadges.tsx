import { ASSESSMENT_LABELS, EVIDENCE_LABELS, type AssessmentStatus, type EvidenceStatus } from "@/lib/compliance";

export function AssessmentBadge({ status }: { status: AssessmentStatus }) {
  return <span className={`badge status-${status}`}><span className="dot" />{ASSESSMENT_LABELS[status]}</span>;
}

export function EvidenceBadge({ status, applicable = true }: { status: EvidenceStatus; applicable?: boolean }) {
  if (!applicable) return <span className="badge evidence-na">Evidence n/a</span>;
  return <span className={`badge evidence-${status}`}><span className="dot" />{EVIDENCE_LABELS[status]}</span>;
}

export function ContentStatusTag({ status }: { status: "draft" | "reviewed" }) {
  return status === "reviewed"
    ? <span className="tag tag-reviewed">Reviewed</span>
    : <span className="tag tag-draft">Draft — not visible to customers</span>;
}
