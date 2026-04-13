import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "חרוטלי | פאנל ניהול",
  description: "פאנל ניהול חנות חרוטלי",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body className="min-h-svh">{children}</body>
    </html>
  );
}
