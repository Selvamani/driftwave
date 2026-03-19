/**
 * ThemePicker — visual swatch selector for all 6 themes.
 * Used in Settings and accessible from the sidebar.
 */
import { useTheme } from "../themes/ThemeContext";

export default function ThemePicker({ compact = false }) {
  const { theme, setTheme, themes } = useTheme();

  if (compact) {
    return (
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {themes.map((t) => (
          <button
            key={t.id}
            title={t.name}
            onClick={() => setTheme(t.id)}
            style={{
              width: 28, height: 28,
              borderRadius: 8,
              border: theme === t.id ? "2px solid var(--dw-accent)" : "2px solid transparent",
              background: `linear-gradient(135deg, ${t.preview[0]}, ${t.preview[1]})`,
              cursor: "pointer",
              outline: "none",
              transition: "transform 0.15s, border-color 0.15s",
              transform: theme === t.id ? "scale(1.15)" : "scale(1)",
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div style={{
        fontFamily: "var(--dw-mono, 'DM Mono', monospace)",
        fontSize: 9,
        letterSpacing: 3,
        textTransform: "uppercase",
        color: "var(--dw-muted)",
        marginBottom: 12,
      }}>
        Color Theme
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        {themes.map((t) => {
          const isActive = theme === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              style={{
                background: t.preview[2],
                border: isActive
                  ? "2px solid var(--dw-accent)"
                  : "2px solid var(--dw-border)",
                borderRadius: 12,
                padding: "10px 12px",
                cursor: "pointer",
                transition: "all 0.2s",
                outline: "none",
                textAlign: "left",
              }}
            >
              {/* Color swatches */}
              <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
                {[t.preview[0], t.preview[1]].map((color, i) => (
                  <div
                    key={i}
                    style={{
                      width: 16, height: 16,
                      borderRadius: 4,
                      background: color,
                    }}
                  />
                ))}
              </div>
              <div style={{
                fontSize: 12,
                fontWeight: 700,
                color: t.preview[2] === "#f7f4ef" || t.preview[2] === "#fdf6f8"
                  ? "#1a1815"
                  : "#ffffff",
              }}>
                {t.name}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
