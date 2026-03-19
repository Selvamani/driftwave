import { useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import usePlayerStore from "../hooks/usePlayerStore";

function formatTime(secs) {
  const s = Math.floor(secs);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function PlayingBars() {
  return (
    <div style={{ display: "flex", gap: 2, alignItems: "flex-end", height: 14, flexShrink: 0 }}>
      {[0, 0.15, 0.3].map((delay) => (
        <div key={delay} style={{
          width: 3, background: "var(--dw-accent)", borderRadius: 1,
          animation: `waveBar 0.8s ${delay}s ease-in-out infinite`,
        }} />
      ))}
    </div>
  );
}

export default function NowPlayingPage() {
  const navigate = useNavigate();
  const currentRowRef = useRef(null);

  const {
    currentTrack, queue, queueIndex, isPlaying, progress, duration,
    volume, shuffle, repeat,
    togglePlay, next, prev, seek, setVolume,
    toggleShuffle, cycleRepeat, playQueue,
  } = usePlayerStore();

  // Scroll current track into view on mount and when it changes
  useEffect(() => {
    currentRowRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [queueIndex]);

  const elapsed = (progress || 0) * (duration || 0);
  const film    = currentTrack?.cultural_meta?.film_meta;

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden", position: "relative" }}>

      {/* Blurred background from album art */}
      {currentTrack?.cover_url && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 0,
          backgroundImage: `url(${currentTrack.cover_url})`,
          backgroundSize: "cover", backgroundPosition: "center",
          filter: "blur(60px) saturate(1.4) brightness(0.25)",
          transform: "scale(1.1)",
        }} />
      )}

      {/* Left panel — player */}
      <div style={{
        position: "relative", zIndex: 1,
        flex: "0 0 55%", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "40px 48px", gap: 0,
        borderRight: "1px solid color-mix(in srgb, var(--dw-border) 40%, transparent)",
      }}>

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          style={{
            position: "absolute", top: 24, left: 28,
            background: "none", border: "none", cursor: "pointer",
            color: "var(--dw-muted2)", fontSize: 13,
            fontFamily: "'Syne', sans-serif", display: "flex", alignItems: "center", gap: 6,
          }}
        >
          ← Back
        </button>

        {/* Album art */}
        <div style={{
          width: "min(320px, 60%)", aspectRatio: 1,
          borderRadius: 20, overflow: "hidden", flexShrink: 0,
          boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
          background: "var(--dw-card)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 80, marginBottom: 32,
        }}>
          {currentTrack?.cover_url
            ? <img src={currentTrack.cover_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <span>{currentTrack ? "🎵" : "〜"}</span>}
        </div>

        {/* Track info */}
        <div style={{ width: "100%", textAlign: "center", marginBottom: 8 }}>
          <div style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 30, fontWeight: 600,
            color: "var(--dw-text)", letterSpacing: -0.5,
            lineHeight: 1.15, marginBottom: 8,
          }}>
            {currentTrack?.title || "Nothing playing"}
          </div>
          <div style={{
            fontFamily: "'DM Mono', monospace", fontSize: 11,
            color: "var(--dw-muted2)", letterSpacing: 1.5,
            textTransform: "uppercase", marginBottom: 4,
          }}>
            {currentTrack?.artist || "—"}
          </div>
          {(currentTrack?.cultural_meta?.composer || currentTrack?.cultural_meta?.lyricist) && (
            <div style={{
              fontFamily: "'DM Mono', monospace", fontSize: 9,
              color: "var(--dw-muted)", letterSpacing: 1, marginBottom: 4,
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
          {currentTrack?.album && (
            <div style={{
              fontFamily: "'DM Mono', monospace", fontSize: 9,
              color: "var(--dw-muted)", letterSpacing: 1,
            }}>
              {currentTrack.album}
            </div>
          )}
        </div>

        {/* Metadata badges */}
        {currentTrack && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center", marginBottom: 24, marginTop: 10 }}>
            {currentTrack.adapter_type && (
              <span className={`lang-badge lang-${currentTrack.adapter_type}`}>
                {currentTrack.adapter_type.toUpperCase()}
              </span>
            )}
            {currentTrack.cultural_meta?.tamil_genre && (
              <span className="lang-badge" style={{ color: "var(--dw-muted2)", borderColor: "var(--dw-border2)" }}>
                {currentTrack.cultural_meta.tamil_genre.toUpperCase()}
              </span>
            )}
            {currentTrack.bitRate > 0 && (
              <span className="lang-badge" style={{ color: "var(--dw-muted2)", borderColor: "var(--dw-border2)" }}>
                {currentTrack.bitRate} kbps
              </span>
            )}
          </div>
        )}

        {/* Film info */}
        {film && (
          <div style={{
            width: "100%", marginBottom: 20,
            background: "color-mix(in srgb, var(--dw-surface) 60%, transparent)",
            border: "1px solid var(--dw-border)",
            borderRadius: 12, padding: "12px 16px",
            backdropFilter: "blur(8px)",
          }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 2, color: "var(--dw-muted)", textTransform: "uppercase", marginBottom: 8 }}>
              Film · {currentTrack.cultural_meta.film_name}
            </div>
            <div style={{ fontSize: 11, color: "var(--dw-muted2)", lineHeight: 1.8 }}>
              {film.director && <span>Dir. {film.director} · </span>}
              {film.cast?.slice(0, 3).join(", ")}
            </div>
            {film.imdb_url && (
              <a href={film.imdb_url} target="_blank" rel="noreferrer" style={{
                fontFamily: "'DM Mono', monospace", fontSize: 9,
                color: "var(--dw-accent)", textDecoration: "none",
                letterSpacing: 1, display: "inline-block", marginTop: 6,
              }}>IMDb ↗</a>
            )}
          </div>
        )}

        {/* Progress bar */}
        <div style={{ width: "100%", marginBottom: 12 }}>
          <div
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              seek((e.clientX - rect.left) / rect.width);
            }}
            style={{
              height: 4, background: "color-mix(in srgb, var(--dw-border2) 60%, transparent)",
              borderRadius: 2, cursor: "pointer", position: "relative", marginBottom: 8,
            }}
          >
            <div style={{
              position: "absolute", top: 0, left: 0, height: "100%", borderRadius: 2,
              background: "linear-gradient(90deg, var(--dw-accent), var(--dw-accent2))",
              width: `${(progress || 0) * 100}%`,
              transition: "width 0.5s linear",
            }}>
              <div style={{
                position: "absolute", right: -6, top: "50%", transform: "translateY(-50%)",
                width: 12, height: 12, borderRadius: "50%", background: "#fff",
                boxShadow: "0 0 10px color-mix(in srgb, var(--dw-accent) 60%, transparent)",
              }} />
            </div>
          </div>
          <div style={{
            display: "flex", justifyContent: "space-between",
            fontFamily: "'DM Mono', monospace", fontSize: 9, color: "var(--dw-muted)",
          }}>
            <span>{formatTime(elapsed)}</span>
            <span>{formatTime(duration || 0)}</span>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
          {[
            { icon: "🔀", action: toggleShuffle, size: 16, active: shuffle },
            { icon: "⏮",  action: prev,          size: 18 },
            { icon: isPlaying ? "⏸" : "▶", action: togglePlay, play: true, size: 22 },
            { icon: "⏭",  action: next,          size: 18 },
            { icon: repeat === "one" ? "🔂" : "🔁", action: cycleRepeat, size: 16, active: repeat !== "none" },
          ].map(({ icon, action, play, size, active }, i) => (
            <button key={i} onClick={action} style={{
              background:   play ? "var(--dw-accent)" : "none",
              border:       "none",
              borderRadius: play ? "50%" : 8,
              width:        play ? 58 : 40,
              height:       play ? 58 : 40,
              color:        play ? "var(--dw-accent-fg)" : active ? "var(--dw-accent)" : "var(--dw-muted2)",
              fontSize:     size,
              cursor:       "pointer",
              display:      "flex", alignItems: "center", justifyContent: "center",
              transition:   "all 0.15s",
              boxShadow:    play ? "0 0 28px color-mix(in srgb, var(--dw-accent) 40%, transparent)" : "none",
            }}>
              {icon}
            </button>
          ))}
        </div>

        {/* Volume */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, width: "60%" }}>
          <span style={{ color: "var(--dw-muted)", fontSize: 13 }}>🔈</span>
          <div
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setVolume((e.clientX - rect.left) / rect.width);
            }}
            style={{
              flex: 1, height: 3,
              background: "color-mix(in srgb, var(--dw-border2) 60%, transparent)",
              borderRadius: 2, cursor: "pointer", position: "relative",
            }}
          >
            <div style={{
              position: "absolute", top: 0, left: 0, height: "100%",
              width: `${(volume || 0) * 100}%`, borderRadius: 2,
              background: "var(--dw-accent)",
            }} />
          </div>
          <span style={{ color: "var(--dw-muted)", fontSize: 13 }}>🔊</span>
        </div>
      </div>

      {/* Right panel — playlist */}
      <div style={{
        position: "relative", zIndex: 1,
        flex: 1, display: "flex", flexDirection: "column",
        overflow: "hidden",
        background: "color-mix(in srgb, var(--dw-surface) 50%, transparent)",
        backdropFilter: "blur(12px)",
      }}>
        <div style={{
          padding: "28px 24px 16px",
          borderBottom: "1px solid color-mix(in srgb, var(--dw-border) 40%, transparent)",
          flexShrink: 0,
        }}>
          <div style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 20, fontWeight: 600, color: "var(--dw-text)", letterSpacing: -0.3,
          }}>
            Playing Queue
          </div>
          {queue.length > 0 && (
            <div style={{
              fontFamily: "'DM Mono', monospace", fontSize: 9,
              color: "var(--dw-muted)", letterSpacing: 2, marginTop: 4,
            }}>
              {queue.length} TRACKS · {queueIndex + 1} OF {queue.length}
            </div>
          )}
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "8px 16px 24px" }}>
          {queue.length === 0 ? (
            <div style={{
              color: "var(--dw-muted)", fontStyle: "italic",
              fontSize: 13, padding: "32px 8px", textAlign: "center",
            }}>
              Queue is empty
            </div>
          ) : queue.map((track, i) => {
            const isCurrent = i === queueIndex;
            const isPast    = i < queueIndex;
            return (
              <div
                key={i}
                ref={isCurrent ? currentRowRef : null}
                onClick={() => playQueue(queue, i)}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "9px 10px", borderRadius: 10, cursor: "pointer",
                  background: isCurrent
                    ? "color-mix(in srgb, var(--dw-accent) 12%, transparent)"
                    : "transparent",
                  border: isCurrent
                    ? "1px solid color-mix(in srgb, var(--dw-accent) 25%, transparent)"
                    : "1px solid transparent",
                  opacity: isPast ? 0.4 : 1,
                  transition: "background 0.15s",
                  marginBottom: 2,
                }}
                onMouseEnter={(e) => { if (!isCurrent) e.currentTarget.style.background = "color-mix(in srgb, var(--dw-card) 60%, transparent)"; }}
                onMouseLeave={(e) => { if (!isCurrent) e.currentTarget.style.background = "transparent"; }}
              >
                {/* Index / playing indicator */}
                <div style={{
                  width: 28, textAlign: "right", flexShrink: 0,
                  fontFamily: "'DM Mono', monospace", fontSize: 9,
                  color: "var(--dw-muted)",
                  display: "flex", justifyContent: "flex-end", alignItems: "center",
                }}>
                  {isCurrent && isPlaying ? <PlayingBars /> : <span>{i + 1}</span>}
                </div>

                {/* Cover thumbnail */}
                <div style={{
                  width: 38, height: 38, borderRadius: 6, flexShrink: 0,
                  background: "var(--dw-card)", overflow: "hidden",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
                }}>
                  {track.cover_url
                    ? <img src={track.cover_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : "🎵"}
                </div>

                {/* Info */}
                <div style={{ flex: 1, overflow: "hidden" }}>
                  <div style={{
                    fontSize: 12, fontWeight: isCurrent ? 700 : 600,
                    color: isCurrent ? "var(--dw-accent)" : "var(--dw-text)",
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>{track.title}</div>
                  <div style={{
                    fontFamily: "'DM Mono', monospace", fontSize: 9,
                    color: "var(--dw-muted)",
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>{track.artist}</div>
                </div>

                {/* Duration */}
                {track.duration > 0 && (
                  <div style={{
                    fontFamily: "'DM Mono', monospace", fontSize: 9,
                    color: "var(--dw-muted)", flexShrink: 0,
                  }}>
                    {formatTime(track.duration)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
