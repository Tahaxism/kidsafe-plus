import OpenAI from 'openai';

import { env, hasOpenAi } from './env';

let _client: OpenAI | null = null;

export const openai = (): OpenAI => {
  if (!hasOpenAi()) {
    throw new Error(
      'OPENAI_API_KEY is not configured on the backend. Add it in your env vars.',
    );
  }
  if (!_client) {
    _client = new OpenAI({ apiKey: env.openaiKey });
  }
  return _client;
};

export const CHAT_MODEL = 'gpt-4o';
export const SMALL_MODEL = 'gpt-4o-mini';
export const TRANSCRIBE_MODEL = 'whisper-1';
