"use client";

import { useActionState } from "react";
import { subscribe, type SubscribeState } from "@/app/(site)/newsletter/actions";

/**
 * The email box at the bottom of every post.
 * `source` records which post someone signed up from, so the admin can see
 * which patterns actually bring subscribers in.
 */
export default function SubscribeForm({ source }: { source?: string }) {
  const [state, formAction, pending] = useActionState<SubscribeState, FormData>(subscribe, null);

  return (
    <section className="subscribe" aria-labelledby="subscribe-title">
      <div className="subscribe-text">
        <h2 id="subscribe-title">Never miss a free pattern</h2>
        <p>
          Join the mailing list and get new crochet patterns, beginner tips and the occasional freebie —
          straight to your inbox.
        </p>
      </div>

      {state?.ok ? (
        <p className="notice notice-ok subscribe-done" role="status">
          {state.message}
        </p>
      ) : (
        <form className="subscribe-form" action={formAction}>
          {state && !state.ok && (
            <p className="notice notice-error" role="alert">
              {state.message}
            </p>
          )}

          <input type="hidden" name="source" value={source ?? ""} />

          <div className="subscribe-fields">
            <div className="field">
              <label htmlFor="sub-name">First name</label>
              <input
                id="sub-name"
                name="name"
                type="text"
                maxLength={100}
                autoComplete="given-name"
                placeholder="Amina"
              />
            </div>
            <div className="field">
              <label htmlFor="sub-email">Email address</label>
              <input
                id="sub-email"
                name="email"
                type="email"
                required
                maxLength={200}
                autoComplete="email"
                placeholder="you@example.com"
              />
            </div>
          </div>

          {/* Honeypot anti-spam field: hidden from people, bots fill it in. */}
          <div className="honeypot" aria-hidden="true">
            <label htmlFor="sub-website">Leave this field empty</label>
            <input id="sub-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
          </div>

          <button className="btn btn-primary" type="submit" disabled={pending}>
            {pending ? "Signing you up…" : "Send me patterns"}
          </button>

          <p className="subscribe-small">No spam, ever. Unsubscribe any time.</p>
        </form>
      )}
    </section>
  );
}
