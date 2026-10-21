"use client";

import { useActionState } from "react";
import type { SiteSettings } from "@/lib/site";
import { saveSettings, type FormState } from "../../actions";

export default function SettingsForm({ site }: { site: SiteSettings }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(saveSettings, null);

  return (
    <form action={formAction} className="editor">
      <div>
        {state?.ok && (
          <p className="notice notice-ok" role="status">
            Settings saved.
          </p>
        )}
        {state?.error && (
          <p className="notice notice-error" role="alert">
            {state.error}
          </p>
        )}

        <section className="panel">
          <h2>Site identity</h2>
          <div className="field">
            <label htmlFor="site_name">Site name</label>
            <input id="site_name" name="site_name" type="text" required defaultValue={site.name} />
          </div>
          <div className="field">
            <label htmlFor="author_name">Author name</label>
            <input id="author_name" name="author_name" type="text" required defaultValue={site.author} />
          </div>
          <div className="field">
            <label htmlFor="description">Description</label>
            <textarea id="description" name="description" rows={3} defaultValue={site.description} />
            <p className="hint">Used in the homepage meta description and social previews.</p>
          </div>
          <div className="field">
            <label htmlFor="author_bio">About me</label>
            <textarea id="author_bio" name="author_bio" rows={4} maxLength={600} defaultValue={site.bio} />
            <p className="hint">
              Shown beside every pattern, under your logo. Two or three friendly sentences: who you are, how
              long you have been crocheting, what readers will find here. Leave empty to hide the box.
            </p>
          </div>
        </section>

        <section className="panel">
          <h2>Contact and social</h2>
          <div className="field">
            <label htmlFor="contact_email">Contact email</label>
            <input id="contact_email" name="contact_email" type="email" required defaultValue={site.email} />
          </div>
          <div className="field">
            <label htmlFor="etsy_url">Etsy shop URL</label>
            <input id="etsy_url" name="etsy_url" type="url" defaultValue={site.etsy} />
          </div>
          <div className="field">
            <label htmlFor="pinterest_url">Pinterest URL</label>
            <input id="pinterest_url" name="pinterest_url" type="url" defaultValue={site.pinterest} />
          </div>
        </section>

        <section className="panel">
          <h2>AdSense</h2>
          <div className="field">
            <label>
              <input type="checkbox" name="ads_enabled" defaultChecked={site.adsEnabled} /> Show ads on the site
            </label>
          </div>
          <div className="field">
            <label htmlFor="adsense_client">AdSense client id</label>
            <input
              id="adsense_client"
              name="adsense_client"
              type="text"
              placeholder="ca-pub-1234567890123456"
              defaultValue={site.adsenseClient}
            />
          </div>
          <div className="grid-2">
            <div className="field">
              <label htmlFor="adsense_slot_display">Display ad slot id</label>
              <input id="adsense_slot_display" name="adsense_slot_display" type="text" defaultValue={site.adsenseSlotDisplay} />
            </div>
            <div className="field">
              <label htmlFor="adsense_slot_in_article">In-article ad slot id</label>
              <input
                id="adsense_slot_in_article"
                name="adsense_slot_in_article"
                type="text"
                defaultValue={site.adsenseSlotInArticle}
              />
            </div>
          </div>
        </section>

        <div className="button-row">
          <button className="btn btn-primary" type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save settings"}
          </button>
        </div>
      </div>
    </form>
  );
}
