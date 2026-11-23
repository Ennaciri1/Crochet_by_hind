"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { UUID_PATTERN } from "@/lib/community";

export type ModerationState = { ok?: boolean; error?: string } | null;

export async function moderateComment(_previous: ModerationState, form: FormData): Promise<ModerationState> {
  const supabase = await requireAdmin();
  const id = String(form.get("id") ?? "");
  const status = String(form.get("status") ?? "");
  if (!UUID_PATTERN.test(id) || !["approved", "hidden"].includes(status)) return { error: "Invalid comment." };
  const { data: comment } = await supabase.from("post_comments").select("parent_id").eq("id", id).maybeSingle();
  if (!comment) return { error: "This comment is no longer available." };
  if (status === "approved" && comment.parent_id) {
    const { data: parent } = await supabase.from("post_comments").select("status").eq("id", comment.parent_id).maybeSingle();
    if (parent?.status !== "approved") return { error: "Approve the original comment before approving its replies." };
  }
  const { error } = await supabase.from("post_comments").update({ status }).eq("id", id);
  if (error) return { error: "Could not update the comment. Please try again." };
  revalidatePath("/admin/comments");
  return { ok: true };
}

export async function replyToComment(_previous: ModerationState, form: FormData): Promise<ModerationState> {
  const supabase = await requireAdmin();
  const parentId = String(form.get("parent_id") ?? "");
  const postId = String(form.get("post_id") ?? "");
  const body = String(form.get("body") ?? "").trim();
  if (!UUID_PATTERN.test(parentId) || !UUID_PATTERN.test(postId)) return { error: "Invalid conversation." };
  if (body.length < 3 || body.length > 2000) return { error: "Your reply should be between 3 and 2,000 characters." };
  const { error } = await supabase.rpc("add_post_comment", {
    p_post_id: postId, p_visitor_id: randomUUID(), p_parent_id: parentId, p_name: "Author", p_body: body,
  });
  if (error) return { error: error.message.includes("REPLY_NOT_AVAILABLE") ? "Approve the original comment first." : "Could not publish your reply. Please try again." };
  revalidatePath("/admin/comments");
  return { ok: true };
}
