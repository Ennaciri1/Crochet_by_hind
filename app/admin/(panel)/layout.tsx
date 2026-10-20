import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signOut } from "../actions";

/**
 * Every admin page (except login) goes through here.
 * Logged-in users who are NOT in the "admins" table see a clear message.
 */
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: isAdmin } = await supabase.rpc("is_admin");

  const logout = (
    <form action={signOut}>
      <button className="btn btn-small" type="submit">
        Log out
      </button>
    </form>
  );

  if (!isAdmin) {
    return (
      <main className="wrap">
        <div className="login-box">
          <h1>Access denied</h1>
          <p>
            You are logged in as <strong>{user.email}</strong>, but this account is not an admin of the site.
          </p>
          <p className="muted">
            To fix it, add this user to the <code>admins</code> table in Supabase (see the README, step 1).
          </p>
          {logout}
        </div>
      </main>
    );
  }

  return (
    <>
      <header className="admin-bar">
        <div className="wrap">
          <nav aria-label="Admin">
            <Link href="/admin">Posts</Link>
            <Link href="/admin/posts/new">+ New post</Link>
            <Link href="/admin/import">Import</Link>
            <Link href="/admin/messages">Messages</Link>
            <Link href="/admin/settings">Settings</Link>
            <Link href="/admin/categories">Categories</Link>
            <Link href="/admin/pages">Pages</Link>
            <Link href="/" target="_blank">
              View site ↗
            </Link>
          </nav>
          {logout}
        </div>
      </header>
      <main className="wrap">{children}</main>
    </>
  );
}
