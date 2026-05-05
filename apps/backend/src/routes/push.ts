import { Router, type Request, type Response } from 'express';
import { z } from 'zod';

import { firebaseMessaging } from '../firebase';

const Body = z.object({
  tokens: z.array(z.string()).min(1).max(500),
  title: z.string().min(1).max(120),
  body: z.string().max(500).optional().default(''),
  data: z.record(z.string()).optional().default({}),
});

const router = Router();

router.post('/push', async (req: Request, res: Response) => {
  const parsed = Body.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid_body' });
  }
  const messaging = firebaseMessaging();
  if (!messaging) {
    return res.status(503).json({
      error: 'firebase_admin_not_configured',
      hint: 'Set FIREBASE_PROJECT_ID and FIREBASE_SERVICE_ACCOUNT_BASE64 to enable push.',
    });
  }
  try {
    const result = await messaging.sendEachForMulticast({
      tokens: parsed.data.tokens,
      notification: {
        title: parsed.data.title,
        body: parsed.data.body,
      },
      data: parsed.data.data,
      android: {
        priority: 'high',
        notification: {
          channelId: 'default',
          color: '#10B981',
        },
      },
    });
    return res.json({
      success: result.successCount,
      failure: result.failureCount,
      responses: result.responses.map((r) => ({
        success: r.success,
        error: r.error?.code,
      })),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'push_failed';
    return res.status(500).json({ error: msg });
  }
});

export default router;
