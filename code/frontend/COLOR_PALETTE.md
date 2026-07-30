# G.U.A.R.D — Frontend Color Palette & Design Tokens

This document details the complete color system, glassmorphism design tokens, telemetry accents, and component file mappings for the G.U.A.R.D React frontend.

---

## 1. Core Brand & System Status Tokens

| Token / Utility Class | Light Mode | Dark Mode | Primary Components & File Paths | Visual Purpose |
| --------------------- | ---------- | --------- | -------------------------------- | -------------- |
| `primary` / `bg-primary` | `#0ea5e9` (Sky 500) | `#38bdf8` (Sky 400) | [`Layout.jsx`](src/components/Layout.jsx), [`Profile.jsx`](src/pages/Profile.jsx), [`Devices.jsx`](src/pages/Devices.jsx) | Active navigation link pills, primary buttons, focus rings, avatar borders |
| `primary-dark` / `hover:bg-primary-dark` | `#0284c7` (Sky 600) | `#0ea5e9` (Sky 500) | [`Profile.jsx`](src/pages/Profile.jsx), [`Users.jsx`](src/pages/Users.jsx) | Hover & active click states for primary CTAs |
| `success` / `text-success` | `#22c55e` (Green 500) | `#22c55e` / `rgba(34,197,94,0.15)` | [`Dashboard.jsx`](src/pages/Dashboard.jsx), [`Alerts.jsx`](src/pages/Alerts.jsx), [`Profile.jsx`](src/pages/Profile.jsx) | Online device status dots, resolved alert badges, verified phone/email indicators |
| `danger` / `text-danger` | `#ef4444` (Red 500) | `#ef4444` / `rgba(239,68,68,0.15)` | [`Dashboard.jsx`](src/pages/Dashboard.jsx), [`Alerts.jsx`](src/pages/Alerts.jsx), [`Profile.jsx`](src/pages/Profile.jsx) | Active alert cards, breach indicators, unverified badges, photo delete button |
| `warning` / `text-warning` | `#f59e0b` (Amber 500) | `#f59e0b` / `rgba(245,158,11,0.15)` | [`Profile.jsx`](src/pages/Profile.jsx), [`ThresholdsPanel.jsx`](src/components/ThresholdsPanel.jsx) | Pending email/phone verification warnings, threshold warning limits |
| `text-main` | `#1e293b` (Slate 800) | `#f0f6fc` / `#e6edf3` | [`Dashboard.jsx`](src/pages/Dashboard.jsx), [`FishInfo.jsx`](src/pages/FishInfo.jsx), [`SensorHistory.jsx`](src/pages/SensorHistory.jsx) | Main page titles, card headings, numerical sensor readings |
| `text-muted` | `#64748b` (Slate 500) | `#8b949e` / `#94a3b8` | [`Layout.jsx`](src/components/Layout.jsx), [`SensorGauge.jsx`](src/components/SensorGauge.jsx) | Subtitles, input placeholders, gauge parameter labels, timestamps |

---

## 2. Glassmorphism Surface & Canvas Layering

| Surface Layer | Light Mode | Dark Mode | File Paths | Tailwind / CSS Rule |
| ------------- | ---------- | --------- | ---------- | ------------------- |
| Page Canvas (`--page-bg`) | `#e8f3fb` | `#060c16` (Obsidian) | [`base.css`](src/styles/base.css) | `background-color: var(--page-bg)` (fixed mesh gradient blobs) |
| Navigation Topbar | `rgba(255,255,255,0.75)` | `rgba(15,23,42,0.80)` | [`Layout.jsx`](src/components/Layout.jsx), [`navigation.css`](src/styles/navigation.css) | `bg-white/75 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/80 dark:border-white/10` |
| Standard Glass Card | `rgba(255,255,255,0.62)` | `rgba(255,255,255,0.055)` | [`Dashboard.jsx`](src/pages/Dashboard.jsx), [`Alerts.jsx`](src/pages/Alerts.jsx), [`FishInfo.jsx`](src/pages/FishInfo.jsx) | `bg-white/60 dark:bg-slate-800/40 backdrop-blur-md border border-white/40 dark:border-white/10 shadow-xl rounded-2xl` |
| Tank Card Body | `rgba(255,255,255,0.72)` | `rgba(8,15,26,0.88)` | [`Dashboard.jsx`](src/pages/Dashboard.jsx), [`FishInfo.jsx`](src/pages/FishInfo.jsx) | `bg-white/72 dark:bg-[rgba(8,15,26,0.88)] backdrop-blur-[20px] rounded-[20px]` |
| Modal & Drawer Overlay | `rgba(0,0,0,0.50)` | `rgba(0,0,0,0.60)` | [`FishInfo.jsx`](src/pages/FishInfo.jsx), [`Profile.jsx`](src/pages/Profile.jsx) | `bg-black/50 backdrop-blur-sm z-[200]` |

---

## 3. Sensor Telemetry Accents & Gauge Colors

| Parameter | Accent Hex | Light Tint | Dark Tint | Unit | Component & File Paths |
| --------- | ---------- | ---------- | --------- | ---- | ---------------------- |
| Temperature | `#f97316` (Orange 500) | `rgba(251,146,60,0.12)` | `rgba(251,146,60,0.08)` | °C | [`SensorGauge.jsx`](src/components/SensorGauge.jsx), [`FishInfo.jsx`](src/pages/FishInfo.jsx) |
| pH Level | `#a855f7` (Purple 500) | `rgba(192,132,252,0.12)` | `rgba(192,132,252,0.08)` | pH | [`SensorGauge.jsx`](src/components/SensorGauge.jsx), [`FishInfo.jsx`](src/pages/FishInfo.jsx) |
| TDS (Total Dissolved Solids) | `#0ea5e9` (Sky 500) | `rgba(56,189,248,0.12)` | `rgba(56,189,248,0.08)` | ppm | [`SensorGauge.jsx`](src/components/SensorGauge.jsx), [`FishInfo.jsx`](src/pages/FishInfo.jsx) |
| Turbidity | `#14b8a6` (Teal 500) | `rgba(45,212,191,0.12)` | `rgba(45,212,191,0.08)` | NTU | [`SensorGauge.jsx`](src/components/SensorGauge.jsx), [`FishInfo.jsx`](src/pages/FishInfo.jsx) |
| Water Level | `#3b82f6` (Blue 500) | `rgba(59,130,246,0.12)` | `rgba(59,130,246,0.08)` | % | [`WaterTankLevel.jsx`](src/components/WaterTankLevel.jsx), [`Dashboard.jsx`](src/pages/Dashboard.jsx) |
