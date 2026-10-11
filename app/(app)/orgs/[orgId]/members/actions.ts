"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser, UUID_RE, type OrgRole } from "@/lib/auth";

const ROLES: OrgRole[] = ["customer_admin", "assessor", "read_only"];

function parseRole(value: FormDataEntryValue | null): OrgRole | null {
  return ROLES.includes(value as OrgRole) ? (value as OrgRole) : null;
}

function back(orgId: string, code: string): never {
  redirect(`/orgs/${orgId}/members?message=${code}`);
}

// Authorisation is enforced in the database (RLS + RPC checks). These
// actions only validate input and report the outcome.
export async function addMember(orgId: string, formData: FormData) {
  if (!UUID_RE.test(orgId)) redirect("/");
  const email = String(formData.get("email") ?? "").trim();
  const role = parseRole(formData.get("role"));
  if (!email || !role) back(orgId, "missing-fields");

  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("add_organisation_member", { p_organisation_id: orgId, p_email: email, p_role: role });
  if (error) back(orgId, error.code === "P0002" ? "member-not-found" : "member-failed");
  revalidatePath(`/orgs/${orgId}`, "layout");
  back(orgId, "member-added");
}

export async function changeRole(orgId: string, membershipId: string, formData: FormData) {
  if (!UUID_RE.test(orgId) || !UUID_RE.test(membershipId)) redirect("/");
  const role = parseRole(formData.get("role"));
  if (!role) back(orgId, "missing-fields");

  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("memberships").update({ role }).eq("id", membershipId).eq("organisation_id", orgId).select("id");
  if (error || !data?.length) back(orgId, "member-failed");
  revalidatePath(`/orgs/${orgId}`, "layout");
  back(orgId, "member-updated");
}

export async function removeMember(orgId: string, membershipId: string) {
  if (!UUID_RE.test(orgId) || !UUID_RE.test(membershipId)) redirect("/");
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("memberships").delete().eq("id", membershipId).eq("organisation_id", orgId).select("id");
  if (error || !data?.length) back(orgId, "member-failed");
  revalidatePath(`/orgs/${orgId}`, "layout");
  back(orgId, "member-removed");
}
