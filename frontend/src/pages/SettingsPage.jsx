import { useState } from "react";
import ThemePicker from "../components/ThemePicker";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { getApiUrl, getNavidromeUrl, saveServerConfig, isTauri } from "../services/config";

const API = getApiUrl();

export default function SettingsPage() {
  const [apiUrl,    setApiUrl]    = useState(getApiUrl);
  const [naviUrl,   setNaviUrl]   = useState(getNavidromeUrl);
  const [savedMsg,  setSavedMsg]  = useState(false);

  const { data: indexStatus } = useQuery({
    queryKey: ["index-status"],
    queryFn:  () => axios.get(`${API}/index/status`).then((r) => r.data),
    refetchInterval: 10000,
  });

  function handleSaveServer() {
    saveServerConfig({ apiUrl, navidromeUrl: naviUrl });
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2000);
    // Reload so all modules pick up the new URL
    window.location.reload();
  }

  return (
    <div style={{ padding: "36px 40px", maxWidth: 640 }}>
      <h1 style={{
        fontFamily: "'Cormorant Garamond', serif",
        fontSize: 36, fontWeight: 300, color: "var(--dw-text)",
        letterSpacing: -1, marginBottom: 32,
      }}>Settings</h1>

      {/* Server — always shown in Tauri, shown in web too for convenience */}
      <Section title="Server">
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <ServerField
            label="Driftwave API"
            hint="port 8000"
            value={apiUrl}
            onChange={setApiUrl}
          />
          <ServerField
            label="Navidrome"
            hint="port 4533"
            value={naviUrl}
            onChange={setNaviUrl}
          />
          <button
            onClick={handleSaveServer}
            style={{
              alignSelf: "flex-start",
              padding: "8px 18px", borderRadius: 8,
              background: savedMsg
                ? "color-mix(in srgb, var(--dw-accent) 15%, transparent)"
                : "var(--dw-accent)",
              border: "none", cursor: "pointer",
              fontFamily: "'DM Mono', monospace", fontSize: 10,
              letterSpacing: 1,
              color: savedMsg ? "var(--dw-accent)" : "var(--dw-accent-fg, #fff)",
              transition: "all 0.2s",
            }}
          >
            {savedMsg ? "Saved ✓" : "Save & Reload"}
          </button>
        </div>
      </Section>

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
            href={getNavidromeUrl()}
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

function ServerField({ label, hint, value, onChange }) {
  return (
    <div>
      <div style={{
        fontFamily: "'DM Mono', monospace", fontSize: 9,
        letterSpacing: 2, textTransform: "uppercase",
        color: "var(--dw-muted)", marginBottom: 6,
        display: "flex", gap: 8, alignItems: "baseline",
      }}>
        {label}
        <span style={{ fontSize: 8, opacity: 0.6 }}>{hint}</span>
      </div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%", boxSizing: "border-box",
          background: "var(--dw-card)", border: "1px solid var(--dw-border2)",
          borderRadius: 8, padding: "9px 12px",
          fontFamily: "'DM Mono', monospace", fontSize: 12,
          color: "var(--dw-text)", outline: "none",
        }}
        onFocus={(e) => e.target.style.borderColor = "var(--dw-accent)"}
        onBlur={(e)  => e.target.style.borderColor = "var(--dw-border2)"}
      />
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
