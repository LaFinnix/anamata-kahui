import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Anamata Kāhui";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Dynamic Open Graph image — served at /opengraph-image.
 *
 * Bronze-on-black with the Kāhui wordmark. Designed for OG previews on
 * Twitter, LinkedIn, Facebook, Discord.
 */
export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0b0a08",
          padding: 80,
          color: "#f4ede0",
          fontFamily: "serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 16,
              height: 16,
              borderRadius: 9999,
              background: "#c89a3c",
              boxShadow: "0 0 24px #c89a3c",
            }}
          />
          <div style={{ fontSize: 28, color: "#c89a3c", letterSpacing: -0.5 }}>
            Anamata Kāhui
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              fontSize: 96,
              lineHeight: 1.05,
              fontWeight: 600,
              letterSpacing: -2,
            }}
          >
            Four branches.
            <br />
            <span style={{ color: "#d9b15a" }}>One kāhui.</span>
          </div>
          <div style={{ fontSize: 28, color: "#a89e8b", maxWidth: 900, lineHeight: 1.4 }}>
            Records · Research · Creative Arts · Technology & Development
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 22, color: "#a89e8b" }}>
          <div>Anamata Kāhui Limited</div>
          <div style={{ width: 4, height: 4, borderRadius: 9999, background: "#5d4112" }} />
          <div>anamatakahui.co.nz</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
