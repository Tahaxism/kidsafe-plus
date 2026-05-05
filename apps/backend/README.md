# KidSafe+ Backend

API proxy that keeps OpenAI / Whisper / Firebase Admin keys off the mobile app.

## Endpoints

| Method | Path                | Purpose                                                |
| ------ | ------------------- | ------------------------------------------------------ |
| GET    | `/health`           | Liveness + config status                               |
| POST   | `/ai/assistant`     | Multi-turn parental assistant (returns reply + actions)|
| POST   | `/ai/classify`      | Cyberbullying / harm classifier on a piece of text     |
| POST   | `/ai/score`         | Score a recitation transcript vs. expected text        |
| POST   | `/ai/transcribe`    | Whisper transcription (multipart/form-data, "audio")   |
| POST   | `/notifications/push` | Send FCM push to one or more device tokens           |

## Local dev

```bash
cp .env.example .env
# Fill OPENAI_API_KEY at minimum.
npm install
npm run dev
# server listens on :8787
```

Smoke test:

```bash
curl http://localhost:8787/health
```

## Deploy to Render (free)

1. Push the monorepo to GitHub.
2. Go to https://dashboard.render.com → **New +** → **Blueprint** → connect the
   repo. Render auto-detects [`apps/backend/render.yaml`](./render.yaml).
3. In the service's **Environment** tab, set:
   - `OPENAI_API_KEY` (required)
   - `FIREBASE_PROJECT_ID` (optional, for FCM push)
   - `FIREBASE_SERVICE_ACCOUNT_BASE64` (optional, for FCM push) —
     `base64 -w0 firebase-service-account.json`
4. Hit **Manual Deploy → Deploy latest commit** if it doesn't kick off
   automatically.
5. Note the public URL; paste it into `apps/mobile/app.json`
   under `extra.apiBaseUrl`.

## Architecture

- `src/index.ts` — Express bootstrap, CORS, helmet, rate-limit, route mounting.
- `src/openai.ts` — Lazily-initialised OpenAI client. Uses `OPENAI_API_KEY`.
- `src/firebase.ts` — Optional Firebase Admin (for FCM only).
- `src/routes/assistant.ts` — `gpt-4o` chat with strict-JSON tool output.
- `src/routes/classify.ts` — `gpt-4o-mini` cyberbullying classifier.
- `src/routes/score.ts` — `gpt-4o-mini` recitation scorer (0–100, pass at 80).
- `src/routes/transcribe.ts` — Whisper transcription (multipart upload).
- `src/routes/push.ts` — FCM multicast push.

Rate limit defaults to 60 requests / IP / minute. Adjust via
`RATE_LIMIT_PER_MIN`.
