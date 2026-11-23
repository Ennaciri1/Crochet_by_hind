import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { UUID_PATTERN } from "@/lib/community";
import { getPublicClient } from "@/lib/supabase/public";

const COOKIE = "crochet_visitor";
const headers = { "Cache-Control": "private, no-store" };
type Context = { params: Promise<{ postId: string }> };

function failure(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status, headers });
}

function databaseError(error: { code?: string; message: string }) {
  if (error.code === "P0002") return failure("This post is no longer available.", 404);
  if (error.message.includes("COMMENT_RATE_LIMIT")) return failure("Please wait a minute before posting another comment.", 429);
  if (error.message.includes("REPLY_NOT_AVAILABLE")) return failure("This conversation has changed. Refresh the comments and try again.");
  console.error("community:", error.code);
  return failure("Likes and comments are temporarily unavailable. Please try again later.", 503);
}

function visitor(request: NextRequest) {
  const value = request.cookies.get(COOKIE)?.value;
  return value && UUID_PATTERN.test(value) ? value : undefined;
}

export async function GET(request: NextRequest, context: Context) {
  const { postId } = await context.params;
  if (!UUID_PATTERN.test(postId)) return failure("Post not found.", 404);
  const page = Number(request.nextUrl.searchParams.get("page") || 1);
  if (!Number.isInteger(page) || page < 1 || page > 10000) return failure("Invalid comments page.");
  const supabase = getPublicClient();
  if (!supabase) return failure("Likes and comments are temporarily unavailable.", 503);
  const { data, error } = await supabase.rpc("get_post_community", {
    p_post_id: postId, p_visitor_id: visitor(request) ?? null, p_page: page,
  });
  if (error) return databaseError(error);
  return NextResponse.json(data, { headers });
}

export async function POST(request: NextRequest, context: Context) {
  const { postId } = await context.params;
  if (!UUID_PATTERN.test(postId)) return failure("Post not found.", 404);
  const origin = request.headers.get("origin");
  try {
    if (!origin || new URL(origin).host !== request.nextUrl.host) return failure("Please submit from the blog page.", 403);
  } catch { return failure("Invalid request.", 403); }
  if (!request.headers.get("content-type")?.startsWith("application/json")) return failure("Invalid request.");
  if (Number(request.headers.get("content-length")) > 12000) return failure("Your message is too long.", 413);
  let body;
  try {
    const raw = await request.text();
    if (Buffer.byteLength(raw) > 12000) return failure("Your message is too long.", 413);
    body = JSON.parse(raw);
    if (!body || typeof body !== "object" || Array.isArray(body)) return failure("Invalid request.");
  } catch { return failure("Invalid request."); }
  const supabase = getPublicClient();
  if (!supabase) return failure("Likes and comments are temporarily unavailable.", 503);
  const visitorId = visitor(request) ?? randomUUID();
  let response: NextResponse;
  if (body.operation === "like" && typeof body.liked === "boolean") {
    const { data, error } = await supabase.rpc("set_post_like", {
      p_post_id: postId, p_visitor_id: visitorId, p_liked: body.liked,
    });
    if (error) return databaseError(error);
    response = NextResponse.json({ likes: Number(data), liked: body.liked }, { headers });
  } else if (body.operation === "comment") {
    if (body.website) return NextResponse.json({ ok: true }, { headers });
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const message = typeof body.body === "string" ? body.body.trim() : "";
    if (!name || name.length > 60) return failure("Please enter your name (60 characters max).");
    if (message.length < 3 || message.length > 2000) return failure("Your comment should be between 3 and 2,000 characters.");
    if (body.parentId != null && (typeof body.parentId !== "string" || !UUID_PATTERN.test(body.parentId))) return failure("Invalid reply.");
    const { error } = await supabase.rpc("add_post_comment", {
      p_post_id: postId, p_visitor_id: visitorId, p_name: name, p_body: message, p_parent_id: body.parentId ?? null,
    });
    if (error) return databaseError(error);
    response = NextResponse.json({ ok: true }, { headers });
  } else { return failure("Invalid request."); }
  response.cookies.set(COOKIE, visitorId, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 31536000,
  });
  return response;
}
