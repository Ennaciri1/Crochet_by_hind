"use client";

import { useActionState } from "react";
import type { StaticPageContent } from "@/lib/pages";
import { saveStaticPage, type FormState } from "../../../actions";

export default function PageForm({ page }: { page: StaticPageContent }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(saveStaticPage, null);

  return (
    <form action={formAction} className="editor">
      <div>
        {state?.error && (
          <p className="notice notice-error" role="alert">
            {state.error}
          </p>
        )}

        <section className="panel">
          <input type="hidden" name="slug" value={page.slug} />
          <div className="field">
            <label htmlFor="title">Title</label>
            <input id="title" name="title" type="text" required defaultValue={page.title} />
          </div>
          <div className="field">
            <label htmlFor="content">Content (Markdown)</label>
            <textarea id="content" name="content" className="content" rows={24} defaultValue={page.content} />
          </div>
        </section>

        <div className="button-row">
          <button className="btn btn-primary" type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save page"}
          </button>
        </div>
      </div>
    </form>
  );
}
