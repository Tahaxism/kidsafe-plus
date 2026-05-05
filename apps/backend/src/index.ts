import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

import { env, hasOpenAi, hasFirebaseAdmin } from './env';
import assistantRouter from './routes/assistant';
import classifyRouter from './routes/classify';
import scoreRouter from './routes/score';
import transcribeRouter from './routes/transcribe';
import pushRouter from './routes/push';

const app = express();

app.set('trust proxy', 1);
app.use(helmet());
app.use(compression());
app.use(
  cors({
    origin:
      env.corsOrigins.includes('*') || env.corsOrigins.length === 0
        ? true
        : env.corsOrigins,
    credentials: false,
  }),
);
app.use(express.json({ limit: '1mb' }));
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

const limiter = rateLimit({
  windowMs: 60_000,
  max: env.rateLimitPerMin,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/ai', limiter);

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    ok: true,
    env: env.nodeEnv,
    openai: hasOpenAi(),
    firebaseAdmin: hasFirebaseAdmin(),
    time: new Date().toISOString(),
  });
});

app.use('/ai', assistantRouter);
app.use('/ai', classifyRouter);
app.use('/ai', scoreRouter);
app.use('/ai', transcribeRouter);
app.use('/notifications', pushRouter);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'not_found' });
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  // eslint-disable-next-line no-console
  console.error('[error]', err);
  const msg = err instanceof Error ? err.message : 'internal_error';
  res.status(500).json({ error: msg });
});

app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`KidSafe+ backend listening on :${env.port} (${env.nodeEnv})`);
  // eslint-disable-next-line no-console
  console.log(
    `  OpenAI: ${hasOpenAi() ? 'configured' : 'NOT configured (AI routes will fail)'}`,
  );
  // eslint-disable-next-line no-console
  console.log(
    `  Firebase Admin: ${hasFirebaseAdmin() ? 'configured' : 'NOT configured (push will fail)'}`,
  );
});
