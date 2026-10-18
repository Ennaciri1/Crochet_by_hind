import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Message } from "@/lib/types";
import { deleteMessage } from "../../actions";

export const metadata: Metadata = { title: "Messages" };

export default async function MessagesPage() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("messages").select("*").order("created_at", { ascending: false });
  const messages = (data ?? []) as Message[];

  return (
    <>
      <h1 style={{ marginTop: "0.5rem" }}>Messages</h1>
      <p className="muted">{messages.length} message{messages.length === 1 ? "" : "s"} from the contact form.</p>
      {error && <p className="notice notice-error">Could not load messages: {error.message}</p>}

      {messages.length === 0 && <p className="empty">No messages yet.</p>}

      {messages.map((m) => (
        <article key={m.id} className="message-card">
          <header>
            <div>
              <strong>{m.name}</strong> · <a href={`mailto:${m.email}`}>{m.email}</a>
            </div>
            <time className="muted" dateTime={m.created_at}>
              {new Date(m.created_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
            </time>
          </header>
          <p>{m.body}</p>
          <div className="button-row" style={{ justifyContent: "flex-start" }}>
            <a className="btn btn-small" href={`mailto:${m.email}?subject=${encodeURIComponent("Re: your message")}`}>
              Reply by email
            </a>
            <form action={deleteMessage}>
              <input type="hidden" name="id" value={m.id} />
              <button className="btn btn-small btn-danger" type="submit">
                Delete
              </button>
            </form>
          </div>
        </article>
      ))}
    </>
  );
}
