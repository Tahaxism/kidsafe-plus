import { Router, type Request, type Response } from 'express';
import { z } from 'zod';

import { openai, CHAT_MODEL } from '../openai';

const ChildSchema = z.object({
  id: z.string(),
  name: z.string(),
});

const Body = z.object({
  parentUid: z.string(),
  childId: z.string().optional(),
  language: z.enum(['fr', 'ar', 'en']),
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string(),
    }),
  ),
  context: z.object({
    children: z.array(ChildSchema),
  }),
});

type Body = z.infer<typeof Body>;

const SYSTEM_PROMPT = (lang: 'fr' | 'ar' | 'en', children: string): string => `
You are KidSafe+, a parental control assistant. The parent talks to you in
${lang === 'fr' ? 'French' : lang === 'ar' ? 'Moroccan Darija (Arabic + Latin mix)' : 'English'}.
You understand natural-language commands about screen time, app blocking, web
filtering, schedules, recitation gates, geofences and SOS. You always reply in
the parent's language.

You DO NOT execute actions yourself. Instead, you propose a structured list of
actions that the mobile app will apply on Firestore. Be conservative: never
invent a child id; only use ids from the provided list. If a child is named in
the command, resolve to the matching id; if no child can be resolved, use the
default childId provided by the app or ask a clarifying question.

Available children (id — name):
${children}

Action kinds you may emit:
- "block_app"          payload: { childId, packageName?, name }
- "block_category"     payload: { childId, name: "games"|"social"|"video"|"chat"|"music"|"safe_search" }
- "block_schedule"     payload: { childId, daysOfWeek: number[], start: "HH:mm", end: "HH:mm", target?: string }
- "unblock_app"        payload: { childId, packageName?, name }
- "screen_time_limit"  payload: { childId, dailyLimitMinutes: number }
- "require_recitation" payload: { childId } + recitationText (string), recitationMinScore (number 0-100)
- "web_blocklist_add"  payload: { childId, domain }
- "web_blocklist_remove" payload: { childId, domain }
- "bedtime_mode"       payload: { childId, start: "HH:mm", end: "HH:mm" }
- "homework_mode"      payload: { childId, start: "HH:mm", end: "HH:mm" }
- "remote_lock"        payload: { childId, durationMinutes?: number }

You MUST respond with a JSON object matching:
{
  "reply": string,            // friendly natural language confirmation in the parent's language
  "actions": [                // can be empty if you have no concrete action
    {
      "kind": <action kind>,
      "payload": <object>,
      "reason"?: string,      // short rationale, optional
      "recitationText"?: string,
      "recitationMinScore"?: number,
      "expiresAt"?: number    // epoch ms
    }
  ]
}

Important:
- The reply MUST acknowledge what was done, list which child(ren) it applies to,
  and use a checkmark "✅" when an action was applied.
- Match the user's language exactly (French → French, Darija → Darija, English → English).
- If the user asks something ambiguous, set actions=[] and ask a short
  clarifying question in "reply".
- Never include code fences or extra prose around the JSON.
`.trim();

const router = Router();

router.post('/assistant', async (req: Request, res: Response) => {
  const parsed = Body.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid_body', details: parsed.error.format() });
  }
  const body: Body = parsed.data;
  const childList =
    body.context.children.map((c) => `${c.id} — ${c.name}`).join('\n') ||
    '(no children registered yet)';

  try {
    const client = openai();
    const completion = await client.chat.completions.create({
      model: CHAT_MODEL,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT(body.language, childList) },
        ...body.messages.map((m) => ({ role: m.role, content: m.content })),
      ],
    });
    const text = completion.choices[0]?.message?.content ?? '{}';
    let parsedJson: { reply?: string; actions?: unknown[] };
    try {
      parsedJson = JSON.parse(text);
    } catch {
      return res.json({ reply: text, actions: [] });
    }
    return res.json({
      reply: parsedJson.reply ?? '',
      actions: Array.isArray(parsedJson.actions) ? parsedJson.actions : [],
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'assistant_failed';
    return res.status(500).json({ error: msg });
  }
});

export default router;
