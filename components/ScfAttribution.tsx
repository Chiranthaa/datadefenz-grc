import { createClient } from "@/lib/supabase/server";

// SCF attribution and license links, shown on every signed-in page.
export async function ScfAttribution() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("scf_library")
    .select("source, version, source_url, license, license_url, terms_url, notice")
    .order("imported_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const lib = data ?? {
    source: "Secure Controls Framework (SCF)",
    version: "2026.3",
    source_url: "https://securecontrolsframework.com",
    license: "CC BY-ND 4.0",
    license_url: "https://creativecommons.org/licenses/by-nd/4.0/",
    terms_url: "https://securecontrolsframework.com/commercial-license",
    notice: null as string | null
  };

  return (
    <footer className="attribution">
      Control content: <a href={lib.source_url} rel="noopener">{lib.source}</a>, version {lib.version},
      licensed under <a href={lib.license_url} rel="noopener">{lib.license}</a>. See also the{" "}
      <a href={lib.terms_url} rel="noopener">SCF license terms</a>.
      {lib.notice && <span className="attribution-note">{lib.notice}</span>}
    </footer>
  );
}
