import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import usePlayerStore from "../hooks/usePlayerStore";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

function CoverArt({ id, size = 100, radius = 0, fontSize = 42, fallback = "🎵" }) {
  if (!id) return <span style={{ fontSize }}>{fallback}</span>;
  return (
    <img
      src={`${API}/stream/cover/${id}?size=${size}`}
      alt=""
      style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: radius }}
      onError={(e) => { e.currentTarget.replaceWith(Object.assign(document.createElement("span"), { textContent: fallback, style: `font-size:${fontSize}px` })); }}
    />
  );
}

export default function LibraryPage() {
  const [search, setSearch] = useState("");
  const [langFilter, setLangFilter] = useState("all");
  const [selectedArtist, setSelectedArtist] = useState(null);
  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const playTrack = usePlayerStore((s) => s.playTrack);

  function toPlayerTrack(song) {
    return {
      subsonic_id:   song.id,
      file_path:     `${API}/stream/${song.id}`,
      title:         song.title,
      artist:        song.artist,
      album:         song.album,
      duration:      song.duration,
      bitRate:       song.bitRate,
      cover_url:     song.coverArt ? `${API}/stream/cover/${song.coverArt}` : null,
      // preserve metadata for sidebar display
      adapter_type:  song.adapter_type,
      tempo:         song.tempo,
      cultural_meta: song.cultural_meta,
    };
  }

  const { data: artists } = useQuery({
    queryKey: ["artists"],
    queryFn:  () => axios.get(`${API}/library/artists`).then((r) => r.data.artists),
  });

  const { data: albums } = useQuery({
    queryKey: ["artist-albums", selectedArtist?.id],
    queryFn:  () => axios.get(`${API}/library/artist/${selectedArtist.id}/albums`).then((r) => r.data.albums),
    enabled:  !!selectedArtist,
  });

  const { data: albumDetail } = useQuery({
    queryKey: ["album", selectedAlbum?.id],
    queryFn:  () => axios.get(`${API}/library/album/${selectedAlbum.id}`).then((r) => r.data),
    enabled:  !!selectedAlbum,
  });

  const { data: searchResults, refetch: doSearch } = useQuery({
    queryKey: ["library-search", search],
    queryFn:  () => axios.get(`${API}/library/search`, { params: { q: search, limit: 30 } })
                        .then((r) => r.data),
    enabled:  search.length > 2,
  });

  return (
    <div style={{ padding: "36px 40px" }}>
      <h1 style={{
        fontFamily: "'Cormorant Garamond', serif",
        fontSize: 36, fontWeight: 300, color: "var(--dw-text)",
        letterSpacing: -1, marginBottom: 24,
      }}>
        Your{" "}
        <em style={{ fontStyle: "italic", color: "var(--dw-accent)" }}>Library</em>
      </h1>

      {/* Search */}
      <div style={{ position: "relative", marginBottom: 20 }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search artists, albums, songs..."
          style={{
            width: "100%", background: "var(--dw-surface)",
            border: "1px solid var(--dw-border2)", borderRadius: 12,
            padding: "12px 16px", fontFamily: "'Syne', sans-serif",
            fontSize: 14, color: "var(--dw-text)", outline: "none",
          }}
        />
      </div>

      {/* Search results */}
      {search.length > 2 && (
        <div>
          {!searchResults && (
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--dw-muted)", padding: "12px 0" }}>
              Searching…
            </div>
          )}
          {searchResults && (
            <>
              {searchResults.artists?.length > 0 && (
                <div style={{ marginBottom: 28 }}>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 3, textTransform: "uppercase", color: "var(--dw-muted)", marginBottom: 12 }}>
                    Artists
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
                    {searchResults.artists.map((artist) => (
                      <div
                        key={artist.id}
                        onClick={() => { setSearch(""); setSelectedArtist(artist); setSelectedAlbum(null); }}
                        style={{ background: "var(--dw-card)", border: "1px solid var(--dw-border)", borderRadius: 14, overflow: "hidden", cursor: "pointer" }}
                        onMouseEnter={(e) => e.currentTarget.style.borderColor = "var(--dw-border2)"}
                        onMouseLeave={(e) => e.currentTarget.style.borderColor = "var(--dw-border)"}
                      >
                        <div style={{ height: 80, background: "var(--dw-surface)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                          <CoverArt id={artist.coverArt} size={160} />
                        </div>
                        <div style={{ padding: "9px 12px" }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--dw-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{artist.name}</div>
                          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "var(--dw-muted)", marginTop: 2 }}>{artist.albumCount} albums</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {searchResults.albums?.length > 0 && (
                <div style={{ marginBottom: 28 }}>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 3, textTransform: "uppercase", color: "var(--dw-muted)", marginBottom: 12 }}>
                    Albums
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
                    {searchResults.albums.map((album) => (
                      <div
                        key={album.id}
                        onClick={() => { setSearch(""); setSelectedArtist({ id: album.artistId, name: album.artist }); setSelectedAlbum(album); }}
                        style={{ background: "var(--dw-card)", border: "1px solid var(--dw-border)", borderRadius: 14, overflow: "hidden", cursor: "pointer" }}
                        onMouseEnter={(e) => e.currentTarget.style.borderColor = "var(--dw-border2)"}
                        onMouseLeave={(e) => e.currentTarget.style.borderColor = "var(--dw-border)"}
                      >
                        <div style={{ height: 80, background: "var(--dw-surface)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                          <CoverArt id={album.coverArt} size={160} fallback="💿" fontSize={32} />
                        </div>
                        <div style={{ padding: "9px 12px" }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--dw-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{album.name}</div>
                          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "var(--dw-muted)", marginTop: 2 }}>{album.artist}{album.year ? ` · ${album.year}` : ""}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {searchResults.songs?.length > 0 && (
                <div style={{ marginBottom: 28 }}>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 3, textTransform: "uppercase", color: "var(--dw-muted)", marginBottom: 12 }}>
                    Songs
                  </div>
                  {searchResults.songs.map((song, i) => (
                    <div
                      key={song.id}
                      onClick={() => playTrack(toPlayerTrack(song), searchResults.songs.map(toPlayerTrack))}
                      style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 12px", borderRadius: 10, cursor: "pointer", background: i % 2 === 0 ? "var(--dw-card)" : "transparent", transition: "background 0.15s" }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "var(--dw-surface)"}
                      onMouseLeave={(e) => e.currentTarget.style.background = i % 2 === 0 ? "var(--dw-card)" : "transparent"}
                    >
                      <div style={{ width: 36, height: 36, borderRadius: 6, background: "var(--dw-surface)", overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <CoverArt id={song.coverArt} size={72} fallback="🎵" fontSize={18} />
                      </div>
                      <div style={{ flex: 1, overflow: "hidden" }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--dw-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{song.title}</div>
                        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "var(--dw-muted)", marginTop: 2 }}>{song.artist} · {song.album}</div>
                      </div>
                      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "var(--dw-muted)", flexShrink: 0 }}>
                        {song.duration ? `${Math.floor(song.duration / 60)}:${String(song.duration % 60).padStart(2, "0")}` : ""}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {!searchResults.artists?.length && !searchResults.albums?.length && !searchResults.songs?.length && (
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--dw-muted)", padding: "12px 0" }}>
                  No results for "{search}"
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Back button when artist selected */}
      {!search && selectedArtist && (
        <button
          onClick={() => { setSelectedArtist(null); setSelectedAlbum(null); }}
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: "var(--dw-accent)", fontFamily: "'Syne', sans-serif",
            fontSize: 13, marginBottom: 16, padding: 0,
          }}
        >
          ← All Artists
        </button>
      )}

      {/* Artists grid — hidden once an artist is selected */}
      {!selectedArtist && <>
      <div style={{
        fontFamily: "'DM Mono', monospace", fontSize: 9,
        letterSpacing: 3, textTransform: "uppercase",
        color: "var(--dw-muted)", marginBottom: 14,
      }}>Artists</div>
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(4,1fr)",
        gap: 14, marginBottom: 32,
      }}>
        {(artists || Array(8).fill(null)).map((artist, i) => (
          <div
            key={i}
            onClick={() => { if (artist) { setSelectedArtist(selectedArtist?.id === artist.id ? null : artist); setSelectedAlbum(null); } }}
            style={{
              background: selectedArtist?.id === artist?.id ? "var(--dw-surface)" : "var(--dw-card)",
              border: `1px solid ${selectedArtist?.id === artist?.id ? "var(--dw-accent)" : "var(--dw-border)"}`,
              borderRadius: 14, overflow: "hidden", cursor: "pointer",
              transition: "border-color 0.2s, background 0.2s",
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = "var(--dw-border2)"}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = selectedArtist?.id === artist?.id ? "var(--dw-accent)" : "var(--dw-border)"}
          >
            <div style={{
              height: 100, background: "var(--dw-surface)",
              display: "flex", alignItems: "center", justifyContent: "center",
              overflow: "hidden",
            }}>
              {artist ? <CoverArt id={artist.coverArt} size={200} /> : (
                <div style={{
                  width: 40, height: 12, borderRadius: 4,
                  background: "var(--dw-border)", animation: "pulse 1.5s infinite",
                }} />
              )}
            </div>
            <div style={{ padding: "10px 12px" }}>
              <div style={{
                fontSize: 13, fontWeight: 700, color: "var(--dw-text)",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>{artist?.name || "—"}</div>
              <div style={{
                fontFamily: "'DM Mono', monospace", fontSize: 9,
                color: "var(--dw-muted)", marginTop: 2,
              }}>{artist?.albumCount || "—"} albums</div>
            </div>
          </div>
        ))}
      </div>
      </>}
      {/* Albums panel */}
      {selectedArtist && (
        <div>
          <div style={{
            fontFamily: "'DM Mono', monospace", fontSize: 9,
            letterSpacing: 3, textTransform: "uppercase",
            color: "var(--dw-muted)", marginBottom: 14,
          }}>{selectedArtist.name} — Albums</div>
          {!selectedAlbum && (
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(4,1fr)",
              gap: 14, marginBottom: 32,
            }}>
              {(albums || Array(4).fill(null)).map((album, i) => (
                <div
                  key={i}
                  onClick={() => album && setSelectedAlbum(album)}
                  style={{
                    background: "var(--dw-card)",
                    border: "1px solid var(--dw-border)",
                    borderRadius: 14, overflow: "hidden", cursor: "pointer",
                    transition: "border-color 0.2s, background 0.2s",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = "var(--dw-border2)"}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = "var(--dw-border)"}
                >
                  <div style={{
                    height: 100, background: "var(--dw-surface)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    overflow: "hidden",
                  }}>
                    <CoverArt id={album?.coverArt} size={200} fallback="💿" fontSize={36} />
                  </div>
                  <div style={{ padding: "10px 12px" }}>
                    <div style={{
                      fontSize: 13, fontWeight: 700, color: "var(--dw-text)",
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    }}>{album?.name || "—"}</div>
                    <div style={{
                      fontFamily: "'DM Mono', monospace", fontSize: 9,
                      color: "var(--dw-muted)", marginTop: 2,
                    }}>{album?.year || ""}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

        {/* Tracks panel */}
        {selectedAlbum && (
          <div>
            <button
              onClick={() => setSelectedAlbum(null)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: "var(--dw-accent)", fontFamily: "'Syne', sans-serif",
                fontSize: 13, marginBottom: 16, padding: 0,
              }}
            >← Albums</button>
            <div style={{
              fontFamily: "'DM Mono', monospace", fontSize: 9,
              letterSpacing: 3, textTransform: "uppercase",
              color: "var(--dw-muted)", marginBottom: 14,
            }}>{selectedAlbum.name} — Tracks</div>
            {(albumDetail?.song || []).map((song, i) => (
              <div
                key={song.id}
                onClick={() => {
                  const queue = albumDetail.song.map(toPlayerTrack);
                  playTrack(toPlayerTrack(song), queue);
                }}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "10px 14px", borderRadius: 10, cursor: "pointer",
                  background: i % 2 === 0 ? "var(--dw-card)" : "transparent",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "var(--dw-surface)"}
                onMouseLeave={(e) => e.currentTarget.style.background = i % 2 === 0 ? "var(--dw-card)" : "transparent"}
              >
                <div style={{
                  fontFamily: "'DM Mono', monospace", fontSize: 11,
                  color: "var(--dw-muted)", width: 24, textAlign: "right",
                }}>{song.track || i + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: "var(--dw-text)" }}>{song.title}</div>
                  <div style={{
                    fontFamily: "'DM Mono', monospace", fontSize: 10,
                    color: "var(--dw-muted)",
                  }}>{song.artist}</div>
                </div>
                <div style={{
                  fontFamily: "'DM Mono', monospace", fontSize: 11,
                  color: "var(--dw-muted)",
                }}>
                  {song.duration ? `${Math.floor(song.duration / 60)}:${String(song.duration % 60).padStart(2, "0")}` : ""}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      )}
    </div>
  );
}
