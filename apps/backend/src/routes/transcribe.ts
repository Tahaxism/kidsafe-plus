import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import * as fs from 'node:fs';

import { openai, TRANSCRIBE_MODEL } from '../openai';

const upload = multer({
  storage: multer.diskStorage({}),
  limits: { fileSize: 25 * 1024 * 1024 }, // Whisper limit
});

const router = Router();

router.post(
  '/transcribe',
  upload.single('audio'),
  async (req: Request, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ error: 'no_audio' });
    }
    const language = (req.body.language as string | undefined) ?? undefined;
    try {
      const client = openai();
      const result = await client.audio.transcriptions.create({
        model: TRANSCRIBE_MODEL,
        file: fs.createReadStream(req.file.path),
        language: language && language !== 'auto' ? language : undefined,
      });
      return res.json({
        text: result.text,
        language: language ?? 'auto',
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'transcribe_failed';
      return res.status(500).json({ error: msg });
    } finally {
      // Clean up the temp file
      fs.promises.unlink(req.file.path).catch(() => undefined);
    }
  },
);

export default router;
