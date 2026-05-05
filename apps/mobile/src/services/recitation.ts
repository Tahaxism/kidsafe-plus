import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

import { api } from './api';
import { scoreRecitation } from './ai';

let _recording: Audio.Recording | null = null;

export const requestMicPermission = async (): Promise<boolean> => {
  const { status } = await Audio.requestPermissionsAsync();
  return status === 'granted';
};

export const startRecording = async (): Promise<void> => {
  const granted = await requestMicPermission();
  if (!granted) throw new Error('Microphone permission not granted');
  if (_recording) {
    try {
      await _recording.stopAndUnloadAsync();
    } catch {
      // ignore
    }
    _recording = null;
  }
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
    staysActiveInBackground: false,
  });
  const rec = new Audio.Recording();
  await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
  await rec.startAsync();
  _recording = rec;
};

export const stopRecording = async (): Promise<string> => {
  if (!_recording) throw new Error('Not recording');
  await _recording.stopAndUnloadAsync();
  const uri = _recording.getURI();
  _recording = null;
  if (!uri) throw new Error('Recording produced no file');
  return uri;
};

export interface TranscriptionResult {
  text: string;
  language?: string;
  durationMs?: number;
}

export const transcribeAudio = async (
  uri: string,
  language: 'fr' | 'ar' | 'en' = 'ar',
): Promise<TranscriptionResult> => {
  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists) throw new Error('Audio file not found');

  const form = new FormData();
  // expo-av records to .m4a (AAC) on Android by default
  // @ts-expect-error - FormData.append accepts an object with uri/name/type in RN
  form.append('audio', { uri, name: 'rec.m4a', type: 'audio/m4a' });
  form.append('language', language);

  const res = await api.post<TranscriptionResult>('/ai/transcribe', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120_000,
  });
  return res.data;
};

export interface RecitationResult {
  transcript: string;
  score: number;
  passed: boolean;
  notes: string;
}

export const recordAndScore = async (
  expectedText: string,
  language: 'fr' | 'ar' | 'en' = 'ar',
): Promise<RecitationResult> => {
  const uri = await stopRecording();
  const t = await transcribeAudio(uri, language);
  const s = await scoreRecitation({
    expectedText,
    transcript: t.text,
    language,
  });
  return {
    transcript: t.text,
    score: s.score,
    passed: s.passed,
    notes: s.notes,
  };
};
