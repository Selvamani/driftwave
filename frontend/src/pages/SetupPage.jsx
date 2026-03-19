import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { saveServerConfig } from "../services/config";

export default function SetupPage() {
  const navigate = useNavigate();
  const [apiUrl,  setApiUrl]  = useState("http://192.168.1.x:8000");
  const [naviUrl, setNaviUrl] = useState("http://192.168.1.x:4533");
  const [testing, setTesting] = useState(false);
  const [error,   setError]   = useState(null);

  async function handleConnect() {
    setTesting(true);
    setError(null);
    try {
      const res = await fetch(`${apiUrl.trim()}/health`);
      if (!res.ok) throw new Error(`Server responded with ${res.status}`);
    } catch (e) {
      // Allow saving even if health check fails (API might not have /health)
      // just verify it's reachable
      try {
        await fetch(`${apiUrl.trim()}/docs`, { mode: "no-cors" });
      } catch {
        setError(`Cannot reach ${apiUrl} — check the URL and that the server is running.`);
        setTesting(false);
        return;
      }
    }
    saveServerConfig({ apiUrl, navidromeUrl: naviUrl });
    // Reload so all modules pick up the new API URL
    window.location.href = "/discover";
  }

  return (
    <div style={{
      height: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--dw-bg)",
    }}>
      <div style={{
        width: 420, padding: "40px 36px",
        background: "var(--dw-surface)", border: "1px solid var(--dw-border)",
        borderRadius: 20,
        boxShadow: "0 24px 64px rgba(0,0,0,0.3)",
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 9,
            background: "linear-gradient(135deg, var(--dw-accent), var(--dw-accent2))",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, boxShadow: "0 0 20px color-mix(in srgb, var(--dw-accent) 35%, transparent)",
          }}>〜</div>
          <span style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 22, fontWeight: 600, color: "var(--dw-text)", letterSpacing: -0.5,
          }}>Driftwave</span>
        </div>

        <div style={{
          fontFamily: "'DM Mono', monospace", fontSize: 9,
          letterSpacing: 3, color: "var(--dw-muted)", marginBottom: 24,
          textTransform: "uppercase",
        }}>
          Connect to your server
        </div>

        {/* API URL */}
        <label style={labelStyle}>Driftwave API</label>
        <input
          value={apiUrl}
          onChange={(e) => setApiUrl(e.target.value)}
          placeholder="http://192.168.1.x:8000"
          style={inputStyle}
        />
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "var(--dw-muted)", marginBottom: 18 }}>
          FastAPI backend — port 8000
        </div>

        {/* Navidrome URL */}
        <label style={labelStyle}>Navidrome</label>
        <input
          value={naviUrl}
          onChange={(e) => setNaviUrl(e.target.value)}
          placeholder="http://192.168.1.x:4533"
          style={inputStyle}
        />
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "var(--dw-muted)", marginBottom: 24 }}>
          Music server — port 4533
        </div>

        {error && (
          <div style={{
            fontFamily: "'DM Mono', monospace", fontSize: 11,
            color: "var(--dw-error, #f87171)", marginBottom: 16,
            padding: "10px 12px", background: "rgba(248,113,113,0.08)",
            border: "1px solid rgba(248,113,113,0.2)", borderRadius: 8,
          }}>{error}</div>
        )}

        <button
          onClick={handleConnect}
          disabled={testing}
          style={{
            width: "100%", padding: "13px 0",
            background: testing
              ? "var(--dw-border2)"
              : "linear-gradient(135deg, var(--dw-accent), var(--dw-accent2))",
            border: "none", borderRadius: 11, cursor: testing ? "default" : "pointer",
            fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700,
            color: "var(--dw-accent-fg, #fff)",
            transition: "opacity 0.15s",
          }}
        >
          {testing ? "Connecting…" : "Connect →"}
        </button>
      </div>
    </div>
  );
}

const labelStyle = {
  display: "block",
  fontFamily: "'DM Mono', monospace", fontSize: 9,
  letterSpacing: 2, textTransform: "uppercase",
  color: "var(--dw-muted)", marginBottom: 6,
};

const inputStyle = {
  width: "100%", boxSizing: "border-box",
  background: "var(--dw-card)", border: "1px solid var(--dw-border2)",
  borderRadius: 10, padding: "11px 14px",
  fontFamily: "'Syne', sans-serif", fontSize: 14,
  color: "var(--dw-text)", outline: "none", marginBottom: 6,
};
