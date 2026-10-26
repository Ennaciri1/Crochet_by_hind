/**
 * Sends a new subscriber to Brevo (the mailing-list provider).
 *
 * Two rules shape this file:
 *
 * 1. It is optional. With no BREVO_API_KEY the site behaves exactly as before
 *    and every address still lands in Supabase, so the blog keeps working for
 *    an owner who has not set Brevo up yet.
 * 2. It never throws and never blocks. The address is already saved in our own
 *    database before this runs, so a slow or broken Brevo must not turn a
 *    successful sign-up into an error message for the reader. Anything that
 *    fails here is recoverable later from /admin/subscribers → Download CSV.
 *
 * BREVO_API_KEY is server-only: it must never gain a NEXT_PUBLIC_ prefix, or
 * it would be shipped to every visitor's browser.
 */

const ENDPOINT = "https://api.brevo.com/v3/contacts";
const TIMEOUT_MS = 5000;

export type BrevoResult = { synced: boolean; reason?: string };

export function isBrevoConfigured() {
  return Boolean(process.env.BREVO_API_KEY);
}

type Payload = {
  email: string;
  listIds?: number[];
  updateEnabled: boolean;
  attributes?: Record<string, string>;
};

async function post(apiKey: string, payload: Payload) {
  return fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
}

export async function addSubscriberToBrevo(subscriber: {
  email: string;
  name?: string;
}): Promise<BrevoResult> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) return { synced: false, reason: "BREVO_API_KEY is not set" };

  const listId = Number(process.env.BREVO_LIST_ID);
  // Brevo only accepts attributes that already exist on the account. Most
  // accounts call the first name FIRSTNAME; set BREVO_NAME_ATTRIBUTE if yours
  // uses something else (older accounts use FNAME).
  const nameAttribute = process.env.BREVO_NAME_ATTRIBUTE || "FIRSTNAME";

  const base: Payload = {
    email: subscriber.email,
    // updateEnabled lets someone who is already in Brevo be re-added to the
    // list instead of coming back as a conflict.
    updateEnabled: true,
    ...(Number.isFinite(listId) && listId > 0 ? { listIds: [listId] } : {}),
  };

  const withName: Payload = subscriber.name
    ? { ...base, attributes: { [nameAttribute]: subscriber.name } }
    : base;

  try {
    let response = await post(apiKey, withName);

    // A wrong attribute name is the one failure worth retrying: better to save
    // the address without the first name than to lose the subscriber.
    if (!response.ok && withName !== base) {
      const body = await response.text();
      if (/attribute/i.test(body)) {
        console.warn(`brevo: attribute "${nameAttribute}" rejected, retrying without it`);
        response = await post(apiKey, base);
      } else {
        return { synced: false, reason: `HTTP ${response.status}: ${body.slice(0, 200)}` };
      }
    }

    if (response.ok) return { synced: true };

    const body = await response.text().catch(() => "");
    // Already a contact on this account: nothing wrong, nothing to do.
    if (response.status === 400 && /duplicate/i.test(body)) return { synced: true };

    return { synced: false, reason: `HTTP ${response.status}: ${body.slice(0, 200)}` };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown error";
    return { synced: false, reason };
  }
}

/* ------------------------------------------------------------------ */
/* Reading contacts back, for /admin/subscribers                       */
/* ------------------------------------------------------------------ */

export type BrevoContact = {
  id: number;
  email: string;
  name: string;
  lists: string[];
  unsubscribed: boolean;
  createdAt: string;
};

export type BrevoContacts =
  | { configured: false }
  | { configured: true; contacts: BrevoContact[]; total: number; error?: string };

/** Brevo returns at most 1000 contacts per call; we read up to 5 pages. */
const PAGE = 1000;
const MAX_PAGES = 5;

/**
 * Every contact in the Brevo account — including people who signed up through
 * a form hosted by Brevo itself, which never pass through this website — so
 * the owner can see the whole mailing list from /admin.
 *
 * Same rule as above: it never throws. A slow or broken Brevo shows a message
 * on the admin page instead of crashing it.
 */
export async function listBrevoContacts(): Promise<BrevoContacts> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) return { configured: false };

  const get = (path: string) =>
    fetch(`https://api.brevo.com/v3${path}`, {
      headers: { "api-key": apiKey, accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });

  try {
    // List names, so the page can say "Newsletter Crochet Henouda" instead of "5".
    const listNames = new Map<number, string>();
    const listsRes = await get("/contacts/lists?limit=50");
    if (listsRes.ok) {
      const body = (await listsRes.json()) as { lists?: { id: number; name: string }[] };
      for (const l of body.lists ?? []) listNames.set(l.id, l.name);
    }

    type Raw = {
      id: number;
      email?: string;
      emailBlacklisted?: boolean;
      createdAt?: string;
      listIds?: number[];
      listUnsubscribed?: number[];
      attributes?: Record<string, unknown>;
    };

    const raw: Raw[] = [];
    let total = 0;
    for (let page = 0; page < MAX_PAGES; page += 1) {
      const res = await get(`/contacts?limit=${PAGE}&offset=${page * PAGE}&sort=desc`);
      if (!res.ok) {
        const reason = res.status === 401 ? "the Brevo API key was refused" : `Brevo answered ${res.status}`;
        return { configured: true, contacts: [], total: 0, error: reason };
      }
      const body = (await res.json()) as { contacts?: Raw[]; count?: number };
      total = body.count ?? 0;
      raw.push(...(body.contacts ?? []));
      if (raw.length >= total || (body.contacts ?? []).length < PAGE) break;
    }

    const contacts = raw
      // Contacts without an email (e.g. Brevo's own chat "Welcome Bot") are not subscribers.
      .filter((c) => c.email)
      .map((c) => {
        const attrs = c.attributes ?? {};
        const name = [attrs.FIRSTNAME ?? attrs.FNAME ?? attrs.PRENOM, attrs.LASTNAME ?? attrs.LNAME ?? attrs.NOM]
          .filter((v) => typeof v === "string" && v)
          .join(" ");
        return {
          id: c.id,
          email: c.email as string,
          name,
          lists: (c.listIds ?? []).map((id) => listNames.get(id) ?? `List #${id}`),
          unsubscribed: Boolean(c.emailBlacklisted) || (c.listUnsubscribed ?? []).length > 0,
          createdAt: c.createdAt ?? "",
        };
      });

    return { configured: true, contacts, total };
  } catch (e) {
    console.error("brevo: could not list contacts:", (e as Error).message);
    return { configured: true, contacts: [], total: 0, error: "Brevo did not answer in time" };
  }
}
