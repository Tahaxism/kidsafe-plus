import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import { doc, getDoc } from 'firebase/firestore';

import type { ChildStackParamList } from '@/navigation/types';
import { colors, radii, spacing, typography } from '@/theme';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import {
  startSmartTranscription,
  requestMicPermission,
} from '@/services/recitation';
import { scoreRecitation } from '@/services/ai';
import {
  recordRecitationAttempt,
  addAlert,
  setRuleActive,
} from '@/services/rules';
import { getDb, isFirebaseConfigured } from '@/services/firebase';
import { useAuthStore } from '@/stores/auth';
import type { Rule } from '@/types';

type Rt = RouteProp<ChildStackParamList, 'RecitationGate'>;

type Phase = 'idle' | 'recording' | 'analyzing' | 'pass' | 'fail';
type Mode = 'voice' | 'type';

interface SmartHandle {
  promise: Promise<string>;
  stop: () => void;
  abort: () => void;
  mode: 'on_device' | 'whisper';
}

export const ChildRecitationGateScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const nav = useNavigation();
  const { ruleId } = useRoute<Rt>().params;
  const session = useAuthStore((s) => s.session);

  const [rule, setRule] = useState<Rule | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [score, setScore] = useState<number | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [partial, setPartial] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('voice');
  const [typedAnswer, setTypedAnswer] = useState('');

  const handleRef = useRef<SmartHandle | null>(null);

  useEffect(() => {
    (async () => {
      if (!isFirebaseConfigured) return;
      const snap = await getDoc(doc(getDb(), 'rules', ruleId));
      if (snap.exists()) setRule(snap.data() as Rule);
    })();
  }, [ruleId]);

  const finalize = async (
    transcriptText: string,
  ): Promise<void> => {
    if (!rule || session?.kind !== 'child') return;
    setPhase('analyzing');
    try {
      const lang = (i18n.language as 'fr' | 'ar' | 'en') ?? 'ar';
      const s = await scoreRecitation({
        expectedText: rule.recitationText ?? '',
        transcript: transcriptText,
        language: lang,
      });
      setScore(s.score);
      setTranscript(transcriptText);
      const passed = s.passed;
      setPhase(passed ? 'pass' : 'fail');
      await recordRecitationAttempt({
        childId: session.childId,
        ruleId,
        expectedText: rule.recitationText ?? '',
        transcript: transcriptText,
        score: s.score,
        passed,
      });
      await addAlert({
        childId: session.childId,
        kind: passed ? 'recite_ok' : 'recite_fail',
        title: passed
          ? (t('parent.alerts.reciteOk') as string)
          : (t('parent.alerts.reciteFail') as string),
        description: `${session.name}: ${s.score}`,
        severity: passed ? 'info' : 'warn',
        metadata: { ruleId, transcript: transcriptText, mode },
      });
      if (passed) {
        await setRuleActive(ruleId, false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
      setPhase('idle');
    }
  };

  const onPressIn = async (): Promise<void> => {
    setError(null);
    setPartial('');
    const ok = await requestMicPermission();
    if (!ok) {
      setError(t('errors.micPermission') as string);
      return;
    }
    try {
      const lang = (i18n.language as 'fr' | 'ar' | 'en') ?? 'ar';
      const handle = await startSmartTranscription({
        language: lang,
        onPartial: (text) => setPartial(text),
      });
      handleRef.current = handle;
      setPhase('recording');
      void handle.promise
        .then((text) => {
          handleRef.current = null;
          if (text.trim()) {
            void finalize(text);
          } else {
            setError(t('child.reciteNoSpeech') as string);
            setPhase('idle');
          }
        })
        .catch((e) => {
          handleRef.current = null;
          setError(
            e instanceof Error
              ? `${t('child.reciteFailedErr')}: ${e.message}`
              : (t('child.reciteFailedErr') as string),
          );
          setPhase('idle');
        });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
      setPhase('idle');
    }
  };

  const onPressOut = (): void => {
    if (phase !== 'recording') return;
    handleRef.current?.stop();
  };

  const submitTyped = async (): Promise<void> => {
    setError(null);
    if (!typedAnswer.trim()) return;
    await finalize(typedAnswer.trim());
  };

  return (
    <Screen scroll>
      <Text style={[typography.h2, { marginVertical: spacing.lg }]}>
        {t('child.reciteIntro')}
      </Text>
      <Card>
        <Text style={styles.expected}>{rule?.recitationText ?? '…'}</Text>
      </Card>

      <View style={styles.modeRow}>
        <Pressable
          onPress={() => setMode('voice')}
          style={[styles.modePill, mode === 'voice' && styles.modePillActive]}
        >
          <Text
            style={[
              typography.small,
              {
                color: mode === 'voice' ? colors.textOnPrimary : colors.text,
              },
            ]}
          >
            🎤 {t('child.reciteVoice')}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setMode('type')}
          style={[styles.modePill, mode === 'type' && styles.modePillActive]}
        >
          <Text
            style={[
              typography.small,
              {
                color: mode === 'type' ? colors.textOnPrimary : colors.text,
              },
            ]}
          >
            ⌨️ {t('child.reciteType')}
          </Text>
        </Pressable>
      </View>

      {mode === 'voice' ? (
        <View style={styles.micWrap}>
          <Pressable
            onPressIn={onPressIn}
            onPressOut={onPressOut}
            disabled={phase === 'analyzing'}
            style={({ pressed }) => [
              styles.micBtn,
              phase === 'recording' && { backgroundColor: colors.danger },
              pressed && { transform: [{ scale: 0.95 }] },
            ]}
          >
            {phase === 'analyzing' ? (
              <ActivityIndicator color={colors.textOnPrimary} size="large" />
            ) : (
              <Text style={{ fontSize: 48 }}>🎤</Text>
            )}
          </Pressable>
          <Text style={[typography.small, { color: colors.textMuted }]}>
            {phase === 'recording'
              ? t('child.reciteRecording')
              : phase === 'analyzing'
              ? t('child.reciteAnalyzing')
              : t('child.reciteHold')}
          </Text>
          {partial ? (
            <Text
              style={[
                typography.small,
                { color: colors.textMuted, fontStyle: 'italic' },
              ]}
              numberOfLines={2}
            >
              {partial}
            </Text>
          ) : null}
        </View>
      ) : (
        <View style={styles.typeWrap}>
          <TextInput
            value={typedAnswer}
            onChangeText={setTypedAnswer}
            placeholder={t('child.reciteTypePlaceholder') as string}
            placeholderTextColor={colors.textDim}
            multiline
            style={styles.typeInput}
            editable={phase !== 'analyzing'}
          />
          <Pressable
            onPress={submitTyped}
            disabled={!typedAnswer.trim() || phase === 'analyzing'}
            style={({ pressed }) => [
              styles.submitBtn,
              {
                opacity:
                  !typedAnswer.trim() || phase === 'analyzing'
                    ? 0.5
                    : pressed
                    ? 0.85
                    : 1,
              },
            ]}
          >
            {phase === 'analyzing' ? (
              <ActivityIndicator color={colors.textOnPrimary} />
            ) : (
              <Text
                style={{
                  color: colors.textOnPrimary,
                  fontWeight: '700',
                  fontSize: 16,
                }}
              >
                {t('child.reciteSubmit')}
              </Text>
            )}
          </Pressable>
        </View>
      )}

      {phase === 'pass' ? (
        <Card style={{ borderColor: colors.success }}>
          <Text style={[typography.h2, { color: colors.success }]}>
            {t('child.recitePass')}
          </Text>
          <Text style={typography.small}>
            {t('parent.recitation.score')}: {score}
          </Text>
          {transcript ? (
            <Text
              style={[
                typography.small,
                { color: colors.textMuted, marginTop: spacing.xs },
              ]}
            >
              {`"${transcript}"`}
            </Text>
          ) : null}
          <View style={{ height: spacing.md }} />
          <Pressable onPress={() => nav.goBack()}>
            <Text style={{ color: colors.primary, fontWeight: '700' }}>
              {t('common.continue')} ›
            </Text>
          </Pressable>
        </Card>
      ) : null}

      {phase === 'fail' ? (
        <Card style={{ borderColor: colors.danger }}>
          <Text style={[typography.h2, { color: colors.danger }]}>
            {t('child.reciteFail')}
          </Text>
          <Text style={typography.small}>
            {t('parent.recitation.score')}: {score}
          </Text>
          {transcript ? (
            <Text
              style={[
                typography.small,
                { color: colors.textMuted, marginTop: spacing.xs },
              ]}
            >
              {`"${transcript}"`}
            </Text>
          ) : null}
        </Card>
      ) : null}

      {error ? (
        <Text style={{ color: colors.danger, marginTop: spacing.md }}>
          {error}
        </Text>
      ) : null}
    </Screen>
  );
};

const styles = StyleSheet.create({
  expected: { ...typography.h2, textAlign: 'center', lineHeight: 32 },
  modeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
    justifyContent: 'center',
  },
  modePill: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  modePillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  micWrap: {
    alignItems: 'center',
    gap: spacing.md,
    marginVertical: spacing.xl,
  },
  micBtn: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeWrap: { marginVertical: spacing.xl, gap: spacing.md },
  typeInput: {
    color: colors.text,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 16,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
});
