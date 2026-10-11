// Fixed, user-facing messages selected by code (never echo raw input).
export const MESSAGES = {
  "invalid-credentials": { tone: "error", text: "Email or password is incorrect." },
  "missing-fields": { tone: "error", text: "Please fill in all fields." },
  "link-invalid": { tone: "error", text: "That link is invalid or has expired. Request a new one." },
  "reset-sent": { tone: "info", text: "If an account exists for that email, a password reset link is on its way." },
  "password-mismatch": { tone: "error", text: "The two passwords do not match." },
  "password-weak": { tone: "error", text: "Use at least 12 characters." },
  "password-failed": { tone: "error", text: "Password could not be updated. Try again or request a new reset link." },
  "password-updated": { tone: "success", text: "Your password has been updated." },
  "signed-out": { tone: "info", text: "You have been signed out." },
  "org-created": { tone: "success", text: "Organisation created." },
  "org-failed": { tone: "error", text: "Organisation could not be created. Check the name and that the short name is unique (lowercase letters, numbers and hyphens)." },
  "member-added": { tone: "success", text: "Member added." },
  "member-not-found": { tone: "error", text: "No account exists for that email. A platform owner must invite the user in Supabase Auth first." },
  "member-failed": { tone: "error", text: "That change was not allowed." },
  "member-updated": { tone: "success", text: "Role updated." },
  "member-removed": { tone: "success", text: "Member removed." },
  "rate-limited": { tone: "error", text: "Too many attempts. Wait a moment and try again." }
} as const;

export type MessageCode = keyof typeof MESSAGES;

export function messageFor(code: string | string[] | undefined) {
  const key = Array.isArray(code) ? code[0] : code;
  return key && key in MESSAGES ? MESSAGES[key as MessageCode] : null;
}
