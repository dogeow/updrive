# updrive Agent Notes

- Stack: Electron + Vite + React 19 + Zustand + Tailwind 4
- Upyun API runs in **main process** (`src/main/upyun/session.ts`), renderer talks via preload IPC
- Legacy Vue 2 app lives under `legacy/` (do not restore as default)
- Sibling references: `simple-diff` (scaffold), `upyun-web` (API patterns)
