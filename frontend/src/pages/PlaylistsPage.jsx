import { useQuery } from "@tanstack/react-query";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

const EMOJI = ["🌊","☀️","🌙","🌸","🌿","🔥","💫","🎸","🎷","🌧️"];

export default function PlaylistsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["playlists"],
    queryFn:  () => axios.get(`${API}/playlist/list`).then((r) => r.data.playlists),
  });

  return (
    <div style={{ padding: "36px 40px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <h1 style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 36, fontWeight: 300, color: "var(--dw-text)", letterSpacing: -1,
        }}>
          Your{" "}
          <em style={{ fontStyle: "italic", color: "var(--dw-accent)" }}>Playlists</em>
        </h1>
      </div>

      {isLoading ? (
        <div style={{ color: "var(--dw-muted)", fontFamily: "'DM Mono', monospace", fontSize: 12 }}>
          Loading playlists...
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
          {(data || []).map((pl, i) => (
            <div
              key={pl.id || i}
              style={{
                background: "var(--dw-card)", border: "1px solid var(--dw-border)",
                borderRadius: 14, padding: "20px", cursor: "pointer",
                transition: "border-color 0.2s, box-shadow 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--dw-accent)";
                e.currentTarget.style.boxShadow = "0 4px 20px color-mix(in srgb, var(--dw-accent) 10%, transparent)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--dw-border)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 12 }}>{EMOJI[i % EMOJI.length]}</div>
              <div style={{
                fontSize: 15, fontWeight: 700, color: "var(--dw-text)", marginBottom: 4,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>{pl.name}</div>
              <div style={{
                fontFamily: "'DM Mono', monospace", fontSize: 9, color: "var(--dw-muted)",
              }}>{pl.songCount || "—"} songs</div>
            </div>
          ))}

          {/* New playlist card */}
          <div style={{
            background: "var(--dw-surface)",
            border: "1px dashed var(--dw-border2)",
            borderRadius: 14, padding: "20px",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            minHeight: 120, cursor: "pointer",
            color: "var(--dw-muted)", transition: "all 0.2s",
          }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = "var(--dw-accent)"}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = "var(--dw-border2)"}
          >
            <div style={{ fontSize: 28, marginBottom: 8 }}>+</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: 1 }}>
              New Drift
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
