import Link from "next/link";
import { ScfAttribution } from "@/components/ScfAttribution";
import { isPlatformOwner, requireUser } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user } = await requireUser();
  const owner = await isPlatformOwner(supabase, user.id);

  return (
    <div className="shell">
      <header className="topbar">
        <Link href="/" className="brand">
          <span className="brand-mark" aria-hidden="true">DD</span>
          <span className="brand-text"><strong>DATADEFENZ</strong><small>GRC Platform</small></span>
        </Link>
        <nav className="nav" aria-label="Main">
          <Link href="/">Organisations</Link>
          <Link href="/controls">SCF library</Link>
          {owner && <Link href="/admin">Platform admin</Link>}
        </nav>
        <div className="user-menu">
          <span className="user-email" title={user.email}>{user.email}</span>
          {owner && <span className="pill">Platform owner</span>}
          <Link href="/update-password" className="btn btn-ghost">Change password</Link>
          <form action="/auth/signout" method="post">
            <button type="submit" className="btn btn-ghost">Sign out</button>
          </form>
        </div>
      </header>
      <main className="content">{children}</main>
      <ScfAttribution />
    </div>
  );
}
