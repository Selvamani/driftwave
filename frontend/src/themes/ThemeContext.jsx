/**
 * Driftwave Theme Context
 * Provides theme switching across the entire app.
 * Persists selection in localStorage.
 */
import { createContext, useContext, useEffect, useState } from "react";

export const THEMES = [
  { id: "ocean",    name: "Ocean",    preview: ["#38bdf8", "#818cf8", "#080a0e"] },
  { id: "aurora",   name: "Aurora",   preview: ["#34d399", "#6ee7b7", "#060d0a"] },
  { id: "sunset",   name: "Sunset",   preview: ["#fb923c", "#fbbf24", "#0e0805"] },
  { id: "midnight", name: "Midnight", preview: ["#a78bfa", "#c4b5fd", "#000000"] },
  { id: "sakura",   name: "Sakura",   preview: ["#e11d6a", "#f43f8e", "#fdf6f8"] },
  { id: "paper",    name: "Paper",    preview: ["#c2410c", "#ea580c", "#f7f4ef"] },
];

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(
    () => localStorage.getItem("dw-theme") || "ocean"
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("dw-theme", theme);
  }, [theme]);

  const setTheme = (id) => {
    if (THEMES.find((t) => t.id === id)) {
      setThemeState(id);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
