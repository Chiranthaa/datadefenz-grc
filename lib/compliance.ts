import { notFound } from "next/navigation";
import { isPlatformOwner, requireUser, roleIn, UUID_RE, type OrgRole } from "@/lib/auth";

export type AssessmentStatus = "not_assessed" | "implemented" | "partially_implemented" | "not_implemented" | "not_applicable";
export type EvidenceStatus = "not_provided" | "partially_provided" | "provided";
export type ContentStatus = "draft" | "reviewed";

export const ASSESSMENT_LABELS: Record<AssessmentStatus, string> = {
  not_assessed: "Not assessed",
  implemented: "Implemented",
  partially_implemented: "Partially implemented",
  not_implemented: "Not implemented",
  not_applicable: "Not applicable"
};

// Values a user can choose. "Not assessed" is the absence of an assessment.
export const ASSESSABLE: AssessmentStatus[] = ["implemented", "partially_implemented", "not_implemented", "not_applicable"];

export const EVIDENCE_LABELS: Record<EvidenceStatus, string> = {
  not_provided: "Evidence not provided",
  partially_provided: "Evidence partially provided",
  provided: "Evidence provided"
};

export const DISCLAIMER =
  "These are self-assessment results recorded in this workspace. They are not a certification, audit opinion or guarantee of compliance with any framework.";

export type FrameworkGroup = { id: string; name: string; source_names: string[]; sort_order: number };

export type OrgRequirementRow = {
  scf_id: string;
  scf_control_name: string;
  scf_domain: string;
  sort_order: number;
  selected_groups: string[];
  selected_count: number;
  all_group_count: number;
  status: AssessmentStatus;
  evidence_status: EvidenceStatus;
  owner_name: string | null;
  updated_at: string | null;
};

// Loads the organisation and the caller's permissions, or 404s. The
// database enforces all of this independently through RLS.
export async function getOrgContext(orgId: string) {
  if (!UUID_RE.test(orgId)) notFound();
  const { supabase, user } = await requireUser();
  const { data: org } = await supabase.from("organisations").select("id, name, slug").eq("id", orgId).maybeSingle();
  if (!org) notFound();
  const [role, owner, groupsRes, scopeRes] = await Promise.all([
    roleIn(supabase, orgId, user.id),
    isPlatformOwner(supabase, user.id),
    supabase.from("scf_framework_groups").select("id, name, source_names, sort_order").order("sort_order"),
    supabase.from("organisation_frameworks").select("group_id").eq("organisation_id", orgId)
  ]);
  const groups = (groupsRes.data ?? []) as FrameworkGroup[];
  const selected = new Set((scopeRes.data ?? []).map((r) => r.group_id as string));
  return {
    supabase,
    user,
    org: org as { id: string; name: string; slug: string },
    role: role as OrgRole | null,
    owner,
    groups,
    groupById: new Map(groups.map((g) => [g.id, g])),
    selected,
    selectedGroups: groups.filter((g) => selected.has(g.id)),
    canAssess: owner || role === "customer_admin" || role === "assessor",
    canManageScope: owner || role === "customer_admin"
  };
}

export function sortGroupIds(ids: string[], groups: FrameworkGroup[]) {
  const order = new Map(groups.map((g) => [g.id, g.sort_order]));
  return [...ids].sort((a, b) => (order.get(a) ?? 99) - (order.get(b) ?? 99));
}

export function pct(part: number, whole: number) {
  return whole ? Math.round((part / whole) * 100) : 0;
}
