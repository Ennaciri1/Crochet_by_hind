import type { Metadata } from "next";
import { getSiteSettings } from "@/lib/site";
import SettingsForm from "./SettingsForm";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const site = await getSiteSettings();
  return (
    <>
      <div className="section-head" style={{ marginTop: "0.5rem" }}>
        <h1 style={{ margin: 0 }}>Settings</h1>
      </div>
      <SettingsForm site={site} />
    </>
  );
}
