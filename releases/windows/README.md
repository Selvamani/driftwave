# Windows Installers

Place Tauri build output here after running `build-windows.bat` in `frontend/`.

## Files

| File | Type | Notes |
|---|---|---|
| `Driftwave_x.x.x_x64_en-US.msi` | MSI installer | For enterprise / silent install |
| `Driftwave_x.x.x_x64-setup.exe` | NSIS installer | Recommended for end users |

## Build

From `frontend/` on Windows:

```cmd
build-windows.bat
```

Output is generated at:
```
frontend/src-tauri/target/release/bundle/msi/
frontend/src-tauri/target/release/bundle/nsis/
```

Copy the installers here after each release.
