# KidSafe+ Testing Guide

This guide walks you through testing every implemented feature on a physical
Android device. **Use your real phone**, not an emulator — features like
recording, location, and (later) Accessibility Service won't behave correctly
on emulators.

---

## 0. Prerequisites

Before you start:

- ✅ Backend deployed (or running locally) — see
  [`apps/backend/README.md`](../apps/backend/README.md).
- ✅ Firebase project created — see
  [FIREBASE_SETUP.md](./FIREBASE_SETUP.md).
- ✅ `apps/mobile/app.json` updated:
  - `extra.apiBaseUrl` → your Render URL (or `http://<your-PC-LAN-IP>:8787`
    for local backend, accessed from the phone over the same Wi-Fi).
  - `extra.firebase.*` → values from the Firebase Web SDK config.
- ✅ `apps/mobile/google-services.json` is in place.
- ✅ Node 20+, npm, and Android SDK build-tools available.
- ✅ A physical Android phone with **Developer mode + USB debugging** on.

---

## 1. Build & install the dev-client APK

The app is a *bare* React Native project — Expo Go won't work because we need
native Android modules.

```bash
cd apps/mobile
npm install
npx eas login
npx eas init --id <choose-a-name>     # only the first time
npx eas build --profile development --platform android
```

When the build finishes, EAS gives you a download URL. Open it on the phone,
download the APK, and install it (you may need to allow "Install unknown apps"
for your browser).

Then start Metro and connect:

```bash
npm run start
# Open the dev-client app on the phone — it'll connect to Metro automatically
# if the phone is on the same Wi-Fi as your laptop.
```

> **Faster iteration loop:** once the dev client is installed, every JS-only
> change just requires `npm run start` + reload (no rebuild).

---

## 2. Smoke test: app launches in French

1. Open KidSafe+ on the phone.
2. The Welcome screen says **"KidSafe+"**, **"Famille en sécurité…"**, and
   **"Continuer"**. ✅ French is the default language.

If you see English or Arabic, the language detection picked your phone's
locale. Sign in, go to **Settings → Langue**, pick `Français`, and the app
restarts in French.

---

## 3. Parent: sign up & sign in

### Sign up
1. Welcome → **Continuer** → **Parent**.
2. **S'inscrire** tab → enter:
   - Display name: `Test Parent`
   - Email: any real-looking email (e.g. `parent+test1@example.com`)
   - Password: ≥ 6 chars
3. Tap **S'inscrire**.
4. Expected: redirected to the dashboard. Firebase console
   **Authentication → Users** shows the new user. Firestore
   `parents/{uid}` doc is created.

### Sign out & sign back in
1. Bottom-nav → **Réglages** → **Se déconnecter**.
2. Welcome → **Continuer** → **Parent** → **Se connecter**.
3. Enter the same email/password.
4. Expected: lands directly on the dashboard. Session persists across app
   restarts (try killing the app and reopening — should land on dashboard
   without prompting for password).

---

## 4. Parent: add a child & generate PIN

1. Bottom-nav → **Enfants** → **Ajouter un enfant**.
2. Enter a name (e.g. `Youssef`).
3. Tap **Créer**.
4. Expected: a 4-digit PIN is shown in a large box (e.g. `4823`). Write it
   down. Firestore `children/{id}` doc is created with `parentUid` set to
   your account.

Repeat for a second child if you want to test multi-child UX.

---

## 5. Child: log in with PIN

> **Two ways:** (a) install the same APK on a second device for the child, or
> (b) for testing only: use the same device — sign out of the parent and
> "Continue → Enfant".

1. Welcome → **Continuer** → **Enfant**.
2. Type the 4-digit PIN.
3. Expected: lands on the child home screen — large greeting "Bonjour,
   Youssef", time-remaining placeholder, recitation card, SOS button.

---

## 6. Parent AI assistant

> Requires `OPENAI_API_KEY` set on the backend. If `Réglages → Statut du
> serveur` is red, fix that first.

1. Bottom-nav → **IA**.
2. In the input, type:
   > *Bloque YouTube et TikTok jusqu'à ce que Youssef récite la sourate
   > Al-Fatiha.*
3. Tap send.
4. Expected:
   - Spinner for ~3-6 s.
   - Assistant reply confirming the action in French.
   - Two new rules appear in `Enfants → Youssef → Blocage` for YouTube and
     TikTok (toggles ON).
   - A `require_recitation` rule appears with `Al-Fatiha` text and a min
     score of 80.
5. Try in Darija/Arabic:
   > *حد الوقت ديال الألعاب لـ ٤٥ دقيقة.*
   The AI should emit a `screen_time_limit` rule with payload
   `{ minutes: 45 }`.
6. Try in English:
   > *Turn on bedtime from 21:30 to 06:30.*
   Expect a `bedtime_mode` rule.

---

## 7. Child recitation gate

1. On the child device, **Maison** screen → tap the **Récitation** card.
2. The expected text shows on screen.
3. **Hold** the mic button for ~10 s, recite the text out loud, release.
4. Expected:
   - "Analyse en cours…" spinner for ~3-5 s.
   - Score 0-100 + transcript displayed.
   - If score ≥ 80: 🎉 success state, gate unlocks (rule deactivated in
     Firestore), parent sees a `recite_ok` alert.
   - If score < 80: encouragement message + retry button. Parent sees a
     `recite_fail` alert with the transcript and the score.
5. Verify in **Parent → Enfants → Youssef → Récitation**: the attempt is
   logged with timestamp, transcript, score, and pass/fail badge.

> **Tip:** Whisper is excellent at French, very good at Arabic. For Darija
> code-switching, expect occasional transcription errors — the LLM scorer
> tolerates minor mistakes (it's fuzzy on purpose).

---

## 8. Screen time

1. **Parent → Enfants → Youssef → Temps d'écran**.
2. Pick a daily limit chip (e.g. `2 h`).
3. Toggle **Mode coucher** ON, set 21:00–06:30.
4. Toggle **Mode devoirs** ON.
5. Expected: `children/{id}.dailyLimitMinutes`, `bedtimeStart`, `bedtimeEnd`
   updated; corresponding rules created.

> ⚠️ **Native enforcement is in milestone 2.** The settings persist and are
> shown on the child screen, but actual app-locking on the phone needs the
> Accessibility Service module (next milestone).

---

## 9. App blocking & web filter

### App blocking
1. **Parent → Enfants → Youssef → Blocage des apps**.
2. Toggle YouTube + TikTok ON.
3. Expected: two `block_app` rules in Firestore. Child screen shows them
   in "Apps bloquées" list.

### Web filter
1. **Parent → Enfants → Youssef → Filtrage web**.
2. Type `pornhub.com` → **Ajouter**.
3. Toggle **Recherche sécurisée** ON.
4. Expected: `web_blocklist_add` rules created. Built-in browser with
   enforcement is milestone 2.

---

## 10. SOS

1. Child screen → bottom red button **🚨 Urgence**.
2. Confirm in the dialog.
3. Expected: high-severity alert created with kind `sos`, includes GPS coords
   if Location permission was granted on first launch. Parent **Alertes**
   feed shows it at the top with a red badge.

---

## 11. Settings

- **Statut du serveur**: green dot + parent's email = backend OK.
- **Langue → عربية**: app switches to Arabic with RTL layout. Switch back to
  Français.
- **Se déconnecter**: returns to welcome screen, session cleared.

---

## 12. Firestore data sanity check

In the Firebase console **Firestore → Data**:

```
parents/{your-uid}      ← your parent profile
children/{cid}          ← Youssef
rules/{rid}             ← active rules, scoped to childId=cid
alerts/{aid}            ← SOS, recitation events
recitations/{recid}     ← every recitation attempt
```

Try reading from the wrong account — the security rules in
`firestore.rules` should reject it.

---

## 13. Known limitations (this milestone)

| Feature | Status | Why |
|---|---|---|
| Real screen-time enforcement | ⏳ Milestone 2 | Needs `PACKAGE_USAGE_STATS` + Accessibility Service native module. |
| Real app blocking | ⏳ Milestone 2 | Same as above. |
| Remote device lock | ⏳ Milestone 2 | Needs `DevicePolicyManager` device-admin native module + first-run permission flow. |
| In-app safe browser | ⏳ Milestone 2 | Needs `react-native-webview` + URL classifier. |
| SMS cyberbullying scan | ⏳ Milestone 2 | Needs `READ_SMS` + `NotificationListenerService`. Restricted by Play Store. |
| Voice input on assistant | ⏳ Milestone 2 | Currently text-only. Whisper round-trip same as recitation gate. |
| Map view for location | ⏳ Needs Google Maps key | List view works; map view will appear when you provide a Maps SDK key. |
| Geofencing | ⏳ Milestone 2 | Needs background location service + FCM. |
| FCM push notifications | 🟡 Backend route ready | Mobile doesn't yet register a token. Wires up in M2. |
| Bedtime / homework auto-lock | 🟡 UI + rule, no enforcement | Needs M2 native modules. |

---

## 14. Troubleshooting

**App boots in English even though phone is in French**
Settings → Langue → Français.

**`Réglages → Statut du serveur` is red**
- Backend not running or wrong URL in `app.json` `extra.apiBaseUrl`.
- If using local backend, the phone must be on the same Wi-Fi *and* you need
  to use the laptop's LAN IP, not `localhost`.

**AI assistant returns "Erreur"**
- `OPENAI_API_KEY` not set on the backend.
- Hit `/health` from the phone's browser (`{apiBaseUrl}/health`) — it should
  show `"openai": true`.

**Recitation always scores 0**
- Microphone permission denied. Check Android **Settings → Apps → KidSafe+ →
  Permissions**.

**Firestore writes fail**
- Rules in `firestore.rules` not deployed. Open Firebase console →
  Firestore → Rules → paste from this repo → Publish.

**App crashes on launch**
- Open `adb logcat` and look for `ReactNative` lines. Most common cause:
  `extra.firebase.apiKey` not set in `app.json`.

If something else breaks, capture `adb logcat -s ReactNativeJS:V` output and
open an issue.
