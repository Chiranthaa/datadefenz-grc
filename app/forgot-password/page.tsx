import Link from "next/link";
import { Notice } from "@/components/Notice";
import { SubmitButton } from "@/components/SubmitButton";
import { requestReset } from "./actions";

export const metadata = { title: "Reset password — DATADEFENZ GRC" };

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  return (
    <main className="auth-page">
      <div className="auth-card card">
        <h1>Reset your password</h1>
        <p className="muted">Enter your account email. We will send you a link to choose a new password.</p>
        <Notice code={params.error ?? params.message} />
        <form action={requestReset} className="form">
          <label>
            <span>Email</span>
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <SubmitButton pendingText="Sending…">Send reset link</SubmitButton>
        </form>
        <p className="muted small"><Link href="/login">Back to sign in</Link></p>
      </div>
    </main>
  );
}
