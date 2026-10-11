import { messageFor } from "@/lib/messages";

export function Notice({ code }: { code?: string | string[] }) {
  const message = messageFor(code);
  if (!message) return null;
  return (
    <p className={`notice notice-${message.tone}`} role={message.tone === "error" ? "alert" : "status"}>
      {message.text}
    </p>
  );
}
