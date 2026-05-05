import { Router, type Response } from 'express';

import { hasFirebaseAdmin, env } from '../env';
import { firebaseAdmin } from '../firebase';
import {
  requireParent,
  assertOwnsChild,
  type AuthedRequest,
} from '../middleware/auth';

const router = Router();
router.use(requireParent);

interface DailyReport {
  childId: string;
  date: string; // YYYY-MM-DD
  totalScreenMin: number;
  topApps: Array<{ name: string; minutes: number }>;
  alerts: number;
  recitations: { passed: number; failed: number };
  blockedSites: number;
}

const todayUTC = (): string => new Date().toISOString().slice(0, 10);

// GET /report/daily?childId=xxx&date=YYYY-MM-DD
// Aggregates Firestore documents and returns a JSON daily summary.
// Requires Authorization: Bearer <Firebase ID token> for the parent who owns
// the child.
router.get('/daily', async (req: AuthedRequest, res: Response) => {
  if (!hasFirebaseAdmin()) {
    return res.status(503).json({ error: 'firebase_admin_not_configured' });
  }
  const childId = String(req.query.childId ?? '');
  const date = String(req.query.date ?? todayUTC());
  if (!childId) return res.status(400).json({ error: 'missing_childId' });
  if (!req.parentUid || !(await assertOwnsChild(req.parentUid, childId))) {
    return res.status(403).json({ error: 'forbidden' });
  }

  try {
    const db = firebaseAdmin().firestore();
    const dayStart = Date.parse(`${date}T00:00:00Z`);
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;

    // Usage samples (one per day per child)
    const usageSnap = await db
      .collection('usage')
      .where('childId', '==', childId)
      .where('date', '==', date)
      .limit(1)
      .get();
    const usage = usageSnap.docs[0]?.data() as
      | {
          totalMinutes?: number;
          perAppMinutes?: Record<string, number>;
        }
      | undefined;
    const perApp = usage?.perAppMinutes ?? {};
    const topApps = Object.entries(perApp)
      .map(([name, minutes]) => ({ name, minutes }))
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, 5);

    // Alerts in window
    const alertsSnap = await db
      .collection('alerts')
      .where('childId', '==', childId)
      .where('createdAt', '>=', dayStart)
      .where('createdAt', '<', dayEnd)
      .get();

    // Recitations in window
    const reciteSnap = await db
      .collection('recitations')
      .where('childId', '==', childId)
      .where('createdAt', '>=', dayStart)
      .where('createdAt', '<', dayEnd)
      .get();
    let passed = 0;
    let failed = 0;
    reciteSnap.forEach((d) => {
      const data = d.data() as { passed?: boolean };
      if (data.passed) passed++;
      else failed++;
    });

    // Blocked sites
    const blockedSnap = await db
      .collection('web_history')
      .where('childId', '==', childId)
      .where('allowed', '==', false)
      .where('ts', '>=', dayStart)
      .where('ts', '<', dayEnd)
      .get();

    const out: DailyReport = {
      childId,
      date,
      totalScreenMin: usage?.totalMinutes ?? 0,
      topApps,
      alerts: alertsSnap.size,
      recitations: { passed, failed },
      blockedSites: blockedSnap.size,
    };
    return res.json(out);
  } catch (e) {
    return res
      .status(500)
      .json({ error: e instanceof Error ? e.message : 'report_failed' });
  }
});

// POST /report/send  { childId, date? }
// Looks up the authenticated parent's FCM tokens and sends a push with the
// daily summary. parentUid is taken from the verified Firebase ID token, not
// from the request body.
router.post('/send', async (req: AuthedRequest, res: Response) => {
  if (!hasFirebaseAdmin()) {
    return res.status(503).json({ error: 'firebase_admin_not_configured' });
  }
  const parentUid = req.parentUid;
  const childId = String(req.body?.childId ?? '');
  const date = String(req.body?.date ?? todayUTC());
  if (!parentUid || !childId) {
    return res.status(400).json({ error: 'missing_params' });
  }
  if (!(await assertOwnsChild(parentUid, childId))) {
    return res.status(403).json({ error: 'forbidden' });
  }

  try {
    const db = firebaseAdmin().firestore();
    // Reuse the GET handler's logic by calling it locally would be nice, but
    // simpler to compute here.
    const usageSnap = await db
      .collection('usage')
      .where('childId', '==', childId)
      .where('date', '==', date)
      .limit(1)
      .get();
    const usage = usageSnap.docs[0]?.data() as
      | { totalMinutes?: number }
      | undefined;
    const dayStart = Date.parse(`${date}T00:00:00Z`);
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;
    const alertsSnap = await db
      .collection('alerts')
      .where('childId', '==', childId)
      .where('createdAt', '>=', dayStart)
      .where('createdAt', '<', dayEnd)
      .get();

    const total = usage?.totalMinutes ?? 0;
    const alerts = alertsSnap.size;

    // Look up parent device tokens (subcollection: parents/{uid}/devices)
    const tokSnap = await db
      .collection('parents')
      .doc(parentUid)
      .collection('devices')
      .get();
    const tokens = tokSnap.docs
      .map((d) => (d.data() as { token?: string }).token)
      .filter((t): t is string => Boolean(t));

    if (tokens.length === 0) {
      return res.json({ sent: 0, totalMinutes: total, alerts });
    }

    const messaging = firebaseAdmin().messaging();
    const result = await messaging.sendEachForMulticast({
      tokens,
      notification: {
        title: `KidSafe+ — ${date}`,
        body: `${Math.round(total)} min d'écran · ${alerts} alerte(s)`,
      },
      data: { kind: 'daily_report', childId, date },
    });

    return res.json({
      sent: result.successCount,
      failed: result.failureCount,
      totalMinutes: total,
      alerts,
    });
  } catch (e) {
    return res
      .status(500)
      .json({ error: e instanceof Error ? e.message : 'send_failed' });
  }
});

// Silence eslint about env unused when admin not configured
void env;
export default router;
