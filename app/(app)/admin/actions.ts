"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";

// The database only lets platform owners insert organisations (RLS).
export async function createOrganisation(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  if (!name || !slug) redirect("/admin?message=missing-fields");
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) redirect("/admin?message=org-failed");

  const { supabase } = await requireUser();
  const { error } = await supabase.from("organisations").insert({ name, slug });
  if (error) redirect("/admin?message=org-failed");
  revalidatePath("/", "layout");
  redirect("/admin?message=org-created");
}
