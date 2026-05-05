import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

import { api } from './api';
import { scoreRecitation } from './ai';
import {
  isOnDeviceAvailable,
  requestSpeechPermission,
  transcribeOnDevice,
} from './speechRecognition';

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

export interface TranscriptionPipelineOptions {
  language: 'fr' | 'ar' | 'en';
  onPartial?: (text: string) => void;
  forceWhisper?: boolean;
}

/**
 * Run on-device speech recognition (Android SpeechRecognizer) when available;
 * fall back to recording + Whisper API otherwise. Returns the controller +
 * a promise that resolves with the final transcript.
 *
 * The mic must already have permission. The caller is responsible for the
 * "press to start / release to stop" UX; this function returns immediately
 * with a controller and resolves when transcription is complete.
 */
export const startSmartTranscription = async (
  opts: TranscriptionPipelineOptions,
): Promise<{
  promise: Promise<string>;
  stop: () => void;
  abort: () => void;
  mode: 'on_device' | 'whisper';
}> => {
  if (!opts.forceWhisper) {
    const available = await isOnDeviceAvailable();
    if (available) {
      const granted = await requestSpeechPermission();
      if (granted) {
        const { promise, controller } = transcribeOnDevice(
          opts.language,
          opts.onPartial,
        );
        return {
          promise,
          stop: controller.stop,
          abort: controller.abort,
          mode: 'on_device',
        };
      }
    }
  }
  // Whisper fallback: start recording now, let the caller signal stop.
  await startRecording();
  let stopped = false;
  const promise = new Promise<string>((resolve, reject) => {
    void (async (): Promise<void> => {
      // Wait until stop() is called.
      // We resolve via a stop hook below.
      const wait = (): Promise<void> =>
        new Promise<void>((r) => {
          const tick = (): void => {
            if (stopped) {
              r();
            } else {
              setTimeout(tick, 100);
            }
          };
          tick();
        });
      try {
        await wait();
        const uri = await stopRecording();
        const t = await transcribeAudio(uri, opts.language);
        resolve(t.text);
      } catch (e) {
        reject(
          e instanceof Error ? e : new Error('whisper_pipeline_failed'),
        );
      }
    })();
  });
  return {
    promise,
    stop: () => {
      stopped = true;
    },
    abort: () => {
      stopped = true;
      // Best-effort: stop recording so the mic is released.
      void stopRecording().catch(() => undefined);
    },
    mode: 'whisper',
  };
};
