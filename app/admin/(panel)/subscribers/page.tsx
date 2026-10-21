import type { Metadata } from "next";
import { deleteSubscriber } from "../../actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import ExportButton from "./ExportButton";

export const metadata: Metadata = { title: "Subscribers" };

type Row = { id: string; name: string; email: string; source: string; created_at: string };

export default async function SubscribersPage() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("subscribers")
    .select("id, name, email, source, created_at")
    .order("created_at", { ascending: false });

  const rows = (data ?? []) as Row[];

  return (
    <>
      <div className="section-head" style={{ marginTop: "0.5rem" }}>
        <h1 style={{ margin: 0 }}>Subscribers</h1>
        <ExportButton rows={rows.map(({ name, email, source, created_at }) => ({ name, email, source, created_at }))} />
      </div>

      {error && (
        <p className="notice notice-error">
          {/* PGRST205 from the API, 42P01 straight from Postgres: both mean the
              table has not been created yet. */}
          {error.code === "PGRST205" || error.code === "42P01" ? (
            <>
              The <code>subscribers</code> table does not exist yet. Open Supabase → SQL Editor → New query,
              paste the contents of <code>supabase/add-subscribers.sql</code> and click Run.
            </>
          ) : (
            <>Could not load subscribers: {error.message}</>
          )}
        </p>
      )}

      <div className="stats">
        <div className="stat">
          <b>{rows.length}</b> email{rows.length === 1 ? "" : "s"} collected
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="empty">
          No sign-ups yet. The form sits at the bottom of every post, under the FAQ.
        </p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Name</th>
              <th>Signed up from</th>
              <th>Date</th>
              <th>
                <span className="visually-hidden">Delete</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td data-label="Email">
                  <a href={`mailto:${r.email}`}>{r.email}</a>
                </td>
                <td data-label="Name">{r.name || <span className="muted">—</span>}</td>
                <td data-label="Signed up from">
                  {r.source ? <span className="slug">{r.source}</span> : <span className="muted">—</span>}
                </td>
                <td data-label="Date">{formatDate(r.created_at)}</td>
                <td>
                  <form action={deleteSubscriber}>
                    <input type="hidden" name="id" value={r.id} />
                    <button className="btn btn-small btn-danger" type="submit">
                      Delete
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
