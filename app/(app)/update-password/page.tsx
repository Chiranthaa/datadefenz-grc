import { Notice } from "@/components/Notice";
import { SubmitButton } from "@/components/SubmitButton";
import { updatePassword } from "./actions";

export const metadata = { title: "Change password — DATADEFENZ GRC" };

export default async function UpdatePasswordPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  return (
    <section className="card narrow">
      <h1>Choose a new password</h1>
      <Notice code={params.message} />
      <form action={updatePassword} className="form">
        <label><span>New password</span><input name="password" type="password" autoComplete="new-password" minLength={12} required /></label>
        <label><span>Confirm new password</span><input name="confirm" type="password" autoComplete="new-password" minLength={12} required /></label>
        <SubmitButton pendingText="Saving…">Update password</SubmitButton>
      </form>
      <p className="hint">At least 12 characters. Supabase may enforce additional rules you configure.</p>
    </section>
  );
}
