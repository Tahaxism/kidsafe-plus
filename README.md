# KidSafe+ 🛡️

A modern, multilingual (French / Darija / English) parental-control mobile app
for Android, with an AI assistant, voice-recitation unlock gate, cyberbullying
detection, screen-time limits, app blocking, web filtering, location tracking
and SOS.

> **Status:** Milestone 1 (skeleton + auth + AI + recitation + dashboards) —
> see [TESTING_GUIDE.md](./docs/TESTING_GUIDE.md) for what works today and
> what's stubbed pending native modules / extra credentials.

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

### Milestone 2 (next, requires native Android modules)

- [ ] Native module: Android **PACKAGE_USAGE_STATS** to surface per-app usage
      and enforce the daily limit.
- [ ] Native module: **Accessibility Service** overlay to block apps in real
      time.
- [ ] Native module: **DevicePolicyManager** for the remote-lock action.
- [ ] Native module: **SMS / NotificationListenerService** to feed messages
      into the cyberbullying classifier.
- [ ] In-app browser (`react-native-webview`) with domain blocklist + LLM
      fallback for unknown domains.
- [ ] Background location service writing to `locations/`.
- [ ] FCM push wired up end-to-end (token registration + background handler).
- [ ] Geofence enter/exit alerts.
- [ ] Voice input on the parent AI assistant (currently text-only).
- [ ] Reward system + nightly daily-report job.

> Why split? Android-platform integrations need a custom dev-client build and
> careful permission UX, and they're easier to iterate on once you can confirm
> the JS layer works on your device.

---

## License

MIT.
