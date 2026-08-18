import { ImageResponse } from "next/og";

export const alt = "PERCEPTRON — Government Integrity Surveillance";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#05070a",
          backgroundImage:
            "linear-gradient(rgba(34,211,238,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.06) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          fontFamily: "monospace",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 26, height: 26, borderRadius: 8, background: "#22d3ee" }} />
          <div style={{ fontSize: 30, letterSpacing: 10, color: "#22d3ee" }}>PERCEPTRON</div>
        </div>
        <div style={{ fontSize: 68, color: "#d7e0ea", marginTop: 40, lineHeight: 1.1, maxWidth: 900 }}>
          Government Integrity Surveillance
        </div>
        <div style={{ fontSize: 30, color: "#6b7a90", marginTop: 28, maxWidth: 950 }}>
          Explainable, graph-driven fraud & collusion detection — before public money is lost.
        </div>
        <div style={{ display: "flex", gap: 28, marginTop: 46, fontSize: 22, color: "#34f5c5" }}>
          <span>detect</span><span style={{ color: "#334155" }}>→</span>
          <span>correlate</span><span style={{ color: "#334155" }}>→</span>
          <span>explain</span><span style={{ color: "#334155" }}>→</span>
          <span>decide</span><span style={{ color: "#334155" }}>→</span>
          <span>audit</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
