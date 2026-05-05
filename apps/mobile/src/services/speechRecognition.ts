import {
  ExpoSpeechRecognitionModule,
  type ExpoSpeechRecognitionOptions,
} from 'expo-speech-recognition';

export interface OnDeviceTranscript {
  text: string;
  isFinal: boolean;
}

export const isOnDeviceAvailable = async (): Promise<boolean> => {
  try {
    return ExpoSpeechRecognitionModule.isRecognitionAvailable();
  } catch {
    return false;
  }
};

export const requestSpeechPermission = async (): Promise<boolean> => {
  try {
    const res = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    return res.granted;
  } catch {
    return false;
  }
};

const langTag = (lang: 'fr' | 'ar' | 'en'): string => {
  switch (lang) {
    case 'fr':
      return 'fr-FR';
    case 'ar':
      return 'ar-MA'; // Moroccan Arabic; recognizer falls back if unsupported
    default:
      return 'en-US';
  }
};

/**
 * Start a one-shot transcription. Returns a Promise that resolves with the
 * final transcript when the user stops speaking (or `stop()` is called), or
 * rejects on error / no speech detected.
 *
 * Use the returned controller to stop early or subscribe to partial results.
 */
export interface SpeechRecognitionController {
  stop: () => void;
  abort: () => void;
}

export const transcribeOnDevice = (
  language: 'fr' | 'ar' | 'en',
  onPartial?: (text: string) => void,
): {
  promise: Promise<string>;
  controller: SpeechRecognitionController;
} => {
  let resolveFn: (text: string) => void = () => undefined;
  let rejectFn: (e: Error) => void = () => undefined;
  let lastText = '';

  const promise = new Promise<string>((resolve, reject) => {
    resolveFn = resolve;
    rejectFn = reject;
  });

  const subscriptions: Array<{ remove: () => void }> = [];

  const cleanup = (): void => {
    for (const s of subscriptions) {
      try {
        s.remove();
      } catch {
        // ignore
      }
    }
  };

  subscriptions.push(
    ExpoSpeechRecognitionModule.addListener('result', (e) => {
      const transcript = e.results[0]?.transcript ?? '';
      lastText = transcript;
      if (!e.isFinal) {
        onPartial?.(transcript);
      } else {
        cleanup();
        resolveFn(transcript);
      }
    }),
  );

  subscriptions.push(
    ExpoSpeechRecognitionModule.addListener('error', (e) => {
      cleanup();
      // If we already have something, prefer that over a "no-speech" error.
      if (
        lastText &&
        (e.error === 'no-speech' || e.error === 'speech-timeout')
      ) {
        resolveFn(lastText);
      } else {
        rejectFn(new Error(e.error || 'speech_recognition_error'));
      }
    }),
  );

  subscriptions.push(
    ExpoSpeechRecognitionModule.addListener('end', () => {
      // If end fires before result, fall back to whatever partial we have.
      // Always settle the promise — never leave it hanging, otherwise the
      // calling UI would be stuck in `recording` forever.
      cleanup();
      if (lastText) {
        resolveFn(lastText);
      } else {
        rejectFn(new Error('no_speech_detected'));
      }
    }),
  );

  const opts: ExpoSpeechRecognitionOptions = {
    lang: langTag(language),
    interimResults: true,
    continuous: false,
    requiresOnDeviceRecognition: false,
    addsPunctuation: true,
    maxAlternatives: 1,
  };

  try {
    ExpoSpeechRecognitionModule.start(opts);
  } catch (e) {
    cleanup();
    rejectFn(e instanceof Error ? e : new Error('speech_start_failed'));
  }

  return {
    promise,
    controller: {
      stop: () => {
        try {
          ExpoSpeechRecognitionModule.stop();
        } catch {
          // ignore
        }
      },
      abort: () => {
        try {
          ExpoSpeechRecognitionModule.abort();
        } catch {
          // ignore
        }
        cleanup();
      },
    },
  };
};
