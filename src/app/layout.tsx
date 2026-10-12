import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Techstyles — Apparel Workspace",
  description:
    "Your independent workspace for apparel tech packs, sketches and production.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
