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
  "scope-saved": { tone: "success", text: "Framework scope saved." },
  "scope-failed": { tone: "error", text: "The framework scope could not be changed. Only customer admins and platform owners can do this." },
  "assessment-saved": { tone: "success", text: "Assessment saved." },
  "assessment-failed": { tone: "error", text: "The assessment could not be saved. You may not have permission." },
  "evidence-added": { tone: "success", text: "Evidence record added." },
  "evidence-failed": { tone: "error", text: "The evidence could not be saved. Check the title and file (max 10 MB) and your permissions." },
  "evidence-removed": { tone: "success", text: "Evidence record removed." },
  "guidance-saved": { tone: "success", text: "Guidance saved." },
  "guidance-failed": { tone: "error", text: "Guidance could not be saved. Only platform owners can edit it." },
  "review-saved": { tone: "success", text: "Mapping review recorded." },
  "review-failed": { tone: "error", text: "The mapping review could not be recorded." },
  "rate-limited": { tone: "error", text: "Too many attempts. Wait a moment and try again." }
} as const;

export type MessageCode = keyof typeof MESSAGES;

export function messageFor(code: string | string[] | undefined) {
  const key = Array.isArray(code) ? code[0] : code;
  return key && key in MESSAGES ? MESSAGES[key as MessageCode] : null;
}
