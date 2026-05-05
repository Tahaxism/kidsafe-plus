# Firebase setup — KidSafe+

This guide walks you through creating a fresh Firebase project for KidSafe+
and wiring it into both the **mobile app** and the **backend proxy**.

You only need to do this once.

---

## 1. Create the Firebase project

1. Open https://console.firebase.google.com/.
2. Click **Add project** → name it `KidSafe Plus` (project ID like
   `kidsafe-plus-XXXX` — anything you like).
3. **Disable Google Analytics** when prompted (it's not used by this app — you
   can re-enable later if you want).
4. Wait for provisioning, then click **Continue**.

---

## 2. Add an Android app to the project

1. In the project overview, click the **Android** icon (`</>` next to it is web,
   we want the green Android icon).
2. **Android package name**: `ma.kidsafe.plus`
   (must match `expo.android.package` in `apps/mobile/app.json`).
3. **App nickname**: `KidSafe+ Android` (anything).
4. **Debug signing certificate SHA-1**: leave blank for now — you'll add it
   later if you want Google Sign-In or App Check. Not required for email/pwd
   auth, Firestore, FCM.
5. Click **Register app**.
6. **Download `google-services.json`** and place it at:
   ```
   apps/mobile/google-services.json
   ```
   (The file is gitignored. The Expo build system picks it up automatically.)
7. Skip the "Add Firebase SDK" code snippets — Expo handles that.
8. Click **Next → Next → Continue to console**.

---

## 3. Add a Web app to the project (for Firebase JS SDK)

The mobile app uses the Firebase JS SDK for Auth + Firestore + Storage (FCM
goes through native channels via Expo notifications). You need Web app
credentials.

1. In the project overview, click the `</>` **Web** icon.
2. **App nickname**: `KidSafe+ Mobile` (anything).
3. **Do NOT** tick "Set up Firebase Hosting".
4. Click **Register app**.
5. Copy the `firebaseConfig` object Firebase shows. It looks like:
   ```js
   const firebaseConfig = {
     apiKey: "AIza…",
     authDomain: "kidsafe-plus-xxxx.firebaseapp.com",
     projectId: "kidsafe-plus-xxxx",
     storageBucket: "kidsafe-plus-xxxx.appspot.com",
     messagingSenderId: "123456789012",
     appId: "1:123456789012:web:abcdef1234"
   };
   ```
6. Paste those values into `apps/mobile/app.json` under `extra.firebase`:
   ```json
   "extra": {
     "firebase": {
       "apiKey": "AIza…",
       "authDomain": "kidsafe-plus-xxxx.firebaseapp.com",
       "projectId": "kidsafe-plus-xxxx",
       "storageBucket": "kidsafe-plus-xxxx.appspot.com",
       "messagingSenderId": "123456789012",
       "appId": "1:123456789012:web:abcdef1234"
     }
   }
   ```

---

## 4. Enable services

In the Firebase console left sidebar:

### Authentication
1. **Build → Authentication → Get started**.
2. **Sign-in method** tab → enable **Email/Password** → **Save**.
   (PIN-based child login is handled inside the app — children don't have
   Firebase Auth accounts; only parents do.)

### Firestore Database
1. **Build → Firestore Database → Create database**.
2. **Production mode** (we'll add rules below) → choose location closest to
   you (`europe-west` for Morocco).
3. Click **Enable**.
4. Open the **Rules** tab and replace contents with the rules in
   `firestore.rules` at the repo root, then **Publish**.

### Cloud Storage
1. **Build → Storage → Get started**.
2. **Production mode** → same location as Firestore → **Done**.

### Cloud Messaging (FCM)
1. **Engage → Messaging** — no setup needed. FCM uses the Android app you
   already registered.
2. **Project Settings → Cloud Messaging** tab — confirm **Firebase Cloud
   Messaging API (V1)** is **Enabled**. If you see "Disable" you're good.

---

## 5. Service account for the backend (for FCM push only)

The backend needs a service account to send pushes via FCM. **Skip this section
if you don't want push notifications yet — every other feature works without
it.**

1. **Project Settings → Service accounts → Generate new private key** →
   **Generate key**. A JSON file downloads.
2. Convert it to a single-line base64 string:
   ```bash
   base64 -w0 ~/Downloads/kidsafe-plus-firebase-adminsdk.json > sa.b64
   ```
3. In your Render dashboard for the backend service, set env vars:
   - `FIREBASE_PROJECT_ID` = `kidsafe-plus-xxxx`
   - `FIREBASE_SERVICE_ACCOUNT_BASE64` = paste the contents of `sa.b64`

For local dev, put the same vars in `apps/backend/.env`.

---

## 6. Create the first parent account

Once the mobile app is built and you've signed in:

```
Open KidSafe+ → Continue → Parent → Sign up → enter email + password.
```

This creates a row in **Authentication → Users** and a document in
`parents/{uid}` in Firestore.

Then in the app: **Children tab → Add child → enter name → Generate PIN**.
Note the 4-digit PIN and use it on the child device.

---

## 7. Verify

Quick checks:

- **Authentication → Users** lists your parent.
- **Firestore → Data** shows `parents/{uid}` and `children/{id}`.
- The app's **Settings → Backend status** shows 🟢 OK and the parent's email.

If anything fails, see [TESTING_GUIDE.md](./TESTING_GUIDE.md).
