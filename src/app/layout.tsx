import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fennlo — Client Next Move",
  description:
    "Paste the client conversation, set your goal, and get the single next move.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
