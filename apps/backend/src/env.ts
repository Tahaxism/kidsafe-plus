import 'dotenv/config';

export const env = {
  port: Number(process.env.PORT ?? 8787),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  openaiKey: process.env.OPENAI_API_KEY ?? '',
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID ?? '',
  firebaseServiceAccountBase64:
    process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 ?? '',
  corsOrigins: (process.env.CORS_ORIGINS ?? '*')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  rateLimitPerMin: Number(process.env.RATE_LIMIT_PER_MIN ?? 60),
};

export const hasOpenAi = (): boolean => env.openaiKey.startsWith('sk-');
export const hasFirebaseAdmin = (): boolean =>
  Boolean(env.firebaseProjectId && env.firebaseServiceAccountBase64);
