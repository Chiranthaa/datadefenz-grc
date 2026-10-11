"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser, UUID_RE } from "@/lib/auth";
import { ASSESSMENT_LABELS, EVIDENCE_LABELS } from "@/lib/compliance";

const SCF_ID_RE = /^[A-Z]{2,4}-\d{2}(\.\d+)*$/;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
type Supabase = Awaited<ReturnType<typeof requireUser>>["supabase"];

function guard(orgId: string, scfId: string) {
  if (!UUID_RE.test(orgId) || !SCF_ID_RE.test(scfId)) redirect("/");
}

function back(orgId: string, scfId: string, code: string): never {
  revalidatePath(`/orgs/${orgId}`, "layout");
  redirect(`/orgs/${orgId}/requirements/${encodeURIComponent(scfId)}?message=${code}`);
}

function text(formData: FormData, key: string, max: number) {
  const value = String(formData.get(key) ?? "").trim();
  return value ? value.slice(0, max) : null;
}

// Returns the assessment row id for (org, control), creating an empty
// "not assessed" row if needed. RLS decides whether the caller may.
async function ensureAssessment(supabase: Supabase, orgId: string, scfId: string) {
  const { data: existing } = await supabase
    .from("control_assessments").select("id").eq("organisation_id", orgId).eq("scf_id", scfId).maybeSingle();
  if (existing) return existing.id as string;
  const { data, error } = await supabase
    .from("control_assessments").insert({ organisation_id: orgId, scf_id: scfId }).select("id").single();
  if (error || !data) return null;
  return data.id as string;
}

export async function saveAssessment(orgId: string, scfId: string, formData: FormData) {
  guard(orgId, scfId);
  const status = String(formData.get("status") ?? "");
  if (!(status in ASSESSMENT_LABELS)) back(orgId, scfId, "missing-fields");
  const assessedOn = String(formData.get("assessed_on") ?? "");
  const fields = {
    status,
    owner_name: text(formData, "owner_name", 200),
    notes: text(formData, "notes", 10000),
    assessed_on: /^\d{4}-\d{2}-\d{2}$/.test(assessedOn) ? assessedOn : null
  };

  const { supabase } = await requireUser();
  const id = await ensureAssessment(supabase, orgId, scfId);
  if (!id) back(orgId, scfId, "assessment-failed");
  const { data, error } = await supabase.from("control_assessments").update(fields).eq("id", id).select("id");
  if (error || !data?.length) back(orgId, scfId, "assessment-failed");
  back(orgId, scfId, "assessment-saved");
}

export async function saveEvidenceStatus(orgId: string, scfId: string, formData: FormData) {
  guard(orgId, scfId);
  const evidenceStatus = String(formData.get("evidence_status") ?? "");
  if (!(evidenceStatus in EVIDENCE_LABELS)) back(orgId, scfId, "missing-fields");

  const { supabase } = await requireUser();
  const id = await ensureAssessment(supabase, orgId, scfId);
  if (!id) back(orgId, scfId, "assessment-failed");
  const { data, error } = await supabase
    .from("control_assessments").update({ evidence_status: evidenceStatus }).eq("id", id).select("id");
  if (error || !data?.length) back(orgId, scfId, "assessment-failed");
  back(orgId, scfId, "assessment-saved");
}

export async function addEvidence(orgId: string, scfId: string, formData: FormData) {
  guard(orgId, scfId);
  const title = text(formData, "title", 300);
  if (!title) back(orgId, scfId, "missing-fields");
  const description = text(formData, "description", 10000);
  const file = formData.get("file");
  const hasFile = file instanceof File && file.size > 0;
  if (hasFile && file.size > MAX_FILE_BYTES) back(orgId, scfId, "evidence-failed");

  const { supabase } = await requireUser();
  const assessmentId = await ensureAssessment(supabase, orgId, scfId);
  if (!assessmentId) back(orgId, scfId, "evidence-failed");

  let storagePath: string | null = null;
  if (hasFile) {
    const safeName = file.name.replace(/[^A-Za-z0-9._-]+/g, "_").slice(-120) || "file";
    storagePath = `${orgId}/${scfId}/${crypto.randomUUID()}-${safeName}`;
    const { error } = await supabase.storage.from("evidence")
      .upload(storagePath, file, { contentType: file.type || "application/octet-stream", upsert: false });
    if (error) back(orgId, scfId, "evidence-failed");
  }

  const { error } = await supabase.from("evidence_items").insert({
    organisation_id: orgId, assessment_id: assessmentId, title, description, storage_path: storagePath
  });
  if (error) {
    if (storagePath) await supabase.storage.from("evidence").remove([storagePath]);
    back(orgId, scfId, "evidence-failed");
  }
  back(orgId, scfId, "evidence-added");
}

export async function removeEvidence(orgId: string, scfId: string, evidenceId: string) {
  guard(orgId, scfId);
  if (!UUID_RE.test(evidenceId)) redirect("/");
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("evidence_items").delete().eq("id", evidenceId).eq("organisation_id", orgId).select("storage_path");
  if (error || !data?.length) back(orgId, scfId, "evidence-failed");
  const path = data[0].storage_path as string | null;
  if (path) await supabase.storage.from("evidence").remove([path]);
  back(orgId, scfId, "evidence-removed");
}
