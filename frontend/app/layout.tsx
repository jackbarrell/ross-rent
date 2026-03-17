import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "RossRent PoC",
  description: "Short-term rental investment analysis PoC"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
