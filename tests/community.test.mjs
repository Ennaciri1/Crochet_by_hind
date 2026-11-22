import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import Module from "node:module";
import path from "node:path";
import { before, beforeEach, after, test } from "node:test";
import { PGlite } from "@electric-sql/pglite";

const db = new PGlite();
const post = "11111111-1111-4111-8111-111111111111";
const otherPost = "22222222-2222-4222-8222-222222222222";
const draft = "33333333-3333-4333-8333-333333333333";
const scheduled = "44444444-4444-4444-8444-444444444444";
const visitor = "55555555-5555-4555-8555-555555555555";
const otherVisitor = "66666666-6666-4666-8666-666666666666";
const admin = "77777777-7777-4777-8777-777777777777";

// Only Supabase's supporting schemas are fixtures. The community DDL,
// functions, privileges and policies come unchanged from the real migration.
before(async () => {
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    grant usage on schema public to anon, authenticated, service_role;
    create schema auth;
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
    $$;
    create table public.posts(id uuid primary key, status text, published_at timestamptz);
    create table public.admins(user_id uuid primary key);
    create table public.settings(id int primary key, author_name text);
    create table public.pages(slug text primary key, content text);
    create function public.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
      select exists(select 1 from public.admins where user_id = auth.uid());
    $$;
    insert into public.posts values
      ('${post}', 'published', now() - interval '1 day'),
      ('${otherPost}', 'published', now() - interval '1 day'),
      ('${draft}', 'draft', now() - interval '1 day'),
      ('${scheduled}', 'published', now() + interval '1 day');
    insert into public.admins values ('${admin}');
    insert into public.settings values (1, 'Henouda');
    insert into public.pages values ('privacy-policy', 'Our privacy policy.');
  `);
  const migration = readFileSync(new URL("../supabase/add-community.sql", import.meta.url), "utf8");
  await db.exec(migration);
  await db.exec(migration);
});

beforeEach(async () => {
  await db.exec("reset role; select set_config('request.jwt.claim.sub', '', false); truncate public.post_comments, public.post_likes;");
});
after(() => db.close());

async function role(name, user = "") {
  await db.exec("reset role;");
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [user]);
  await db.exec(`set role ${name}`);
}
async function community(id = post, who = visitor, page = 1) {
  return (await db.query("select public.get_post_community($1, $2, $3) as result", [id, who, page])).rows[0].result;
}
async function like(state = true, who = visitor, id = post) {
  return Number((await db.query("select public.set_post_like($1, $2, $3) as result", [id, who, state])).rows[0].result);
}
async function comment({ id = post, who = visitor, name = "Amina", body = "I love this pattern!", parent = null } = {}) {
  return (await db.query("select public.add_post_comment($1, $2, $3, $4, $5) as result", [id, who, name, body, parent])).rows[0].result;
}
async function approve(id) {
  await role("authenticated", admin);
  await db.query("update public.post_comments set status = 'approved' where id = $1", [id]);
  await role("anon");
}

test("migration can run twice without duplicating the privacy disclosure", async () => {
  const { content } = (await db.query("select content from public.pages where slug = 'privacy-policy'")).rows[0];
  assert.equal(content.split("## Comments and likes").length - 1, 1);
});

test("likes persist, retries are idempotent, and browsers can only remove their own like", async () => {
  await role("anon");
  assert.equal(await like(), 1);
  assert.equal(await like(), 1);
  assert.equal(await like(true, otherVisitor), 2);
  assert.equal(await like(false, otherVisitor), 1);
  assert.equal((await community()).liked, true);
  assert.equal((await community(post, otherVisitor)).liked, false);
  assert.equal(await like(false), 0);
});

test("drafts, future posts and nonexistent posts reject reads and writes", async () => {
  await role("anon");
  for (const id of [draft, scheduled, "99999999-9999-4999-8999-999999999999"]) {
    await assert.rejects(community(id), { code: "P0002" });
    await assert.rejects(like(true, visitor, id), { code: "P0002" });
    await assert.rejects(comment({ id }), { code: "P0002" });
  }
});

test("pending messages and private visitor IDs cannot be read directly", async () => {
  await role("anon");
  const id = await comment();
  assert.equal((await community()).comment_count, 0);
  assert.deepEqual((await community()).comments, []);
  await assert.rejects(db.query("select * from public.post_comments"), { code: "42501" });
  await assert.rejects(db.query("select * from public.post_likes"), { code: "42501" });
  await assert.rejects(db.query("update public.post_comments set status = 'approved'"), { code: "42501" });
  await approve(id);
  const visible = await community();
  assert.equal(visible.comment_count, 1);
  assert.equal(visible.comments[0].body, "I love this pattern!");
  assert.equal(visible.comments[0].is_author, false);
  assert.ok(!JSON.stringify(visible).includes(visitor));
});

test("comment spam is limited at the database boundary, including across posts", async () => {
  await role("anon");
  await comment();
  await assert.rejects(comment({ id: otherPost }), /COMMENT_RATE_LIMIT/);
  assert.ok(await comment({ who: otherVisitor }));
  await assert.rejects(comment({ who: null }), { code: "22023" });
  await assert.rejects(comment({ who: admin, body: "a" }), { code: "22023" });
  await assert.rejects(comment({ who: admin, name: "x".repeat(61) }), { code: "22023" });
});

test("replies require an approved parent on the same post; hiding a thread hides its replies", async () => {
  await role("anon");
  const root = await comment();
  await assert.rejects(comment({ who: otherVisitor, parent: root }), /REPLY_NOT_AVAILABLE/);
  await approve(root);
  await assert.rejects(comment({ id: otherPost, who: otherVisitor, parent: root }), /REPLY_NOT_AVAILABLE/);
  const reply = await comment({ who: otherVisitor, parent: root });
  await approve(reply);
  assert.equal((await community()).comment_count, 2);
  assert.equal((await community()).comments.find((item) => item.id === reply).parent_id, root);
  await assert.rejects(comment({ who: admin, parent: reply }), /REPLY_NOT_AVAILABLE/);
  await role("authenticated", admin);
  await db.query("update public.post_comments set status = 'hidden' where id = $1", [root]);
  await role("anon");
  assert.equal((await community()).comment_count, 0);
  assert.deepEqual((await community()).comments, []);
});

test("only an authenticated admin gets an author badge or can moderate", async () => {
  await role("authenticated", otherVisitor);
  const guest = await comment({ name: "Henouda" });
  assert.equal((await db.query("update public.post_comments set status = 'approved' returning id")).rows.length, 0);
  assert.deepEqual((await db.query("select * from public.post_comments")).rows, []);
  await role("authenticated", admin);
  const author = await comment({ name: "Forged name", who: admin });
  await role("anon");
  const result = await community();
  assert.equal(result.comment_count, 1);
  assert.equal(result.comments[0].id, author);
  assert.equal(result.comments[0].name, "Henouda");
  assert.equal(result.comments[0].is_author, true);
  assert.ok(!result.comments.find((item) => item.id === guest));
});

test("conversation pages do not overlap and include approved replies with their parent", async () => {
  await db.exec(`insert into public.post_comments(post_id, visitor_id, name, body, status)
    select '${post}', gen_random_uuid(), 'Reader ' || n, 'A lovely project!', 'approved' from generate_series(1, 21) n;`);
  await role("anon");
  const first = await community();
  const second = await community(post, visitor, 2);
  assert.equal(first.comments.length, 20);
  assert.equal(first.has_more, true);
  assert.equal(second.comments.length, 1);
  assert.equal(second.has_more, false);
  assert.equal(new Set([...first.comments, ...second.comments].map((item) => item.id)).size, 21);
  await assert.rejects(community(post, visitor, 0), { code: "22023" });
  const reply = await comment({ parent: second.comments[0].id });
  await approve(reply);
  const updated = await community(post, visitor, 2);
  assert.equal(updated.comments.length, 2);
  assert.ok(updated.comments.some((item) => item.id === reply));
});

// Exercise the actual HTTP handlers against the same PostgreSQL functions.
// Only the Supabase transport is replaced; no network or production data.
const require = createRequire(import.meta.url);
const ts = require("typescript");
const { NextRequest } = require("next/server");
const routePath = path.resolve("app/api/community/[postId]/route.ts");
const routeModule = new Module(routePath);
routeModule.filename = routePath;
routeModule.paths = Module._nodeModulePaths(path.dirname(routePath));
let rpcCalls = 0;
routeModule.require = (name) => {
  if (name === "@/lib/community") return { UUID_PATTERN: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i };
  if (name === "@/lib/supabase/public") return { getPublicClient: () => ({ rpc: async (name, args) => {
    rpcCalls++;
    await role("anon");
    try {
      const keys = Object.keys(args);
      const sql = `select public.${name}(${keys.map((key, i) => `${key} => $${i + 1}`).join(", ")}) as result`;
      return { data: (await db.query(sql, Object.values(args))).rows[0].result, error: null };
    } catch (error) { return { data: null, error: { code: error.code, message: error.message } }; }
  } }) };
  return require(name);
};
routeModule._compile(ts.transpileModule(readFileSync(routePath, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, routePath);
const handlers = routeModule.exports;
function httpRequest(body, origin = "https://crochet.test", cookie) {
  return new NextRequest(`https://crochet.test/api/community/${post}`, { method: "POST", headers: {
    origin, "content-type": "application/json", ...(cookie ? { cookie } : {}),
  }, body: JSON.stringify(body) });
}
const context = { params: Promise.resolve({ postId: post }) };

test("HTTP mutations reject cross-site and malformed requests before reaching the database", async () => {
  rpcCalls = 0;
  assert.equal((await handlers.POST(httpRequest({ operation: "like", liked: true }, "https://other.test"), context)).status, 403);
  assert.equal((await handlers.POST(httpRequest({ operation: "like", liked: "yes" }), context)).status, 400);
  assert.equal((await handlers.POST(httpRequest({ operation: "comment", name: "Amina", body: "a" }), context)).status, 400);
  assert.equal((await handlers.POST(httpRequest({ operation: "comment", name: "Amina", body: "x".repeat(13000) }), context)).status, 413);
  assert.equal(rpcCalls, 0);
});

test("HTTP likes persist through a private cookie; pending comments remain private", async () => {
  const liked = await handlers.POST(httpRequest({ operation: "like", liked: true }), context);
  assert.equal(liked.status, 200);
  const cookie = liked.headers.get("set-cookie");
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /SameSite=lax/i);
  assert.match(liked.headers.get("cache-control"), /no-store/);
  const browserCookie = cookie.split(";")[0];
  const retry = await handlers.POST(httpRequest({ operation: "like", liked: true }, undefined, browserCookie), context);
  assert.equal((await retry.json()).likes, 1);
  const read = await handlers.GET(new NextRequest(`https://crochet.test/api/community/${post}`, { headers: { cookie: browserCookie } }), context);
  assert.equal((await read.json()).liked, true);
  const submitted = await handlers.POST(httpRequest({ operation: "comment", name: "Amina", body: "Thank you for sharing!" }, undefined, browserCookie), context);
  assert.equal(submitted.status, 200);
  const publicRead = await handlers.GET(new NextRequest(`https://crochet.test/api/community/${post}`), context);
  assert.equal((await publicRead.json()).comment_count, 0);
  const rateLimited = await handlers.POST(httpRequest({ operation: "comment", name: "Amina", body: "A second comment." }, undefined, browserCookie), context);
  assert.equal(rateLimited.status, 429);
});
