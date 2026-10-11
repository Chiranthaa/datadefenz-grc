import Link from "next/link";
import { Notice } from "@/components/Notice";
import { SubmitButton } from "@/components/SubmitButton";
import { signIn } from "./actions";

export const metadata = { title: "Sign in — DATADEFENZ GRC" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  return (
    <main className="auth-page">
      <div className="auth-card card">
        <div className="brand brand-dark">
          <span className="brand-mark" aria-hidden="true">DD</span>
          <span className="brand-text"><strong>DATADEFENZ</strong><small>GRC Platform</small></span>
        </div>
        <h1>Sign in</h1>
        <Notice code={params.error ?? params.message} />
        <form action={signIn} className="form">
          <label>
            <span>Email</span>
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label>
            <span>Password</span>
            <input name="password" type="password" autoComplete="current-password" required />
          </label>
          <SubmitButton pendingText="Signing in…">Sign in</SubmitButton>
        </form>
        <p className="muted small"><Link href="/forgot-password">Forgot your password?</Link></p>
        <p className="muted small">Accounts are created by DATADEFENZ. There is no public sign-up.</p>
      </div>
    </main>
  );
}
