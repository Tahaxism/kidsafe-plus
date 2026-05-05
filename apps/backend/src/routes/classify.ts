import { Router, type Request, type Response } from 'express';
import { z } from 'zod';

import { openai, SMALL_MODEL } from '../openai';

const Body = z.object({
  text: z.string().min(1).max(8000),
  language: z.enum(['fr', 'ar', 'en', 'auto']).optional(),
});

const router = Router();

const SYSTEM = `
You are a content-safety classifier for messages received by a child (e.g. SMS,
chat). Decide if the message is harmful (bullying, sexual content, threats of
violence, self-harm encouragement, or other clearly inappropriate-for-a-minor
content). The message may be in French, English, Arabic, or Moroccan Darija
(possibly mixing scripts and Latin transliteration).

Respond with strict JSON:
{
  "flagged": boolean,
  "category": "safe"|"bullying"|"sexual"|"violence"|"self_harm"|"other",
  "severity": "low"|"medium"|"high",
  "reason": "<one short sentence explaining the decision in English>"
}

Be conservative — false positives are better than missing genuine bullying.
`.trim();

router.post('/classify', async (req: Request, res: Response) => {
  const parsed = Body.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid_body' });
  }
  try {
    const client = openai();
    const completion = await client.chat.completions.create({
      model: SMALL_MODEL,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM },
        {
          role: 'user',
          content: `Message:\n${parsed.data.text}\n\nLanguage hint: ${parsed.data.language ?? 'auto'}`,
        },
      ],
    });
    const text = completion.choices[0]?.message?.content ?? '{}';
    let json: Record<string, unknown>;
    try {
      json = JSON.parse(text);
    } catch {
      json = {
        flagged: false,
        category: 'safe',
        severity: 'low',
        reason: 'parse_failed',
      };
    }
    return res.json({
      flagged: Boolean(json.flagged),
      category: typeof json.category === 'string' ? json.category : 'safe',
      severity: typeof json.severity === 'string' ? json.severity : 'low',
      reason: typeof json.reason === 'string' ? json.reason : '',
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'classify_failed';
    return res.status(500).json({ error: msg });
  }
});

export default router;
