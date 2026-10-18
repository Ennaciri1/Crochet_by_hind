"use client";

import { useActionState } from "react";
import { sendMessage, type ContactState } from "./actions";

export default function ContactForm() {
  const [state, formAction, pending] = useActionState<ContactState, FormData>(sendMessage, null);

  if (state?.ok) {
    return (
      <p className="notice notice-ok" role="status">
        {state.message}
      </p>
    );
  }

  return (
    <form action={formAction} noValidate={false}>
      {state && !state.ok && (
        <p className="notice notice-error" role="alert">
          {state.message}
        </p>
      )}

      <div className="field">
        <label htmlFor="name">Your name</label>
        <input id="name" name="name" type="text" required maxLength={100} autoComplete="name" />
      </div>
      <div className="field">
        <label htmlFor="email">Your email</label>
        <input id="email" name="email" type="email" required maxLength={200} autoComplete="email" />
      </div>
      <div className="field">
        <label htmlFor="body">Message</label>
        <textarea id="body" name="body" rows={7} required minLength={10} maxLength={5000} />
      </div>

      {/* Honeypot anti-spam field: hidden from people, bots fill it in. */}
      <div className="honeypot" aria-hidden="true">
        <label htmlFor="website">Leave this field empty</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <button className="btn btn-primary" type="submit" disabled={pending}>
        {pending ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
