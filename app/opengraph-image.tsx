import { ImageResponse } from "next/og";
import { site } from "@/lib/site";

/** Default social sharing image (used when a page has no cover photo). */
export const alt = `${site.name} – Free crochet patterns`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 36,
          background: "#ffffff",
          color: "#2f2a3a",
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: 60,
            border: "6px dashed #f6a9bf", background: "#fff0f4",
            borderRadius: 28,
          }}
        >
        <div style={{ fontSize: 30, color: "#c2416b", letterSpacing: 4, textTransform: "uppercase" }}>
          Free crochet patterns · US terms
        </div>
        <div style={{ fontSize: 84, fontWeight: 700, marginTop: 20, lineHeight: 1.05 }}>{site.name}</div>
        <div style={{ fontSize: 34, marginTop: 24, color: "#5b5568" }}>Amigurumi · Wearables · Home decor · Tutorials</div>
        </div>
      </div>
    ),
    size,
  );
}
