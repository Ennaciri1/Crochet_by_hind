"use client";

type Row = { name: string; email: string; source: string; created_at: string };

/** Downloads the list as a .csv you can open in Excel or paste into Mailchimp. */
export default function ExportButton({ rows }: { rows: Row[] }) {
  function download() {
    // A field containing a quote, comma or newline has to be quoted for Excel.
    const cell = (value: string) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const lines = [
      ["Name", "Email", "Signed up from", "Date"].join(","),
      ...rows.map((r) => [cell(r.name), cell(r.email), cell(r.source), cell(r.created_at)].join(",")),
    ];
    // The BOM makes Excel read accented names correctly.
    const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button type="button" className="btn btn-small" onClick={download} disabled={rows.length === 0}>
      Download CSV
    </button>
  );
}
