import type { Metadata } from "next";

// The admin is always rendered on request (it depends on who is logged in).
export const dynamic = "force-dynamic";

// The admin is never indexed by Google and never shows ads.
export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin" },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="admin">{children}</div>;
}
