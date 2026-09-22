import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "Phrenos.ai — AI Strategy, Automation & Innovation";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0a100c",
          borderTop: "10px solid #b88b36",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 92,
            color: "#d4af5a",
            marginBottom: 8,
          }}
        >
          Φ
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            fontSize: 80,
            fontWeight: 600,
          }}
        >
          <div style={{ display: "flex", color: "#f1e8d6" }}>Phrenos</div>
          <div style={{ display: "flex", color: "#d4af5a" }}>.ai</div>
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 28,
            fontSize: 30,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: "#a9b0a3",
          }}
        >
          AI Strategy, Automation & Innovation
        </div>
      </div>
    ),
    { ...size },
  );
}
