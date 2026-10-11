"use server";

import { redirect } from "next/navigation";
import { siteUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export async function requestReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) redirect("/forgot-password?error=missing-fields");

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/confirm?next=/update-password`
  });
  if (error?.status === 429) redirect("/forgot-password?error=rate-limited");
  // Same response whether or not the account exists.
  redirect("/forgot-password?message=reset-sent");
}
