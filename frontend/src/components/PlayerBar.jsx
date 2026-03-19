import { useNavigate } from "react-router-dom";
import usePlayerStore from "../hooks/usePlayerStore";

export default function PlayerBar() {
  const navigate = useNavigate();
  const { currentTrack, isPlaying, progress, duration, volume,
          togglePlay, next, prev, seek, setVolume } = usePlayerStore();

  return (
    <div style={{
      gridColumn:   "2 / 3",
      gridRow:      "2 / 3",
      background:   "color-mix(in srgb, var(--dw-surface) 95%, transparent)",
      backdropFilter: "blur(20px)",
      borderTop:    "1px solid var(--dw-border)",
      padding:      "0 40px",
      display:      "flex",
      alignItems:   "center",
      justifyContent: "space-between",
      gap:          24,
    }}>
      {/* Track info — click to open Now Playing page */}
      <div
        onClick={() => currentTrack && navigate("/now-playing")}
        style={{
          display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0,
          cursor: currentTrack ? "pointer" : "default",
          borderRadius: 8, padding: "4px 6px", margin: "-4px -6px",
          transition: "background 0.15s",
        }}
        onMouseEnter={(e) => { if (currentTrack) e.currentTarget.style.background = "var(--dw-card)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
      >
        <div style={{
          width: 46, height: 46, borderRadius: 8, flexShrink: 0,
          background: "var(--dw-card)", border: "1px solid var(--dw-border)",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
        }}>
          {currentTrack?.cover_url
            ? <img src={currentTrack.cover_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 8 }} />
            : currentTrack ? "🎵" : "〜"}
        </div>
        {currentTrack ? (
          <div style={{ overflow: "hidden" }}>
            <div style={{
              fontSize: 13, fontWeight: 700, color: "var(--dw-text)",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>{currentTrack.title}</div>
            <div style={{
              fontFamily: "'DM Mono', monospace", fontSize: 9,
              color: "var(--dw-muted)", marginTop: 2,
            }}>{currentTrack.artist}</div>
          </div>
        ) : (
          <div style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 14, color: "var(--dw-muted)", fontStyle: "italic",
          }}>Select a track to play</div>
        )}
      </div>

      {/* Controls + progress */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flex: 1.5 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button onClick={prev} style={btnStyle(false)}>⏮</button>
          <button onClick={togglePlay} style={btnStyle(true)}>
            {isPlaying ? "⏸" : "▶"}
          </button>
          <button onClick={next} style={btnStyle(false)}>⏭</button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%" }}>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "var(--dw-muted)", minWidth: 28 }}>
            {formatTime((progress || 0) * (duration || 0))}
          </span>
          <div
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              seek((e.clientX - rect.left) / rect.width);
            }}
            style={{
              flex: 1, height: 3, background: "var(--dw-border2)",
              borderRadius: 2, cursor: "pointer", position: "relative",
            }}
          >
            <div style={{
              position: "absolute", top: 0, left: 0, height: "100%",
              width: `${(progress || 0) * 100}%`, borderRadius: 2,
              background: "linear-gradient(90deg, var(--dw-accent), var(--dw-accent2))",
              transition: "width 0.5s linear",
            }} />
          </div>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "var(--dw-muted)", minWidth: 28, textAlign: "right" }}>
            {formatTime(duration || 0)}
          </span>
        </div>
      </div>

      {/* Volume */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, justifyContent: "flex-end" }}>
        <span style={{ color: "var(--dw-muted)", fontSize: 14 }}>🔈</span>
        <div
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setVolume((e.clientX - rect.left) / rect.width);
          }}
          style={{
            width: 90, height: 3, background: "var(--dw-border2)",
            borderRadius: 2, cursor: "pointer", position: "relative",
          }}
        >
          <div style={{
            position: "absolute", top: 0, left: 0, height: "100%",
            width: `${(volume || 0) * 100}%`, borderRadius: 2,
            background: "var(--dw-accent)",
          }} />
        </div>
        <span style={{ color: "var(--dw-muted)", fontSize: 14 }}>🔊</span>
      </div>
    </div>
  );
}

const btnStyle = (play) => ({
  background:  play ? "var(--dw-accent)" : "none",
  border:      "none",
  borderRadius:play ? "50%" : 8,
  width:       play ? 38 : 32,
  height:      play ? 38 : 32,
  color:       play ? "var(--dw-accent-fg)" : "var(--dw-muted2)",
  fontSize:    play ? 16 : 14,
  cursor:      "pointer",
  display:     "flex", alignItems: "center", justifyContent: "center",
  transition:  "all 0.15s",
  flexShrink:  0,
});

function formatTime(secs) {
  const s = Math.floor(secs);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
