const STORAGE_KEY_API  = 'dw_api_url';
const STORAGE_KEY_NAVI = 'dw_navidrome_url';

/** True when running inside a Tauri desktop window. */
export const isTauri = () =>
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

/** Runtime API base URL — localStorage overrides the build-time env var. */
export function getApiUrl() {
  return (
    localStorage.getItem(STORAGE_KEY_API) ||
    import.meta.env.VITE_API_URL ||
    'http://localhost:8000'
  );
}

/** Navidrome URL — used for direct links. */
export function getNavidromeUrl() {
  return (
    localStorage.getItem(STORAGE_KEY_NAVI) ||
    import.meta.env.VITE_NAVIDROME_URL ||
    'http://localhost:4533'
  );
}

/** Persist both URLs; reload so every module picks up the new value. */
export function saveServerConfig({ apiUrl, navidromeUrl }) {
  if (apiUrl)        localStorage.setItem(STORAGE_KEY_API,  apiUrl.trim());
  if (navidromeUrl)  localStorage.setItem(STORAGE_KEY_NAVI, navidromeUrl.trim());
}

/** True when running in Tauri and no server has been configured yet. */
export function needsFirstRunSetup() {
  return isTauri() && !localStorage.getItem(STORAGE_KEY_API);
}
