"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";

// DATADEFENZ-authored content. RLS restricts all writes to platform owners;
// authorship and review stamps are set by database triggers.
const SCF_ID_RE = /^[A-Z]{2,4}-\d{2}(\.\d+)*$/;

function back(scfId: string, code: string): never {
  revalidatePath("/", "layout");
  redirect(`/controls/${encodeURIComponent(scfId)}?message=${code}`);
}

function text(formData: FormData, key: string, max: number) {
  const value = String(formData.get(key) ?? "").trim();
  return value ? value.slice(0, max) : null;
}

export async function saveGuidance(scfId: string, formData: FormData) {
  if (!SCF_ID_RE.test(scfId)) redirect("/controls");
  const status = formData.get("intent") === "review" ? "reviewed" : "draft";
  const row = {
    scf_id: scfId,
    plain_summary: text(formData, "plain_summary", 5000),
    implementation_guidance: text(formData, "implementation_guidance", 20000),
    technical_references: text(formData, "technical_references", 10000),
    evidence_expected: text(formData, "evidence_expected", 10000),
    evidence_example: text(formData, "evidence_example", 10000),
    status
  };
  const { supabase } = await requireUser();
  const { data, error } = await supabase.from("requirement_guidance").upsert(row, { onConflict: "scf_id" }).select("scf_id");
  if (error || !data?.length) back(scfId, "guidance-failed");
  back(scfId, "guidance-saved");
}

export async function saveFrameworkNote(scfId: string, groupId: string, formData: FormData) {
  if (!SCF_ID_RE.test(scfId) || !/^[a-z0-9_]{2,40}$/.test(groupId)) redirect("/controls");
  const note = text(formData, "note", 10000);
  const { supabase } = await requireUser();
  if (!note) {
    await supabase.from("framework_notes").delete().eq("scf_id", scfId).eq("group_id", groupId);
    back(scfId, "guidance-saved");
  }
  const status = formData.get("intent") === "review" ? "reviewed" : "draft";
  const { data, error } = await supabase.from("framework_notes")
    .upsert({ scf_id: scfId, group_id: groupId, note, status }, { onConflict: "scf_id,group_id" }).select("scf_id");
  if (error || !data?.length) back(scfId, "guidance-failed");
  back(scfId, "guidance-saved");
}

// Records that a consultant checked one SCF mapping entry against the
// framework text. The identifiers checked are pinned from the database.
export async function reviewMapping(scfId: string, framework: string, formData: FormData) {
  if (!SCF_ID_RE.test(scfId) || framework.length > 200) redirect("/controls");
  const intent = String(formData.get("intent") ?? "");
  const { supabase } = await requireUser();

  if (intent === "clear") {
    const { error } = await supabase.from("mapping_reviews").delete().eq("scf_id", scfId).eq("framework", framework);
    if (error) back(scfId, "review-failed");
    back(scfId, "review-saved");
  }
  if (intent !== "reviewed" && intent !== "needs_validation") back(scfId, "review-failed");

  const { data: mapping } = await supabase
    .from("scf_mappings").select("ids").eq("scf_id", scfId).eq("framework", framework).maybeSingle();
  if (!mapping) back(scfId, "review-failed");

  const { data, error } = await supabase.from("mapping_reviews").upsert({
    scf_id: scfId, framework, status: intent, reviewed_ids: mapping.ids, note: text(formData, "note", 5000)
  }, { onConflict: "scf_id,framework" }).select("scf_id");
  if (error || !data?.length) back(scfId, "review-failed");
  back(scfId, "review-saved");
}
