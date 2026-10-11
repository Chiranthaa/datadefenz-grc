"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser, UUID_RE } from "@/lib/auth";

// Replaces the organisation's framework scope with the ticked groups.
// RLS allows this for customer admins and platform owners only.
export async function saveFrameworks(orgId: string, formData: FormData) {
  if (!UUID_RE.test(orgId)) redirect("/");
  const { supabase } = await requireUser();

  const { data: groups } = await supabase.from("scf_framework_groups").select("id");
  const valid = new Set((groups ?? []).map((g) => g.id as string));
  const wanted = new Set(formData.getAll("group").map(String).filter((id) => valid.has(id)));

  const { data: current, error: readError } = await supabase
    .from("organisation_frameworks").select("group_id").eq("organisation_id", orgId);
  if (readError) redirect(`/orgs/${orgId}/frameworks?message=scope-failed`);
  const have = new Set((current ?? []).map((r) => r.group_id as string));

  const toAdd = [...wanted].filter((id) => !have.has(id));
  const toRemove = [...have].filter((id) => !wanted.has(id));

  if (toAdd.length) {
    const { error } = await supabase.from("organisation_frameworks")
      .insert(toAdd.map((group_id) => ({ organisation_id: orgId, group_id })));
    if (error) redirect(`/orgs/${orgId}/frameworks?message=scope-failed`);
  }
  if (toRemove.length) {
    const { error } = await supabase.from("organisation_frameworks")
      .delete().eq("organisation_id", orgId).in("group_id", toRemove);
    if (error) redirect(`/orgs/${orgId}/frameworks?message=scope-failed`);
  }
  revalidatePath(`/orgs/${orgId}`, "layout");
  redirect(`/orgs/${orgId}/frameworks?message=scope-saved`);
}
