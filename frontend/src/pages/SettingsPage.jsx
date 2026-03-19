import ThemePicker from "../components/ThemePicker";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function SettingsPage() {
  const { data: indexStatus } = useQuery({
    queryKey: ["index-status"],
    queryFn:  () => axios.get(`${API}/index/status`).then((r) => r.data),
    refetchInterval: 10000,
  });

  return (
    <div style={{ padding: "36px 40px", maxWidth: 640 }}>
      <h1 style={{
        fontFamily: "'Cormorant Garamond', serif",
        fontSize: 36, fontWeight: 300, color: "var(--dw-text)",
        letterSpacing: -1, marginBottom: 32,
      }}>Settings</h1>

      {/* Appearance */}
      <Section title="Appearance">
        <ThemePicker />
      </Section>

      {/* Index status */}
      <Section title="Library Index">
        {indexStatus ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <StatRow
              label="Text index"
              value={`${indexStatus.text_collection?.tracks?.toLocaleString() || 0} tracks`}
            />
            <StatRow
              label="Audio (CLAP)"
              value={`${indexStatus.audio_collection?.tracks?.toLocaleString() || 0} tracks`}
            />
            <StatRow
              label="Status"
              value={indexStatus.status}
              accent={indexStatus.status === "ok"}
            />
          </div>
        ) : (
          <div style={{ color: "var(--dw-muted)", fontSize: 13 }}>Loading...</div>
        )}
        <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
          <a
            href="http://localhost:4533"
            target="_blank"
            rel="noreferrer"
            style={{
              padding: "8px 16px", borderRadius: 8,
              border: "1px solid var(--dw-border2)",
              background: "var(--dw-surface)",
              color: "var(--dw-muted2)",
              fontFamily: "'DM Mono', monospace", fontSize: 10,
              letterSpacing: 1, textDecoration: "none",
              transition: "all 0.15s",
            }}
          >Open Navidrome →</a>
          <a
            href={`${API}/docs`}
            target="_blank"
            rel="noreferrer"
            style={{
              padding: "8px 16px", borderRadius: 8,
              border: "1px solid var(--dw-border2)",
              background: "var(--dw-surface)",
              color: "var(--dw-muted2)",
              fontFamily: "'DM Mono', monospace", fontSize: 10,
              letterSpacing: 1, textDecoration: "none",
              transition: "all 0.15s",
            }}
          >API Docs →</a>
        </div>
      </Section>

      {/* About */}
      <Section title="About">
        <div style={{
          fontFamily: "'DM Mono', monospace", fontSize: 10,
          color: "var(--dw-muted)", lineHeight: 2,
        }}>
          <div>Driftwave v1.0.0</div>
          <div>Self-hosted AI music discovery</div>
          <div>MIT License</div>
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 36 }}>
      <div style={{
        fontFamily: "'DM Mono', monospace", fontSize: 9,
        letterSpacing: 3, textTransform: "uppercase",
        color: "var(--dw-muted)", marginBottom: 16,
        display: "flex", alignItems: "center", gap: 12,
      }}>
        {title}
        <div style={{ flex: 1, height: 1, background: "var(--dw-border)" }} />
      </div>
      <div style={{
        background: "var(--dw-surface)", border: "1px solid var(--dw-border)",
        borderRadius: 14, padding: "20px 22px",
      }}>
        {children}
      </div>
    </div>
  );
}

function StatRow({ label, value, accent }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{
        fontFamily: "'DM Mono', monospace", fontSize: 10,
        color: "var(--dw-muted)", letterSpacing: 1,
      }}>{label}</span>
      <span style={{
        fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 500,
        color: accent ? "var(--dw-positive)" : "var(--dw-text)",
      }}>{value}</span>
    </div>
  );
}
