import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();
  const { currentTrack, queue, queueIndex, isPlaying, progress, duration,
          togglePlay, next, prev, seek, shuffle, repeat,
          toggleShuffle, cycleRepeat, playQueue, mergeCurrentTrackMeta } = usePlayerStore();

  const [tab, setTab]       = useState("queue");  // "queue" | "lyrics"
  const [lyrics, setLyrics] = useState(null);     // null=loading, ""=none, str=found
  const [lyricsSource, setLyricsSource] = useState("");
  const currentRowRef = useRef(null);

  // Fetch Qdrant enrichment (cultural_meta, composer, lyricist, film info…)
  // whenever track changes and the data isn't already present
  useEffect(() => {
    if (!currentTrack?.subsonic_id) return;
    if (currentTrack.cultural_meta !== undefined) return; // already enriched
    axios.get(`${API}/library/track-meta`, {
      params: { subsonic_id: currentTrack.subsonic_id },
    }).then((r) => {
      if (r.data.found) mergeCurrentTrackMeta(r.data);
    }).catch(() => {});
  }, [currentTrack?.subsonic_id]);

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

  // Scroll current track into view when queue tab is shown or track changes
  useEffect(() => {
    if (tab === "queue" && currentRowRef.current) {
      currentRowRef.current.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [tab, queueIndex]);


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
        <div
          onClick={() => currentTrack && navigate("/now-playing")}
          style={{
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
            cursor: currentTrack ? "pointer" : "default",
          }}
        >
          {currentTrack?.cover_url ? (
            <img src={currentTrack.cover_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : currentTrack ? (
            <span style={{ fontSize: 72 }}>🎵</span>
          ) : (
            <span style={{ color: "var(--dw-muted)", fontSize: 40 }}>〜</span>
          )}
          {/* Expand button */}
          {currentTrack && (
            <div style={{
              position: "absolute", top: 8, right: 8,
              background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)",
              borderRadius: 6, padding: "3px 6px",
              fontFamily: "'DM Mono', monospace", fontSize: 9,
              color: "rgba(255,255,255,0.8)", letterSpacing: 1,
              pointerEvents: "none",
            }}>
              ⤢ expand
            </div>
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
              color: "var(--dw-muted2)", letterSpacing: 1,
              marginBottom: currentTrack.cultural_meta?.lyricist ? 4 : 10,
            }}>
              {currentTrack.artist?.toUpperCase()}
            </div>
            {(currentTrack.cultural_meta?.composer || currentTrack.cultural_meta?.lyricist) && (
              <div style={{
                fontFamily: "'DM Mono', monospace", fontSize: 9,
                color: "var(--dw-muted)", letterSpacing: 1, marginBottom: 10,
                display: "flex", flexDirection: "column", gap: 2,
              }}>
                {currentTrack.cultural_meta.composer && (
                  <span>🎼 {currentTrack.cultural_meta.composer}</span>
                )}
                {currentTrack.cultural_meta.lyricist && (
                  <span>✍ {currentTrack.cultural_meta.lyricist}</span>
                )}
              </div>
            )}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <LangBadge lang={currentTrack.adapter_type} />
              {currentTrack.cultural_meta?.tamil_genre && (
                <span className="lang-badge" style={{ color: "var(--dw-muted2)", borderColor: "var(--dw-border2)" }}>
                  {currentTrack.cultural_meta.tamil_genre.toUpperCase()}
                </span>
              )}
              {currentTrack.tempo > 0 && (
                <span className="lang-badge" style={{ color: "var(--dw-muted2)", borderColor: "var(--dw-border2)" }}>
                  {Math.round(currentTrack.tempo)} kbps
                </span>
              )}
            </div>

            {/* Film info */}
            {currentTrack.cultural_meta?.film_name && (
              <div style={{
                marginTop: 14,
                background: "var(--dw-card)",
                border: "1px solid var(--dw-border)",
                borderRadius: 10, padding: "10px 12px",
              }}>
                <div style={{
                  fontFamily: "'DM Mono', monospace", fontSize: 8,
                  letterSpacing: 2, color: "var(--dw-muted)",
                  textTransform: "uppercase", marginBottom: 6,
                }}>
                  🎬 {currentTrack.cultural_meta.film_name}
                </div>
                {currentTrack.cultural_meta.film_meta?.director && (
                  <div style={{ fontSize: 11, color: "var(--dw-muted2)", marginBottom: 3 }}>
                    <span style={{ color: "var(--dw-muted)", fontSize: 9 }}>Dir. </span>
                    {currentTrack.cultural_meta.film_meta.director}
                  </div>
                )}
                {currentTrack.cultural_meta.film_meta?.cast?.length > 0 && (
                  <div style={{
                    fontSize: 10, color: "var(--dw-muted)",
                    lineHeight: 1.6, marginBottom: 4,
                  }}>
                    {currentTrack.cultural_meta.film_meta.cast.slice(0, 4).join(" · ")}
                  </div>
                )}
                {currentTrack.cultural_meta.film_meta?.imdb_url && (
                  <a
                    href={currentTrack.cultural_meta.film_meta.imdb_url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      fontFamily: "'DM Mono', monospace", fontSize: 8,
                      color: "var(--dw-accent)", textDecoration: "none",
                      letterSpacing: 1, display: "inline-block",
                    }}
                  >
                    IMDb ↗
                  </a>
                )}
              </div>
            )}
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
        {[
          { id: "queue",  label: `Playlist${queue.length ? ` · ${queue.length}` : ""}` },
          { id: "lyrics", label: "Lyrics" },
        ].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              flex: 1, padding: "10px 0",
              background: "none", border: "none",
              borderBottom: `2px solid ${tab === id ? "var(--dw-accent)" : "transparent"}`,
              color: tab === id ? "var(--dw-accent)" : "var(--dw-muted)",
              fontFamily: "'DM Mono', monospace", fontSize: 9,
              letterSpacing: 2, textTransform: "uppercase",
              cursor: "pointer", transition: "all 0.15s",
            }}
          >{label}</button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflow: "auto", padding: "12px 16px" }}>

        {tab === "queue" && (
          <>
            {queue.length === 0 ? (
              <div style={{ color: "var(--dw-muted)", fontSize: 12, padding: "8px 4px", fontStyle: "italic" }}>
                Queue empty — search or browse to add tracks
              </div>
            ) : (
              <>
                <div style={{
                  fontFamily: "'DM Mono', monospace", fontSize: 8,
                  letterSpacing: 2, color: "var(--dw-muted)", textTransform: "uppercase",
                  marginBottom: 8, padding: "0 4px",
                }}>
                  {queue.length} track{queue.length !== 1 ? "s" : ""}
                </div>
                {queue.map((track, i) => {
                  const isCurrent = i === queueIndex;
                  const isPast    = i < queueIndex;
                  return (
                    <div
                      key={i}
                      ref={isCurrent ? currentRowRef : null}
                      onClick={() => playQueue(queue, i)}
                      style={{
                        display: "flex", gap: 10, alignItems: "center",
                        padding: "7px 8px", borderRadius: 8, cursor: "pointer",
                        background: isCurrent ? "color-mix(in srgb, var(--dw-accent) 10%, transparent)" : "transparent",
                        border: isCurrent ? "1px solid color-mix(in srgb, var(--dw-accent) 25%, transparent)" : "1px solid transparent",
                        opacity: isPast ? 0.45 : 1,
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) => { if (!isCurrent) e.currentTarget.style.background = "var(--dw-card)"; }}
                      onMouseLeave={(e) => { if (!isCurrent) e.currentTarget.style.background = "transparent"; }}
                    >
                      <div style={{
                        width: 22, textAlign: "right", flexShrink: 0,
                        fontFamily: "'DM Mono', monospace", fontSize: 9,
                        color: "var(--dw-muted)",
                      }}>
                        {isCurrent && isPlaying ? <PlayingIndicator /> : i + 1}
                      </div>
                      <div style={{ flex: 1, overflow: "hidden" }}>
                        <div style={{
                          fontSize: 11, fontWeight: isCurrent ? 700 : 600,
                          color: isCurrent ? "var(--dw-accent)" : "var(--dw-text)",
                          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                        }}>{track.title}</div>
                        <div style={{
                          fontFamily: "'DM Mono', monospace", fontSize: 8,
                          color: "var(--dw-muted)",
                          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                        }}>{track.artist}</div>
                      </div>
                      {track.duration > 0 && (
                        <div style={{
                          fontFamily: "'DM Mono', monospace", fontSize: 8,
                          color: "var(--dw-muted)", flexShrink: 0,
                        }}>
                          {formatTime(track.duration)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}
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
