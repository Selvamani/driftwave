import { useEffect, useRef } from "react";

const TYPE_META = {
  composer: { icon: "🎼", label: "Composer" },
  director: { icon: "🎬", label: "Director" },
  film:     { icon: "🎞", label: "Film" },
  artist:   { icon: "🎤", label: "Singer" },
  cast:     { icon: "🎭", label: "Actor" },
};

export default function SearchSuggestions({ suggestions, activeIndex, onSelect, onClose }) {
  const listRef = useRef(null);

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const item = listRef.current.children[activeIndex];
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  if (!suggestions.length) return null;

  return (
    <div
      ref={listRef}
      style={{
        position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0,
        background: "var(--dw-surface)",
        border: "1px solid var(--dw-border2)",
        borderRadius: 12,
        boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
        zIndex: 200,
        maxHeight: 320,
        overflowY: "auto",
        padding: "6px 0",
      }}
    >
      {suggestions.map((s, i) => {
        const meta    = TYPE_META[s.type] || { icon: "🔍", label: s.type };
        const active  = i === activeIndex;
        return (
          <div
            key={`${s.type}-${s.label}`}
            onMouseDown={(e) => { e.preventDefault(); onSelect(s); }}
            style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "9px 16px",
              cursor: "pointer",
              background: active ? "color-mix(in srgb, var(--dw-accent) 10%, transparent)" : "transparent",
              transition: "background 0.1s",
            }}
            onMouseEnter={(e) => {
              if (!active) e.currentTarget.style.background = "color-mix(in srgb, var(--dw-accent) 6%, transparent)";
            }}
            onMouseLeave={(e) => {
              if (!active) e.currentTarget.style.background = "transparent";
            }}
          >
            <span style={{ fontSize: 16, flexShrink: 0 }}>{meta.icon}</span>
            <span style={{
              fontSize: 11, color: "var(--dw-muted)", width: 60,
              flexShrink: 0, fontFamily: "'DM Mono', monospace",
            }}>
              {meta.label}
            </span>
            <span style={{ fontSize: 14, color: "var(--dw-text)", fontWeight: 500 }}>
              {s.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
