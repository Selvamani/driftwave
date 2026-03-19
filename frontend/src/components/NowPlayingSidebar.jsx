import { useState, useEffect } from "react";
import axios from "axios";
import usePlayerStore from "../hooks/usePlayerStore";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

function LangBadge({ lang }) {
  const cls = `lang-badge lang-${lang?.toLowerCase() || "en"}`;
  return <span className={cls}>{(lang || "??").toUpperCase()}</span>;
}

function PlayingIndicator() {
  return (
    <div style={{ display: "flex", gap: 2, alignItems: "flex-end", height: 18 }}>
      {[0, 0.15, 0.3].map((delay) => (
        <div key={delay} style={{
          width: 3, background: "var(--dw-accent)", borderRadius: 1,
          animation: `waveBar 0.8s ${delay}s ease-in-out infinite`,
        }} />
      ))}
    </div>
  );
}

export default function NowPlayingSidebar() {
  const { currentTrack, queue, queueIndex, isPlaying, progress, duration,
          togglePlay, next, prev, seek, shuffle, repeat,
          toggleShuffle, cycleRepeat, playQueue } = usePlayerStore();

  const [tab, setTab]       = useState("queue");  // "queue" | "lyrics"
  const [lyrics, setLyrics] = useState(null);     // null=loading, ""=none, str=found
  const [lyricsSource, setLyricsSource] = useState("");

  // Fetch lyrics whenever current track changes
  useEffect(() => {
    if (!currentTrack) { setLyrics(null); return; }
    setLyrics(null);

    const params = {
      ...(currentTrack.qdrant_path  ? { path:        currentTrack.qdrant_path  } : {}),
      ...(currentTrack.subsonic_id  ? { subsonic_id: currentTrack.subsonic_id  } : {}),
      ...(currentTrack.title        ? { title:        currentTrack.title        } : {}),
      ...(currentTrack.artist       ? { artist:       currentTrack.artist       } : {}),
    };

    if (!params.path && !params.subsonic_id && !params.title) { setLyrics(""); return; }

    axios.get(`${API}/library/lyrics`, { params })
      .then((r) => { setLyrics(r.data.lyrics); setLyricsSource(r.data.source); })
      .catch(() => { setLyrics(""); });
  }, [currentTrack?.file_path]);

  const upNext = queue.slice(queueIndex + 1, queueIndex + 6);

  return (
    <aside style={{
      gridColumn:   "3 / 4",
      gridRow:      "1 / 2",
      background:   "var(--dw-surface)",
      borderLeft:   "1px solid var(--dw-border)",
      display:      "flex",
      flexDirection:"column",
      overflow:     "hidden",
    }}>
      {/* Album art */}
      <div style={{ padding: "24px 24px 0" }}>
        <div style={{
          width: "100%", aspectRatio: 1,
          borderRadius: 16,
          background:   currentTrack
            ? "linear-gradient(135deg, var(--dw-border2), var(--dw-card))"
            : "var(--dw-card)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 72, overflow: "hidden", position: "relative",
          boxShadow: currentTrack
            ? "0 16px 48px color-mix(in srgb, var(--dw-accent) 15%, transparent)"
            : "none",
          transition: "box-shadow 0.4s",
        }}>
          {currentTrack?.cover_url ? (
            <img src={currentTrack.cover_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : currentTrack ? (
            <span style={{ fontSize: 72 }}>🎵</span>
          ) : (
            <span style={{ color: "var(--dw-muted)", fontSize: 40 }}>〜</span>
          )}
        </div>
      </div>

      {/* Track info */}
      <div style={{ padding: "20px 24px 0" }}>
        {currentTrack ? (
          <>
            <div style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 22, fontWeight: 600, color: "var(--dw-text)",
              letterSpacing: -0.5, lineHeight: 1.2, marginBottom: 4,
            }}>
              {currentTrack.title}
            </div>
            <div style={{
              fontFamily: "'DM Mono', monospace", fontSize: 9,
              color: "var(--dw-muted2)", letterSpacing: 1, marginBottom: 10,
            }}>
              {currentTrack.artist?.toUpperCase()}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <LangBadge lang={currentTrack.adapter_type} />
              {currentTrack.cultural_meta?.tamil_genre && (
                <span className="lang-badge" style={{ color: "var(--dw-muted2)", borderColor: "var(--dw-border2)" }}>
                  {currentTrack.cultural_meta.tamil_genre.toUpperCase()}
                </span>
              )}
              {currentTrack.tempo > 0 && (
                <span className="lang-badge" style={{ color: "var(--dw-muted2)", borderColor: "var(--dw-border2)" }}>
                  {Math.round(currentTrack.tempo)} BPM
                </span>
              )}
            </div>
          </>
        ) : (
          <div style={{
            fontFamily: "'Cormorant Garamond', serif", fontSize: 18,
            color: "var(--dw-muted)", fontStyle: "italic",
          }}>
            Nothing playing yet
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div style={{ padding: "16px 24px 0" }}>
        <div
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            seek((e.clientX - rect.left) / rect.width);
          }}
          style={{
            height: 3, background: "var(--dw-border2)", borderRadius: 2,
            cursor: "pointer", position: "relative", marginBottom: 8,
          }}
        >
          <div style={{
            position: "absolute", top: 0, left: 0, height: "100%",
            borderRadius: 2,
            background: "linear-gradient(90deg, var(--dw-accent), var(--dw-accent2))",
            width: `${(progress || 0) * 100}%`,
            transition: "width 0.5s linear",
          }}>
            <div style={{
              position: "absolute", right: -5, top: "50%",
              transform: "translateY(-50%)",
              width: 10, height: 10, borderRadius: "50%",
              background: "#fff",
              boxShadow: "0 0 8px color-mix(in srgb, var(--dw-accent) 50%, transparent)",
            }} />
          </div>
        </div>
        <div style={{
          display: "flex", justifyContent: "space-between",
          fontFamily: "'DM Mono', monospace", fontSize: 9, color: "var(--dw-muted)",
        }}>
          <span>{formatTime((progress || 0) * (duration || 0))}</span>
          <span>{formatTime(duration || 0)}</span>
        </div>
      </div>

      {/* Controls */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        gap: 16, padding: "12px 24px",
      }}>
        {[
          { icon: "🔀", action: toggleShuffle, size: 16, active: shuffle },
          { icon: "⏮",  action: prev,         size: 18 },
          { icon: isPlaying ? "⏸" : "▶", action: togglePlay, play: true, size: 20 },
          { icon: "⏭",  action: next,         size: 18 },
          { icon: repeat === "one" ? "🔂" : "🔁", action: cycleRepeat, size: 16, active: repeat !== "none" },
        ].map(({ icon, action, play, size, active }, i) => (
          <button key={i} onClick={action} style={{
            background:    play ? "var(--dw-accent)" : "none",
            border:        "none",
            borderRadius:  play ? "50%" : 8,
            width:         play ? 48 : 36,
            height:        play ? 48 : 36,
            color:         play ? "var(--dw-accent-fg)" : active ? "var(--dw-accent)" : "var(--dw-muted2)",
            fontSize:      size,
            cursor:        "pointer",
            display:       "flex", alignItems: "center", justifyContent: "center",
            transition:    "all 0.15s",
            boxShadow:     play ? "0 0 20px color-mix(in srgb, var(--dw-accent) 30%, transparent)" : "none",
          }}>
            {icon}
          </button>
        ))}
      </div>

      {/* Tab switcher */}
      <div style={{
        display: "flex", borderTop: "1px solid var(--dw-border)",
        padding: "0 16px",
      }}>
        {["queue", "lyrics"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1, padding: "10px 0",
              background: "none", border: "none",
              borderBottom: `2px solid ${tab === t ? "var(--dw-accent)" : "transparent"}`,
              color: tab === t ? "var(--dw-accent)" : "var(--dw-muted)",
              fontFamily: "'DM Mono', monospace", fontSize: 9,
              letterSpacing: 2, textTransform: "uppercase",
              cursor: "pointer", transition: "all 0.15s",
            }}
          >{t}</button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflow: "auto", padding: "12px 16px" }}>

        {tab === "queue" && (
          <>
            {upNext.length === 0 && (
              <div style={{ color: "var(--dw-muted)", fontSize: 12, padding: "8px 4px" }}>
                Queue empty
              </div>
            )}
            {upNext.map((track, i) => (
              <div
                key={i}
                onClick={() => playQueue(queue, queueIndex + 1 + i)}
                style={{
                  display: "flex", gap: 10, alignItems: "center",
                  padding: "7px 8px", borderRadius: 8, cursor: "pointer",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "var(--dw-card)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
              >
                <div style={{
                  width: 30, height: 30, borderRadius: 6,
                  background: "var(--dw-card)", border: "1px solid var(--dw-border)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 14, flexShrink: 0,
                }}>🎵</div>
                <div style={{ flex: 1, overflow: "hidden" }}>
                  <div style={{
                    fontSize: 11, fontWeight: 600, color: "var(--dw-text)",
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>{track.title}</div>
                  <div style={{
                    fontFamily: "'DM Mono', monospace", fontSize: 8,
                    color: "var(--dw-muted)",
                  }}>{track.artist}</div>
                </div>
              </div>
            ))}
          </>
        )}

        {tab === "lyrics" && (
          <div style={{ padding: "4px 4px" }}>
            {!currentTrack ? (
              <div style={{
                color: "var(--dw-muted)", fontSize: 12, fontStyle: "italic",
                textAlign: "center", paddingTop: 24,
              }}>Nothing playing</div>
            ) : lyrics === null ? (
              <div style={{ display: "flex", justifyContent: "center", paddingTop: 24 }}>
                <div style={{
                  width: 16, height: 16,
                  border: "2px solid var(--dw-accent)",
                  borderTopColor: "transparent",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                }} />
              </div>
            ) : lyrics === "" ? (
              <div style={{
                color: "var(--dw-muted)", fontSize: 12, fontStyle: "italic",
                textAlign: "center", paddingTop: 24,
              }}>No lyrics found</div>
            ) : (
              <>
                <div style={{
                  whiteSpace: "pre-wrap", lineHeight: 1.8,
                  fontSize: 13, color: "var(--dw-text)",
                  fontFamily: "'Syne', sans-serif",
                }}>{lyrics}</div>
                {lyricsSource && lyricsSource !== "none" && (
                  <div style={{
                    marginTop: 16,
                    fontFamily: "'DM Mono', monospace", fontSize: 8,
                    color: "var(--dw-muted)", letterSpacing: 1,
                    textTransform: "uppercase",
                  }}>source: {lyricsSource}</div>
                )}
              </>
            )}
          </div>
        )}

      </div>
    </aside>
  );
}

function formatTime(secs) {
  const s = Math.floor(secs);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
