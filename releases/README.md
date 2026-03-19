# Driftwave — Desktop Releases

Compiled installers for the Driftwave desktop app (Tauri v2).

```
releases/
├── windows/    ← .msi + .exe installers
├── macos/      ← .dmg (future)
└── linux/      ← .AppImage / .deb (future)
```

## How to build

| Platform | Command | Prerequisites |
|---|---|---|
| Windows | `frontend/build-windows.bat` | Rust, VS Build Tools, Node.js |
| macOS | `cd frontend && npm run tauri:build` | Rust, Xcode CLT, Node.js |
| Linux | `cd frontend && npm run tauri:build` | Rust, libwebkit2gtk, Node.js |

## First launch

The app shows a setup screen on first run. Enter:
- **API URL** — `http://<server-ip>:8000`
- **Navidrome URL** — `http://<server-ip>:4533`

Settings are saved in localStorage and persist across restarts.
