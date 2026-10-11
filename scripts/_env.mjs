// Shared environment handling for local scripts. Values come only from
// .env.local (loaded by `node --env-file=.env.local`) — never from the repo.

export function requireEnv(...names) {
  for (const name of names) {
    if (process.env[name]) return process.env[name];
  }
  console.error(`Missing environment variable: ${names.join(" or ")}. Add it to .env.local (see .env.example).`);
  process.exit(1);
}

export const supabaseUrl = () => requireEnv("NEXT_PUBLIC_SUPABASE_URL");
export const publishableKey = () =>
  requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY");
// Server-only. Used by local scripts, never by the Next.js app.
export const secretKey = () => requireEnv("SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY");

export const clientOptions = { auth: { persistSession: false, autoRefreshToken: false } };

// Fictional test accounts and organisations used by seed and verify scripts.
export const TEST_ORGS = [
  { slug: "northwind-test", name: "Northwind Process Industries (TEST)" },
  { slug: "brightwater-test", name: "Brightwater Utilities (TEST)" }
];

export const TEST_USERS = [
  { key: "owner", email: "platform.owner@datadefenz.test", fullName: "Test Platform Owner", platformOwner: true },
  { key: "nwAdmin", email: "admin@northwind.test", fullName: "Test Northwind Admin", org: "northwind-test", role: "customer_admin" },
  { key: "nwAssessor", email: "assessor@northwind.test", fullName: "Test Northwind Assessor", org: "northwind-test", role: "assessor" },
  { key: "nwViewer", email: "viewer@northwind.test", fullName: "Test Northwind Viewer", org: "northwind-test", role: "read_only" },
  { key: "bwAdmin", email: "admin@brightwater.test", fullName: "Test Brightwater Admin", org: "brightwater-test", role: "customer_admin" },
  { key: "bwAssessor", email: "assessor@brightwater.test", fullName: "Test Brightwater Assessor", org: "brightwater-test", role: "assessor" }
];

export function testPassword() {
  const password = requireEnv("SEED_TEST_PASSWORD");
  if (password.length < 16) {
    console.error("SEED_TEST_PASSWORD must be at least 16 characters.");
    process.exit(1);
  }
  return password;
}
