"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";

export async function updatePassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 12) redirect("/update-password?message=password-weak");
  if (password !== confirm) redirect("/update-password?message=password-mismatch");

  const { supabase } = await requireUser();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect("/update-password?message=password-failed");
  redirect("/?message=password-updated");
}
