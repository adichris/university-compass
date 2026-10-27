import { ImageResponse } from "next/og";
import { universities } from "@/lib/data";
import { SITE, SITE_TITLE } from "@/lib/site";

// Default share preview for every page (WhatsApp, Facebook, X, search results).
export const alt = `${SITE_TITLE} - ${SITE.tagline}`;
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
          justifyContent: "space-between",
          padding: 72,
          background: "linear-gradient(135deg, #3f3dbc 0%, #2f2d9a 60%, #1f1d6e 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", height: 10, width: 240 }}>
          <div style={{ flex: 1, background: "#ce1126" }} />
          <div style={{ flex: 1, background: "#fcd116" }} />
          <div style={{ flex: 1, background: "#006b3f" }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 40, fontWeight: 700, color: "#f2a516" }}>{SITE_TITLE}</div>
          <div style={{ fontSize: 72, fontWeight: 800, lineHeight: 1.1, marginTop: 16, maxWidth: 980 }}>
            Check your university admission chances in Ghana
          </div>
        </div>
        <div style={{ fontSize: 30, opacity: 0.85 }}>{`WASSCE & NOVDEC · ${universities.length} institutions · Masters, PhD & scholarships · Free`}</div>
      </div>
    ),
    size,
  );
}
