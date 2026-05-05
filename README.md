# KidSafe+ 🛡️

A modern, multilingual (French / Darija / English) parental-control mobile app
for Android, with an AI assistant, voice-recitation unlock gate, cyberbullying
detection, screen-time limits, app blocking, web filtering, location tracking
and SOS.

> **Status:** Milestones 1 + 2 + 3 merged. Native Android enforcement
> (UsageStats, DeviceAdmin lock, AccessibilityService app-blocker), in-app
> safe browser, voice input on the AI assistant, background location, FCM
> push, daily reports, real installed-apps list, and screen-time auto-lock
> are all wired in. See [TESTING_GUIDE.md](./docs/TESTING_GUIDE.md) for the
> per-feature walkthrough.

This repo replaces the legacy 2019 Java prototype at
[xMansour/KidSafe](https://github.com/xMansour/KidSafe). The old codebase
targeted `compileSdkVersion 28` with deprecated APIs and a broken login flow,
so we rebuilt on a modern stack.

---

## Stack

- **Mobile:** Bare React Native + Expo modules (managed via EAS Build),
  TypeScript, react-navigation, zustand, react-i18next, Firebase JS SDK,
  Expo AV / Location / Notifications / Secure-Store.
- **Backend:** Node.js + Express on Render (free tier). Acts as an API proxy
  so `OPENAI_API_KEY` and Firebase Admin credentials never ship in the APK.
- **AI:** OpenAI `gpt-4o` (parent assistant) + `gpt-4o-mini` (cyberbullying
  classifier + recitation scorer) + `whisper-1` (transcription).
- **Data:** Firebase Auth (parent) + Firestore (rules, alerts, recitations,
  locations) + Cloud Storage + FCM.

---

## Repository layout

```
kidsafe-plus/
├── apps/
│   ├── mobile/         # React Native (Expo + bare) Android-first app
│   └── backend/        # Express API proxy → deploy to Render
├── docs/
│   ├── FIREBASE_SETUP.md   # Step-by-step Firebase project creation
│   └── TESTING_GUIDE.md    # How to build, sideload and test each feature
├── firestore.rules     # Production-mode Firestore security rules
└── README.md
```

---

## Quick start

### 1. Backend (10 min)

```bash
cd apps/backend
cp .env.example .env
# Set OPENAI_API_KEY in .env (other vars optional for local dev)
npm install
npm run dev
# → http://localhost:8787/health
```

Deploy to Render with one click via the included
[`render.yaml`](./apps/backend/render.yaml). See
[apps/backend/README.md](./apps/backend/README.md) for details.

### 2. Firebase

Follow [docs/FIREBASE_SETUP.md](./docs/FIREBASE_SETUP.md) end-to-end. It walks
you through creating the project, registering both an Android app and a Web
app, enabling Auth/Firestore/Storage/FCM, and pasting the credentials into
`apps/mobile/app.json`.

### 3. Mobile

```bash
cd apps/mobile
npm install

# Edit app.json → extra.apiBaseUrl to your Render URL.
# Edit app.json → extra.firebase.* with your Firebase Web SDK config.
# Place google-services.json at apps/mobile/google-services.json.

# One-time: log in to Expo / EAS
npx eas login
npx eas init --id <new-project-id>   # auto-fills app.json extra.eas.projectId

# Build a sideloadable APK with the dev client (needed once):
npx eas build --profile development --platform android

# Then run the JS bundle against your physical device:
npm run start
# Scan the QR or press 'a'; the dev-client APK on your phone connects to Metro.
```

> **Note:** This is a *bare* RN project (uses native Android modules). It will
> NOT run in Expo Go — you must use the dev-client APK from `eas build`.

---

## Features

### Implemented in milestone 1

- [x] **Multilingual UI** (French default, Darija RTL, English fallback) with
      runtime language switching and persistence.
- [x] **Parent auth** (Firebase email/password) with persisted session.
- [x] **Child PIN auth** (4-digit per-child PIN; stored hashed in Firestore).
- [x] **Multi-child profiles** — one parent can manage many children, switch
      between them on the dashboard.
- [x] **Parent dashboard** with today's screen-time bar, recent alerts feed,
      and quick tiles to all features.
- [x] **AI assistant chat** — natural-language commands in fr/ar/en. The LLM
      emits structured JSON actions which the app applies as Firestore rules.
- [x] **Recitation gate (child)** — child holds a mic button to record;
      Whisper transcribes, `gpt-4o-mini` scores against the expected text,
      pass-threshold unlocks the gate.
- [x] **Recitation history (parent)** — every attempt logged with score.
- [x] **Cyberbullying classifier endpoint** — backend `/ai/classify`.
- [x] **App-blocking UI** — toggle blocks for popular Android apps.
      (Native enforcement via Accessibility Service is in milestone 2.)
- [x] **Web filter UI** — domain blocklist with starter list + safe-search
      toggle. (In-app browser comes in milestone 2.)
- [x] **Screen-time UI** — daily limit, bedtime mode, homework mode toggles.
- [x] **Location list view** — shows location pings written by the child app.
      (Map view stubbed; needs Google Maps key.)
- [x] **SOS button** — child sends a high-severity alert with current GPS
      location.
- [x] **Alerts feed** — all alert types unified, sorted by recency, mark as
      read.
- [x] **Settings + language picker + backend status** indicator.
- [x] **Firestore security rules** scoped to `parentUid` ownership.

### Added in milestone 2

- [x] Local Expo Module **`modules/kidsafe-native/`** (Kotlin):
      - `getTodayUsage()` via `UsageStatsManager` — per-app foreground time.
      - `getInstalledApps()` via `PackageManager` (launcher query).
      - `requestDeviceAdmin()` / `lockNow()` via `DevicePolicyManager`.
      - `setBlockedPackages()` synced to a custom `AccessibilityService`
        that pushes the user back to the launcher when a blocked package
        comes to foreground.
      - Overlay & boot helpers.
- [x] **Native Permissions** parent screen — one-tap setup with live status
      pills for Usage Access / Device Admin / Accessibility / Overlay.
- [x] **In-app safe browser** (`react-native-webview`) with deny-list
      pre-check, LLM classifier fallback, safe-search injection, and
      `web_history` writes.
- [x] **Voice input on the AI assistant** — press-and-hold mic uses
      on-device Android `SpeechRecognizer` (free, offline-capable). Whisper
      stays as a fallback for when a real OpenAI key is available.
- [x] **Background location** + geofence enter/exit alerts via Expo
      `TaskManager`.
- [x] **FCM push end-to-end** — mobile registers token at
      `parents/{uid}/devices/{token}`; backend dispatches via
      `/notifications/push` and `/report/send`.
- [x] **Bedtime / homework / reward / remote-lock** rule kinds with banners
      on the child home and parent quick actions ("Lock now", "+15 min").
- [x] **Daily report** endpoint — `GET /report/daily?childId=...&date=...`
      and `POST /report/send`.

### Added in milestone 3

- [x] Child device posts daily per-app usage to Firestore `usage/`
      (powers the `/report/daily` aggregate).
- [x] Child app reads used minutes from native every minute and triggers
      `Native.lockNow()` once when the daily limit + reward bonus is
      exceeded.
- [x] App-blocking screen surfaces the **real** installed-apps list from
      the child device (falls back to a curated list when running outside
      the device).
- [x] Backend `/report/*` and `/notifications/*` are now authenticated:
      mobile attaches a Firebase ID token in `Authorization`, backend
      verifies it with the Admin SDK and re-checks ownership of the
      `childId`. Rate limiter applied.
- [x] Firestore rules updated for `parents/{uid}/devices`, `web_history`,
      and `usage` subcollections.

### Backlog

- [ ] Native SMS receiver + classifier wiring (cyberbullying alerts on
      incoming SMS). Needs `READ_SMS` / `RECEIVE_SMS` and a dedicated
      `BroadcastReceiver`. Restricted by Play Store outside Family/MDM.
- [ ] Map view for location (currently a list) — needs a Google Maps SDK
      key.
- [ ] Native auto-lock window for bedtime/homework (currently the banners
      show but enforcement is via screen-time cap only).
- [ ] Switching the child PIN auth flow to Firebase Custom Tokens so
      Firestore writes from the child device get scoped properly.

---

## License

MIT.
