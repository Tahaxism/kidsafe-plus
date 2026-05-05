import { Router, type Request, type Response } from 'express';
import { z } from 'zod';

import { openai, SMALL_MODEL } from '../openai';

const Body = z.object({
  expectedText: z.string().min(1).max(8000),
  transcript: z.string().min(0).max(8000),
  language: z.enum(['fr', 'ar', 'en']).optional(),
});

const router = Router();

const SYSTEM = `
You score how well a child recited a given text out loud. The recording was
already transcribed by Whisper, so you receive (a) the expected text and (b)
the transcript. Children make small mistakes; tolerate minor pronunciation
errors, dialectal variation, and missing diacritics. For Arabic / Quranic
recitation, ignore tashkeel differences and small letter substitutions.

Reply with strict JSON:
{
  "score": 0..100,           // overall accuracy
  "passed": true|false,      // true if score >= 80
  "notes": "<one sentence>"  // short feedback in the same language as the expected text
}
`.trim();

router.post('/score', async (req: Request, res: Response) => {
  const parsed = Body.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid_body' });
  }
  const { expectedText, transcript } = parsed.data;

  // If transcript is empty, fail fast without an LLM call.
  if (!transcript.trim()) {
    return res.json({
      score: 0,
      passed: false,
      notes: 'No speech detected in the recording.',
    });
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
          content: `Expected:\n${expectedText}\n\nTranscript:\n${transcript}`,
        },
      ],
    });
    const text = completion.choices[0]?.message?.content ?? '{}';
    let json: Record<string, unknown>;
    try {
      json = JSON.parse(text);
    } catch {
      json = { score: 0, passed: false, notes: 'parse_failed' };
    }
    const score = Math.max(
      0,
      Math.min(100, Math.round(Number(json.score) || 0)),
    );
    return res.json({
      score,
      passed: typeof json.passed === 'boolean' ? json.passed : score >= 80,
      notes: typeof json.notes === 'string' ? json.notes : '',
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'score_failed';
    return res.status(500).json({ error: msg });
  }
});

export default router;
