import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "Quantum Therapy: Rife Frequency Protocols";
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
          padding: "72px 80px",
          backgroundColor: "#060a17",
          backgroundImage:
            "radial-gradient(900px 520px at 8% -10%, rgba(34,214,231,0.30) 0%, rgba(6,10,23,0) 62%), radial-gradient(760px 480px at 96% 6%, rgba(226,60,180,0.24) 0%, rgba(6,10,23,0) 60%), radial-gradient(900px 600px at 50% 118%, rgba(140,86,240,0.24) 0%, rgba(6,10,23,0) 66%)",
          color: "#f7f8fb",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            fontSize: 22,
            letterSpacing: 8,
            textTransform: "uppercase",
            color: "#5ce1ee",
          }}
        >
          <div
            style={{
              width: 16,
              height: 16,
              borderRadius: 999,
              background: "#5ce1ee",
              boxShadow: "0 0 28px 6px rgba(92,225,238,0.65)",
            }}
          />
          Quantum Therapy
        </div>

        <div
          style={{
            marginTop: 34,
            fontSize: 92,
            lineHeight: 1.02,
            fontWeight: 800,
            letterSpacing: -2,
            maxWidth: 950,
          }}
        >
          Your body runs on frequency
        </div>

        <div style={{ marginTop: 30, fontSize: 32, color: "#9aa3b8", maxWidth: 900 }}>
          1,395 Rife protocols. 11,624 frequencies. Played as binaural beat sessions with ambient
          soundscapes.
        </div>

        <div style={{ display: "flex", gap: 16, marginTop: 46 }}>
          {["1,395 Protocols", "22 Tones", "Binaural + Isochronic"].map((label) => (
            <div
              key={label}
              style={{
                display: "flex",
                padding: "14px 26px",
                borderRadius: 999,
                border: "1px solid rgba(92,225,238,0.42)",
                background: "rgba(92,225,238,0.10)",
                color: "#cfe9ee",
                fontSize: 26,
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
