import { NavLink, Outlet } from "react-router-dom";
import { useState } from "react";
import ThemePicker from "./ThemePicker";
import usePlayerStore from "../hooks/usePlayerStore";
import NowPlayingSidebar from "./NowPlayingSidebar";
import PlayerBar from "./PlayerBar";

const NAV = [
  { to: "/discover",  icon: "✨", label: "Discover"  },
  { to: "/library",   icon: "🎵", label: "Library"   },
  { to: "/playlists", icon: "📋", label: "Playlists" },
  { to: "/settings",  icon: "⚙️", label: "Settings"  },
];

export default function Layout() {
  const currentTrack = usePlayerStore((s) => s.currentTrack);

  return (
    <div style={{
      display:             "grid",
      gridTemplateColumns: "220px 1fr 300px",
      gridTemplateRows:    "1fr 80px",
      height:              "100vh",
      background:          "var(--dw-bg)",
      overflow:            "hidden",
    }}>
      {/* ── SIDEBAR ── */}
      <aside style={{
        gridRow:      "1 / 3",
        background:   "var(--dw-surface)",
        borderRight:  "1px solid var(--dw-border)",
        display:      "flex",
        flexDirection:"column",
        padding:      "28px 0",
        overflow:     "hidden",
      }}>
        {/* Brand */}
        <div style={{ padding: "0 20px 24px", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: "linear-gradient(135deg, var(--dw-accent), var(--dw-accent2))",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, boxShadow: "0 0 16px color-mix(in srgb, var(--dw-accent) 30%, transparent)",
          }}>〜</div>
          <span style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 20, fontWeight: 600, color: "var(--dw-text)",
            letterSpacing: -0.5,
          }}>Driftwave</span>
        </div>

        {/* Nav */}
        <div style={{ padding: "0 12px", flex: 1, overflow: "auto" }}>
          <div style={{
            fontFamily: "'DM Mono', monospace", fontSize: 8,
            letterSpacing: 3, textTransform: "uppercase",
            color: "var(--dw-muted)", padding: "0 8px", marginBottom: 6,
          }}>Menu</div>
          {NAV.map(({ to, icon, label }) => (
            <NavLink key={to} to={to} style={({ isActive }) => ({
              display:       "flex",
              alignItems:    "center",
              gap:           10,
              padding:       "9px 12px",
              borderRadius:  8,
              fontSize:      13,
              fontWeight:    600,
              textDecoration:"none",
              marginBottom:  2,
              color:         isActive ? "var(--dw-accent)" : "var(--dw-muted2)",
              background:    isActive
                ? "color-mix(in srgb, var(--dw-accent) 8%, transparent)"
                : "transparent",
              transition:    "all 0.15s",
            })}>
              <span style={{ fontSize: 15, width: 20, textAlign: "center" }}>{icon}</span>
              {label}
            </NavLink>
          ))}
        </div>

        {/* Theme picker in sidebar */}
        <div style={{
          padding:   "16px 20px",
          borderTop: "1px solid var(--dw-border)",
          marginTop: "auto",
        }}>
          <ThemePicker compact />
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main style={{
        gridColumn: "2 / 3",
        gridRow:    "1 / 2",
        overflowY:  "auto",
        background: "var(--dw-bg)",
      }}>
        <Outlet />
      </main>

      {/* ── NOW PLAYING SIDEBAR ── */}
      <NowPlayingSidebar />

      {/* ── PLAYER BAR (bottom) ── */}
      <PlayerBar />
    </div>
  );
}
