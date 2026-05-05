import { api } from './api';
import type { Rule } from '@/types';

export interface AssistantTurnRequest {
  parentUid: string;
  childId?: string;
  // Multi-turn history for context
  messages: { role: 'user' | 'assistant'; content: string }[];
  language: 'fr' | 'ar' | 'en';
  // Available children so the AI can resolve "mon fils" to a child id
  context: {
    children: { id: string; name: string }[];
  };
}

export interface AssistantAction {
  kind: Rule['kind'];
  payload: Record<string, unknown>;
  reason?: string;
  recitationText?: string;
  recitationMinScore?: number;
  expiresAt?: number;
}

export interface AssistantTurnResponse {
  reply: string;
  actions: AssistantAction[];
}

export const askAssistant = async (
  req: AssistantTurnRequest,
): Promise<AssistantTurnResponse> => {
  const res = await api.post<AssistantTurnResponse>('/ai/assistant', req);
  return res.data;
};

export interface ClassifyMessageRequest {
  text: string;
  language?: 'fr' | 'ar' | 'en' | 'auto';
}
export interface ClassifyMessageResponse {
  flagged: boolean;
  category: 'safe' | 'bullying' | 'sexual' | 'violence' | 'self_harm' | 'other';
  severity: 'low' | 'medium' | 'high';
  reason: string;
}

export const classifyMessage = async (
  req: ClassifyMessageRequest,
): Promise<ClassifyMessageResponse> => {
  const res = await api.post<ClassifyMessageResponse>('/ai/classify', req);
  return res.data;
};

export interface ScoreRecitationRequest {
  expectedText: string;
  transcript: string;
  language?: 'fr' | 'ar' | 'en';
}
export interface ScoreRecitationResponse {
  score: number; // 0-100
  passed: boolean;
  notes: string;
}

export const scoreRecitation = async (
  req: ScoreRecitationRequest,
): Promise<ScoreRecitationResponse> => {
  const res = await api.post<ScoreRecitationResponse>('/ai/score', req);
  return res.data;
};
