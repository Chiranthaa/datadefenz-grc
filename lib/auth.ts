import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type OrgRole = "customer_admin" | "assessor" | "read_only";

export const ROLE_LABELS: Record<OrgRole, string> = {
  customer_admin: "Customer admin",
  assessor: "Assessor",
  read_only: "Read-only"
};

// Returns the verified signed-in user (checked with the Auth server), or
// redirects to the login page.
// Cached per request, so layout and page share one Auth server check.
export const requireUser = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/login");
  return { supabase, user: data.user };
});

export async function isPlatformOwner(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase.from("platform_owners").select("user_id").eq("user_id", userId).maybeSingle();
  return Boolean(data);
}

// The caller's role in an organisation, or null if not a member. UI only;
// the database enforces permissions independently through RLS.
export async function roleIn(supabase: Awaited<ReturnType<typeof createClient>>, orgId: string, userId: string) {
  const { data } = await supabase
    .from("memberships")
    .select("role")
    .eq("organisation_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();
  return (data?.role as OrgRole | undefined) ?? null;
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Only allow same-site relative redirects.
export function safeNext(next: string | null | undefined, fallback = "/") {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
