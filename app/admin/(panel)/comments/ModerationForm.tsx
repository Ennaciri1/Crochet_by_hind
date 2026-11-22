"use client";

import { useActionState, useEffect, useState } from "react";
import { moderateComment, replyToComment, type ModerationState } from "./actions";

export default function ModerationForm({ id, postId, parentId, status }: {
  id: string; postId: string; parentId: string | null; status: string;
}) {
  const [state, action, pending] = useActionState<ModerationState, FormData>(moderateComment, null);
  const [replyState, replyAction, replying] = useActionState<ModerationState, FormData>(replyToComment, null);
  const [body, setBody] = useState("");
  useEffect(() => { if (replyState?.ok) setBody(""); }, [replyState]);
  return (
    <>
      <form action={action} className="community-moderation-actions">
        <input type="hidden" name="id" value={id} />
        {status !== "approved" && <button className="btn btn-primary btn-small" type="submit" name="status" value="approved" disabled={pending}>Approve</button>}
        {status !== "hidden" && <button className="btn btn-small" type="submit" name="status" value="hidden" disabled={pending}>Hide</button>}
      </form>
      {state?.error && <p className="notice notice-error" role="alert">{state.error}</p>}
      {status === "approved" && (
        <details className="community-admin-reply">
          <summary>Reply as the designer</summary>
          <form action={replyAction}>
            <input type="hidden" name="post_id" value={postId} />
            <input type="hidden" name="parent_id" value={parentId || id} />
            <label htmlFor={`reply-${id}`}>Your reply</label>
            <textarea id={`reply-${id}`} name="body" rows={3} minLength={3} maxLength={2000} required value={body} onChange={(event) => setBody(event.target.value)} />
            <button className="btn btn-primary btn-small" type="submit" disabled={replying}>{replying ? "Publishing…" : "Publish reply"}</button>
            {replyState?.error && <p className="notice notice-error" role="alert">{replyState.error}</p>}
            {replyState?.ok && <p className="notice notice-ok" role="status">Your reply is published with your designer badge.</p>}
          </form>
        </details>
      )}
    </>
  );
}
