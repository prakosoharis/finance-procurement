import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

// Explicit metadataBase, since Next's own fallback (process.env.VERCEL_URL) is unset/empty
// during some Vercel build phases and crashes prerendering with "Invalid URL" otherwise.
// NEXTAUTH_URL / VERCEL_URL are commonly configured (or auto-populated) as a bare host
// with no scheme — new URL() requires one, so prepend https:// when it's missing.
function withScheme(url: string): string {
  return /^https?:\/\//.test(url) ? url : `https://${url}`;
}
const appUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(withScheme(appUrl)),
  title: "Procurement P&L Intelligence Dashboard",
  description: "Berau Coal Energy — Corporate Procurement Analytics",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
