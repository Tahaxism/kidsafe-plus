import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
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
  startRecording,
  recordAndScore,
  requestMicPermission,
} from '@/services/recitation';
import { recordRecitationAttempt, addAlert, setRuleActive } from '@/services/rules';
import { getDb, isFirebaseConfigured } from '@/services/firebase';
import { useAuthStore } from '@/stores/auth';
import type { Rule } from '@/types';

type Rt = RouteProp<ChildStackParamList, 'RecitationGate'>;

type Phase = 'idle' | 'recording' | 'analyzing' | 'pass' | 'fail';

export const ChildRecitationGateScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const nav = useNavigation();
  const { ruleId } = useRoute<Rt>().params;
  const session = useAuthStore((s) => s.session);

  const [rule, setRule] = useState<Rule | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [score, setScore] = useState<number | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!isFirebaseConfigured) return;
      const snap = await getDoc(doc(getDb(), 'rules', ruleId));
      if (snap.exists()) setRule(snap.data() as Rule);
    })();
  }, [ruleId]);

  const onPressIn = async (): Promise<void> => {
    setError(null);
    const ok = await requestMicPermission();
    if (!ok) {
      setError(t('errors.micPermission') as string);
      return;
    }
    try {
      await startRecording();
      setPhase('recording');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
  };

  const onPressOut = async (): Promise<void> => {
    if (phase !== 'recording' || !rule || session?.kind !== 'child') return;
    setPhase('analyzing');
    try {
      const lang = (i18n.language as 'fr' | 'ar' | 'en') ?? 'ar';
      const r = await recordAndScore(rule.recitationText ?? '', lang);
      setScore(r.score);
      setTranscript(r.transcript);
      const passed = r.passed;
      setPhase(passed ? 'pass' : 'fail');
      await recordRecitationAttempt({
        childId: session.childId,
        ruleId,
        expectedText: rule.recitationText ?? '',
        transcript: r.transcript,
        score: r.score,
        passed,
      });
      await addAlert({
        childId: session.childId,
        kind: passed ? 'recite_ok' : 'recite_fail',
        title: passed
          ? (t('parent.alerts.reciteOk') as string)
          : (t('parent.alerts.reciteFail') as string),
        description: `${session.name}: ${r.score}`,
        severity: passed ? 'info' : 'warn',
        metadata: { ruleId, transcript: r.transcript },
      });
      if (passed) {
        // Deactivate the gate so parent has to re-arm
        await setRuleActive(ruleId, false);
        // Also disable any blocking rules tied to this recitation
        // (best-effort; assume payload.gatedBy === ruleId)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
      setPhase('idle');
    }
  };

  return (
    <Screen scroll>
      <Text style={[typography.h2, { marginVertical: spacing.lg }]}>
        {t('child.reciteIntro')}
      </Text>
      <Card>
        <Text style={styles.expected}>{rule?.recitationText ?? '…'}</Text>
      </Card>

      <View style={{ height: spacing.xl }} />

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
      </View>

      {phase === 'pass' ? (
        <Card style={{ borderColor: colors.success }}>
          <Text style={[typography.h2, { color: colors.success }]}>
            {t('child.recitePass')}
          </Text>
          <Text style={typography.small}>
            {t('parent.recitation.score')}: {score}
          </Text>
          {transcript ? (
            <Text style={[typography.small, { color: colors.textMuted, marginTop: spacing.xs }]}>
              "{transcript}"
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
            <Text style={[typography.small, { color: colors.textMuted, marginTop: spacing.xs }]}>
              "{transcript}"
            </Text>
          ) : null}
        </Card>
      ) : null}

      {error ? (
        <Text style={{ color: colors.danger, marginTop: spacing.md }}>{error}</Text>
      ) : null}
    </Screen>
  );
};

const styles = StyleSheet.create({
  expected: { ...typography.h2, textAlign: 'center', lineHeight: 32 },
  micWrap: { alignItems: 'center', gap: spacing.md, marginVertical: spacing.xl },
  micBtn: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
