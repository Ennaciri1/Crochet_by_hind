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
