import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import usePlayerStore from "../hooks/usePlayerStore";
import useDiscoverStore from "../hooks/useDiscoverStore";
import SearchSuggestions from "../components/SearchSuggestions";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

const MOOD_CHIPS = [
  "🌙 Late Night", "☀️ Morning Energy", "🌧️ Rainy Day",
  "🏃 Workout",    "📚 Focus",           "💔 Heartbreak",
  "🎉 Party",      "🛣️ Road Trip",       "🧘 Chill",
  "🔥 Intense",    "🌿 Peaceful",         "💫 Nostalgic",
];

const LANG_FILTERS = [
  { id: null,      label: "All" },
  { id: "tamil",   label: "Tamil" },
  { id: "hindi",   label: "Hindi" },
  { id: "korean",  label: "Korean" },
  { id: "arabic",  label: "Arabic" },
  { id: "telugu",  label: "Telugu" },
  { id: "default", label: "Other" },
];

function LangBadge({ lang }) {
  return (
    <span className={`lang-badge lang-${(lang || "en").toLowerCase()}`}>
      {(lang || "??").toUpperCase()}
    </span>
  );
}

function FilmPanel({ cm }) {
  const fm = cm?.film_meta || {};
  const filmName = cm?.film_name;
  if (!filmName) return null;

  const cast = Array.isArray(fm.cast) ? fm.cast : [];

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        margin: "4px 0 6px 80px",
        background: "var(--dw-card)",
        border: "1px solid var(--dw-border)",
        borderRadius: 10, padding: "10px 14px",
        display: "flex", gap: 20, alignItems: "flex-start",
        flexWrap: "wrap",
      }}
    >
      <div>
        <div style={{
          fontFamily: "'DM Mono', monospace", fontSize: 8,
          letterSpacing: 2, textTransform: "uppercase", color: "var(--dw-muted)",
          marginBottom: 3,
        }}>Film</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--dw-text)" }}>
          {filmName}
          {fm.imdb_url && (
            <a
              href={fm.imdb_url}
              target="_blank"
              rel="noreferrer"
              style={{
                marginLeft: 8, fontSize: 9,
                fontFamily: "'DM Mono', monospace",
                color: "var(--dw-accent)", textDecoration: "none",
                border: "1px solid var(--dw-accent)",
                borderRadius: 4, padding: "1px 5px",
                verticalAlign: "middle",
              }}
            >IMDb ↗</a>
          )}
        </div>
      </div>
      {fm.director && (
        <div>
          <div style={{
            fontFamily: "'DM Mono', monospace", fontSize: 8,
            letterSpacing: 2, textTransform: "uppercase", color: "var(--dw-muted)",
            marginBottom: 3,
          }}>Director</div>
          <div style={{ fontSize: 12, color: "var(--dw-text)" }}>{fm.director}</div>
        </div>
      )}
      {cast.length > 0 && (
        <div>
          <div style={{
            fontFamily: "'DM Mono', monospace", fontSize: 8,
            letterSpacing: 2, textTransform: "uppercase", color: "var(--dw-muted)",
            marginBottom: 3,
          }}>Cast</div>
          <div style={{ fontSize: 12, color: "var(--dw-text)" }}>
            {cast.join(" · ")}
          </div>
        </div>
      )}
    </div>
  );
}

function TrackRow({ track, index, isPlaying, onPlay }) {
  const [hover,       setHover]       = useState(false);
  const [filmExpanded, setFilmExpanded] = useState(false);

  const cm       = track.cultural_meta || {};
  const hasFilm  = !!cm.film_name;

  return (
    <div>
      <div
        onClick={onPlay}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          display:     "grid",
          gridTemplateColumns: "28px 40px 1fr auto auto auto auto",
          gap:         12,
          alignItems:  "center",
          padding:     "9px 12px",
          borderRadius: filmExpanded ? "10px 10px 0 0" : 10,
          cursor:      "pointer",
          background:  isPlaying
            ? "color-mix(in srgb, var(--dw-accent) 6%, transparent)"
            : hover ? "var(--dw-surface)" : "transparent",
          transition:  "background 0.15s",
        }}
      >
        <div style={{
          fontFamily: "'DM Mono', monospace", fontSize: 11,
          color:      isPlaying ? "var(--dw-accent)" : "var(--dw-muted)",
          textAlign:  "right",
        }}>
          {isPlaying ? (
            <div style={{ display: "flex", gap: 2, alignItems: "flex-end", height: 18, justifyContent: "flex-end" }}>
              {[0, 0.15, 0.3].map((d) => (
                <div key={d} style={{
                  width: 3, background: "var(--dw-accent)", borderRadius: 1,
                  animation: `waveBar 0.8s ${d}s ease-in-out infinite`,
                }} />
              ))}
            </div>
          ) : index + 1}
        </div>
        <div style={{
          width: 38, height: 38, borderRadius: 6, flexShrink: 0,
          background: "var(--dw-card)", border: "1px solid var(--dw-border)",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
        }}>🎵</div>
        <div style={{ overflow: "hidden" }}>
          <div style={{
            fontSize: 13, fontWeight: 600,
            color: isPlaying ? "var(--dw-accent)" : "var(--dw-text)",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>{track.title}</div>
          <div style={{
            fontFamily: "'DM Mono', monospace", fontSize: 9, color: "var(--dw-muted)",
            marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>{track.artist} · {track.album} {track.year ? `· ${track.year}` : ""}</div>
        </div>
        <LangBadge lang={track.adapter_type} />
        {hasFilm ? (
          <div
            onClick={(e) => { e.stopPropagation(); setFilmExpanded(!filmExpanded); }}
            title="Film info"
            style={{
              fontSize: 14, cursor: "pointer", opacity: filmExpanded ? 1 : 0.5,
              color: filmExpanded ? "var(--dw-accent)" : "var(--dw-muted)",
              transition: "opacity 0.15s, color 0.15s",
              userSelect: "none",
            }}
          >🎬</div>
        ) : <div />}
        <div style={{
          fontFamily: "'DM Mono', monospace", fontSize: 10, color: "var(--dw-muted)",
        }}>{formatDur(track.duration)}</div>
      </div>
      {filmExpanded && hasFilm && <FilmPanel cm={cm} />}
    </div>
  );
}

export default function DiscoverPage() {
  const {
    prompt,       setPrompt,
    activeChip,   setActiveChip,
    langFilter,   setLangFilter,
    energy,       setEnergy,
    tempo,        setTempo,
    valence,      setValence,
    energyOn,     setEnergyOn,
    tempoOn,      setTempoOn,
    valenceOn,    setValenceOn,
    durationOn,   setDurationOn,
    durationMins, setDurationMins,
    filtersOpen,  setFiltersOpen,
    limit,        setLimit,
    tracks:       storedTracks,
    totalDurSec:  storedTotalDur,
    setResults,
  } = useDiscoverStore();

  const playTrack    = usePlayerStore((s) => s.playTrack);
  const currentTrack = usePlayerStore((s) => s.currentTrack);

  // ── Suggestions ───────────────────────────────────────
  const [suggestions,  setSuggestions]  = useState([]);
  const [suggActive,   setSuggActive]   = useState(-1);
  const [showSugg,     setShowSugg]     = useState(false);
  const suggestTimer = useRef(null);

  const fetchSuggestions = useCallback((q) => {
    clearTimeout(suggestTimer.current);
    if (q.length < 2) { setSuggestions([]); setShowSugg(false); return; }
    suggestTimer.current = setTimeout(async () => {
      try {
        const res = await axios.get(`${API}/search/suggest`, { params: { q } });
        setSuggestions(res.data.suggestions || []);
        setShowSugg(true);
        setSuggActive(-1);
      } catch { /* ignore */ }
    }, 250);
  }, []);

  const handleSuggSelect = (s) => {
    setPrompt(s.label);
    setSuggestions([]);
    setShowSugg(false);
  };

  const handlePromptKeyDown = (e) => {
    if (!showSugg || !suggestions.length) {
      if (e.key === "Enter") handleSearch();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSuggActive((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSuggActive((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (suggActive >= 0) {
        handleSuggSelect(suggestions[suggActive]);
      } else {
        setShowSugg(false);
        handleSearch();
      }
    } else if (e.key === "Escape") {
      setShowSugg(false);
    }
  };

  function toPlayerTrack(track) {
    return {
      ...track,
      qdrant_path: track.file_path,   // original filesystem path for lyrics/search
      file_path: `${API}/stream/by-path?path=${encodeURIComponent(track.file_path)}`,
      cover_url: track.cover_art_id ? `${API}/stream/cover/${track.cover_art_id}` : null,
    };
  }

  const { mutate: search, isPending } = useMutation({
    mutationFn: async ({ q, lang }) => {
      const res = await axios.post(`${API}/search`, {
        prompt:               q,
        limit,
        lang_filter:          lang,
        energy_min:           energyOn   ? energy  : null,
        valence_min:          valenceOn  ? valence : null,
        tempo_max:            tempoOn    ? Math.round(40 + tempo * 160) : null,
        duration_limit_secs:  durationOn ? durationMins * 60 : null,
      });
      return { tracks: res.data.tracks, total_duration: res.data.total_duration };
    },
    onSuccess: (data) => {
      setResults(data.tracks ?? [], data.total_duration ?? 0);
    },
  });

  const buildQuery = (chip = activeChip) => [
    prompt,
    chip ? chip.replace(/^[^\s]+\s/, "") : "",
  ].filter(Boolean).join(", ").trim();

  const handleSearch = () => {
    const q = buildQuery();
    if (q) search({ q, lang: langFilter });
  };

  const handleChipClick = (chip) => {
    const next = activeChip === chip ? null : chip;
    setActiveChip(next);
    const q = buildQuery(next);
    if (q) search({ q, lang: langFilter });
  };

  const handleLangFilter = (id) => {
    const next = langFilter === id ? null : id;
    setLangFilter(next);
    const q = buildQuery();
    if (q) search({ q, lang: next });
  };

  const tracks      = storedTracks;
  const totalDurSec = storedTotalDur;

  const pushToNavidrome = async () => {
    if (!tracks.length) return;
    await axios.post(`${API}/playlist/generate-and-push`, {
      prompt: prompt || activeChip || "Driftwave playlist",
      limit:  20,
      lang_filter: langFilter,
    });
    alert("✅ Playlist saved to Navidrome!");
  };

  return (
    <div style={{ padding: "36px 40px" }}>
      {/* Heading */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 44, fontWeight: 300, color: "var(--dw-text)",
          letterSpacing: -1.5, lineHeight: 1.1, marginBottom: 6,
        }}>
          What do you want<br />to{" "}
          <em style={{ fontStyle: "italic", color: "var(--dw-accent)" }}>feel</em>{" "}
          today?
        </h1>
        <p style={{
          fontFamily: "'DM Mono', monospace", fontSize: 11,
          color: "var(--dw-muted)", letterSpacing: 1,
        }}>Describe a mood, moment, or memory</p>
      </div>

      {/* Prompt bar */}
      <div style={{ position: "relative", marginBottom: 16 }}>
        <span style={{
          position: "absolute", left: 18, top: "50%",
          transform: "translateY(-50%)", fontSize: 18, pointerEvents: "none",
        }}>🎵</span>
        <input
          value={prompt}
          onChange={(e) => { setPrompt(e.target.value); fetchSuggestions(e.target.value); }}
          onKeyDown={handlePromptKeyDown}
          onFocus={(e) => {
            e.target.style.borderColor = "var(--dw-accent)";
            e.target.style.boxShadow = "0 0 0 3px color-mix(in srgb, var(--dw-accent) 12%, transparent)";
            if (prompt.length >= 2 && suggestions.length > 0) setShowSugg(true);
          }}
          onBlur={(e) => {
            e.target.style.borderColor = "var(--dw-border2)";
            e.target.style.boxShadow = "none";
            // Delay so onMouseDown on suggestion fires first
            setTimeout(() => setShowSugg(false), 150);
          }}
          placeholder="e.g. melancholic AR Rahman, late night, slow tempo..."
          style={{
            width: "100%", background: "var(--dw-surface)",
            border: "1px solid var(--dw-border2)", borderRadius: 14,
            padding: "16px 56px 16px 48px",
            fontFamily: "'Syne', sans-serif", fontSize: 14,
            color: "var(--dw-text)", outline: "none",
            transition: "border-color 0.2s, box-shadow 0.2s",
          }}
        />
        <button
          onClick={handleSearch}
          style={{
            position: "absolute", right: 10, top: "50%",
            transform: "translateY(-50%)",
            background: "var(--dw-accent)", border: "none",
            borderRadius: 10, width: 38, height: 38,
            color: "var(--dw-accent-fg)", fontSize: 16, fontWeight: 700,
            cursor: "pointer", transition: "all 0.2s",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>→</button>
        {showSugg && (
          <SearchSuggestions
            suggestions={suggestions}
            activeIndex={suggActive}
            onSelect={handleSuggSelect}
            onClose={() => setShowSugg(false)}
          />
        )}
      </div>

      {/* Mood chips */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        {MOOD_CHIPS.map((chip) => {
          const active = activeChip === chip;
          return (
            <button
              key={chip}
              onClick={() => handleChipClick(chip)}
              style={{
                padding: "7px 14px", borderRadius: 100,
                border: `1px solid ${active ? "var(--dw-accent)" : "var(--dw-border2)"}`,
                background: active
                  ? "color-mix(in srgb, var(--dw-accent) 14%, transparent)"
                  : "var(--dw-surface)",
                color: active ? "var(--dw-accent)" : "var(--dw-muted2)",
                fontSize: 12, fontWeight: 600, cursor: "pointer",
                transition: "all 0.15s",
                transform: "scale(1)",
                boxShadow: active
                  ? "0 0 12px color-mix(in srgb, var(--dw-accent) 20%, transparent)"
                  : "none",
              }}
              onMouseDown={(e) => e.currentTarget.style.transform = "scale(0.94)"}
              onMouseUp={(e)   => e.currentTarget.style.transform = "scale(1)"}
              onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
            >{chip}</button>
          );
        })}
      </div>

      {/* Lang filter */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {LANG_FILTERS.map(({ id, label }) => {
          const active = langFilter === id;
          return (
            <button
              key={String(id)}
              onClick={() => handleLangFilter(id)}
              style={{
                padding: "6px 14px", borderRadius: 8,
                border: `1px solid ${active ? "var(--dw-accent)" : "var(--dw-border)"}`,
                background: active
                  ? "color-mix(in srgb, var(--dw-accent) 10%, transparent)"
                  : "var(--dw-surface)",
                color: active ? "var(--dw-accent)" : "var(--dw-muted2)",
                fontFamily: "'DM Mono', monospace", fontSize: 10,
                letterSpacing: 1, cursor: "pointer", transition: "all 0.15s",
                transform: "scale(1)",
              }}
              onMouseDown={(e) => e.currentTarget.style.transform = "scale(0.92)"}
              onMouseUp={(e)   => e.currentTarget.style.transform = "scale(1)"}
              onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
            >{label}</button>
          );
        })}
      </div>

      {/* Sliders — collapsible */}
      <div style={{ marginBottom: 28 }}>
        <button
          onClick={() => setFiltersOpen(!filtersOpen)}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "none", border: "none", cursor: "pointer",
            color: (energyOn || tempoOn || valenceOn || durationOn) ? "var(--dw-accent)" : "var(--dw-muted)",
            fontFamily: "'DM Mono', monospace", fontSize: 10,
            letterSpacing: 1, textTransform: "uppercase",
            padding: "4px 0", marginBottom: filtersOpen ? 12 : 0,
            transition: "color 0.2s",
          }}
        >
          <span style={{
            display: "inline-block",
            transform: filtersOpen ? "rotate(90deg)" : "rotate(0deg)",
            transition: "transform 0.2s", fontSize: 9,
          }}>▶</span>
          Filters
          {(energyOn || tempoOn || valenceOn || durationOn) && (
            <span style={{
              background: "var(--dw-accent)", color: "var(--dw-accent-fg)",
              borderRadius: 100, padding: "1px 7px", fontSize: 9, fontWeight: 700,
            }}>
              {[energyOn, tempoOn, valenceOn, durationOn].filter(Boolean).length} on
            </span>
          )}
        </button>

      <div style={{ display: filtersOpen ? "grid" : "none", gridTemplateColumns: "repeat(5,1fr)", gap: 12 }}>
        {[
          {
            label: "Energy min",  on: energyOn,   setOn: setEnergyOn,
            val: energy,          set: setEnergy,
            display: (v) => `${Math.round(v * 100)}%`,
            min: 0, max: 1, step: 0.01,
          },
          {
            label: "Tempo max",   on: tempoOn,    setOn: setTempoOn,
            val: tempo,           set: setTempo,
            display: (v) => `${Math.round(40 + v * 160)} bpm`,
            min: 0, max: 1, step: 0.01,
          },
          {
            label: "Valence min", on: valenceOn,  setOn: setValenceOn,
            val: valence,         set: setValence,
            display: (v) => `${Math.round(v * 100)}%`,
            min: 0, max: 1, step: 0.01,
          },
          {
            label: "Max duration", on: durationOn, setOn: setDurationOn,
            val: durationMins,     set: setDurationMins,
            display: (v) => `${v} min`,
            min: 10, max: 600, step: 10,
          },
          {
            label: "Results",     on: null,        setOn: null,
            val: limit,           set: setLimit,
            display: (v) => `${v} tracks`,
            min: 5, max: 100, step: 5,
            disabled: durationOn,
          },
        ].map(({ label, val, set, on, setOn, display, min, max, step, disabled }) => {
          const hasToggle = setOn !== null;
          const active = !hasToggle || on;
          return (
            <div key={label} style={{
              background: "var(--dw-surface)",
              border: `1px solid ${(!disabled && (hasToggle ? on : true)) ? "var(--dw-accent)" : "var(--dw-border)"}`,
              borderRadius: 12, padding: "12px 14px",
              opacity: (active && !disabled) ? 1 : 0.5,
              transition: "opacity 0.2s, border-color 0.2s",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{
                  fontFamily: "'DM Mono', monospace", fontSize: 9,
                  letterSpacing: 2, textTransform: "uppercase",
                  color: (active && !disabled) ? "var(--dw-text)" : "var(--dw-muted2)",
                }}>{label}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {(active && !disabled) && (
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "var(--dw-accent)" }}>
                      {display(val)}
                    </span>
                  )}
                  {hasToggle && (
                    <div
                      onClick={() => setOn(!on)}
                      style={{
                        width: 32, height: 18, borderRadius: 9,
                        background: on ? "var(--dw-accent)" : "var(--dw-border2)",
                        position: "relative", cursor: "pointer", flexShrink: 0,
                        transition: "background 0.2s",
                      }}
                    >
                      <div style={{
                        position: "absolute", top: 3, left: on ? 17 : 3,
                        width: 12, height: 12, borderRadius: "50%",
                        background: "white", transition: "left 0.2s",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                      }} />
                    </div>
                  )}
                </div>
              </div>
              <input
                type="range" min={min} max={max} step={step}
                value={val}
                disabled={(hasToggle && !on) || disabled}
                onChange={(e) => set(step < 1 ? parseFloat(e.target.value) : parseInt(e.target.value))}
                style={{ width: "100%", accentColor: "var(--dw-accent)", cursor: (active && !disabled) ? "pointer" : "default" }}
              />
            </div>
          );
        })}
      </div>
      </div>

      {/* Results */}
      {(tracks.length > 0 || isPending) && (
        <>
          <div style={{
            display: "flex", alignItems: "center",
            justifyContent: "space-between", marginBottom: 16,
          }}>
            <div>
              <h2 style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: 22, fontWeight: 400, color: "var(--dw-text)",
                letterSpacing: -0.5, marginBottom: 2,
              }}>
                {isPending ? "Finding your drift..." : (
                  <>Generated for{" "}
                    <em style={{ fontStyle: "italic", color: "var(--dw-accent)" }}>
                      {prompt || activeChip || "your mood"}
                    </em>
                  </>
                )}
              </h2>
              {!isPending && tracks.length > 0 && (
                <div style={{
                  fontFamily: "'DM Mono', monospace", fontSize: 10, color: "var(--dw-muted)",
                  letterSpacing: 0.5,
                }}>
                  {tracks.length} tracks · {formatDur(totalDurSec)}
                  {durationOn && (
                    <span style={{ color: "var(--dw-accent)", marginLeft: 6 }}>
                      / {formatDur(durationMins * 60)} limit
                    </span>
                  )}
                </div>
              )}
            </div>
            {tracks.length > 0 && (
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => usePlayerStore.getState().playQueue(tracks.map(toPlayerTrack), 0)}
                  style={actionBtn(false)}
                >▶ Play All</button>
                <button onClick={pushToNavidrome} style={actionBtn(true)}>
                  Save to Navidrome →
                </button>
              </div>
            )}
          </div>

          {isPending ? (
            <div style={{
              display: "flex", gap: 8, alignItems: "center",
              color: "var(--dw-muted)", padding: "20px 0",
            }}>
              <div style={{
                width: 16, height: 16, border: "2px solid var(--dw-accent)",
                borderTopColor: "transparent", borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
              }} />
              Searching your library...
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {tracks.map((track, i) => (
                <TrackRow
                  key={track.file_path}
                  track={track}
                  index={i}
                  isPlaying={currentTrack?.file_path === track.file_path}
                  onPlay={() => playTrack(toPlayerTrack(track), tracks.map(toPlayerTrack))}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

const actionBtn = (primary) => ({
  padding: "8px 16px", borderRadius: 8,
  border: primary ? "none" : "1px solid var(--dw-border2)",
  background: primary ? "var(--dw-accent)" : "var(--dw-surface)",
  color: primary ? "var(--dw-accent-fg)" : "var(--dw-muted2)",
  fontFamily: "'DM Mono', monospace", fontSize: 10,
  letterSpacing: 1, cursor: "pointer", transition: "all 0.2s",
});

function formatDur(secs) {
  if (!secs) return "";
  return `${Math.floor(secs / 60)}:${String(Math.floor(secs % 60)).padStart(2, "0")}`;
}
