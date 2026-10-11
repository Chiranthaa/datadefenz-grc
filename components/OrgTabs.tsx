import Link from "next/link";

const TABS = [
  { key: "overview", label: "Dashboard", path: "" },
  { key: "requirements", label: "Requirements", path: "/requirements" },
  { key: "frameworks", label: "Frameworks", path: "/frameworks" },
  { key: "members", label: "Members", path: "/members" }
] as const;

export function OrgTabs({ orgId, orgName, active, showMembers }: {
  orgId: string;
  orgName: string;
  active: (typeof TABS)[number]["key"];
  showMembers: boolean;
}) {
  return (
    <div className="org-header">
      <p className="muted small"><Link href="/">Organisations</Link> /</p>
      <h1>{orgName}</h1>
      <nav className="tabs" aria-label="Organisation sections">
        {TABS.filter((t) => t.key !== "members" || showMembers).map((t) => (
          <Link key={t.key} href={`/orgs/${orgId}${t.path}`} className={t.key === active ? "tab is-active" : "tab"} aria-current={t.key === active ? "page" : undefined}>
            {t.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

export function Disclaimer({ text }: { text: string }) {
  return <p className="disclaimer" role="note"><strong>Assessment results only.</strong> {text}</p>;
}
