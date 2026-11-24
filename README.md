# Punarvikas — Redevelopment Manager

Web app for housing societies and their PMC to run a redevelopment: members and entitlements, consent voting, payments, meetings, notices, building plans, a document vault, an AI PMC assistant, offer comparison and a PowerPoint information pack.

Built with React 18 and Vite. All data is stored on the device (localStorage for society data, IndexedDB for uploaded files); backups are exported from **Society & terms**.

## Develop

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

The build in `dist/` uses relative paths, so it can be served from any folder or opened from a WebView's assets directory.

## Layout

```
index.html               page shell, fonts, icons
src/main.jsx             entry point (+ Android WebView print bridge)
src/App.jsx              app shell, navigation and routing
src/styles.css           all styles; design tokens live on :root
src/components/ui.jsx    icons and shared atoms (Btn, Field, Seg, Kpi, Ring, …)
src/lib/                 data store and calculations, files (IndexedDB), PMC licence codes, OTP, PPT export
src/screens/             screens: auth & member portal, members, voting & settings, journey & assistant,
                         notices & plans, vault, tools (payments, offers, meetings, activity, lookup)
public/                  app icons and the Universal Builtech logo
```
