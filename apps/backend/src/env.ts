import 'dotenv/config';

export const env = {
  port: Number(process.env.PORT ?? 8787),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  openaiKey: process.env.OPENAI_API_KEY ?? '',
  // Optional: override the OpenAI base URL to point at an OpenAI-compatible
  // aggregator (e.g. https://api.llmapi.ai/v1). When unset we use OpenAI's
  // default. Some aggregators don't support audio transcription — that's why
  // the /ai/transcribe route checks `hasNativeOpenAi()` separately.
  openaiBaseUrl: process.env.OPENAI_BASE_URL ?? '',
  // Optional model overrides
  chatModel: process.env.CHAT_MODEL ?? 'gpt-4o',
  smallModel: process.env.SMALL_MODEL ?? 'gpt-4o-mini',
  transcribeModel: process.env.TRANSCRIBE_MODEL ?? 'whisper-1',
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID ?? '',
  firebaseServiceAccountBase64:
    process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 ?? '',
  corsOrigins: (process.env.CORS_ORIGINS ?? '*')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  rateLimitPerMin: Number(process.env.RATE_LIMIT_PER_MIN ?? 60),
};

// Accept any non-empty key — official OpenAI keys start with `sk-` but
// aggregators (llmapi.ai, OpenRouter, Together…) use their own prefixes.
export const hasOpenAi = (): boolean => env.openaiKey.length > 0;

// True only when the configured endpoint is OpenAI's own (so audio routes
// like Whisper are guaranteed to work).
export const hasNativeOpenAi = (): boolean =>
  env.openaiKey.startsWith('sk-') &&
  (env.openaiBaseUrl === '' ||
    env.openaiBaseUrl.startsWith('https://api.openai.com'));
export const hasFirebaseAdmin = (): boolean =>
  Boolean(env.firebaseProjectId && env.firebaseServiceAccountBase64);
