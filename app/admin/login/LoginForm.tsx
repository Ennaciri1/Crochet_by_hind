"use client";

import { useActionState } from "react";
import { signIn, type FormState } from "../actions";

export default function LoginForm() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(signIn, null);

  return (
    <form action={formAction}>
      {state?.error && (
        <p className="notice notice-error" role="alert">
          {state.error}
        </p>
      )}
      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      <button className="btn btn-primary" type="submit" disabled={pending} style={{ width: "100%" }}>
        {pending ? "Logging in…" : "Log in"}
      </button>
    </form>
  );
}
