import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DATADEFENZ GRC",
  description: "Internal GRC platform for DATADEFENZ consulting work.",
  robots: { index: false, follow: false }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
