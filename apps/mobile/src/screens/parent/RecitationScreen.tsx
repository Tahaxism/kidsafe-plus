import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRoute, type RouteProp } from '@react-navigation/native';
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
} from 'firebase/firestore';
import dayjs from 'dayjs';

import type { ParentStackParamList } from '@/navigation/types';
import { colors, radii, spacing, typography } from '@/theme';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { getDb, isFirebaseConfigured } from '@/services/firebase';
import { subscribeChildRules } from '@/services/rules';
import type { RecitationAttempt, Rule } from '@/types';

type Rt = RouteProp<ParentStackParamList, 'Recitation'>;

export const RecitationScreen: React.FC = () => {
  const { t } = useTranslation();
  const { childId } = useRoute<Rt>().params;
  const [attempts, setAttempts] = useState<RecitationAttempt[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);

  useEffect(() => subscribeChildRules(childId, setRules), [childId]);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    const db = getDb();
    const q = query(
      collection(db, 'recitations'),
      where('childId', '==', childId),
      orderBy('createdAt', 'desc'),
    );
    return onSnapshot(q, (snap) => {
      setAttempts(snap.docs.map((d) => d.data() as RecitationAttempt));
    });
  }, [childId]);

  const activeRecitation = rules.find(
    (r) => r.kind === 'require_recitation' && r.active,
  );

  return (
    <Screen scroll>
      <Text style={[typography.h1, { marginVertical: spacing.lg }]}>
        {t('parent.recitation.title')}
      </Text>

      <Card>
        <Text style={typography.h3}>{t('parent.recitation.assigned')}</Text>
        <Text style={[typography.body, { marginTop: spacing.sm }]}>
          {activeRecitation?.recitationText ?? '—'}
        </Text>
        {activeRecitation?.recitationMinScore ? (
          <Text style={[typography.small, { color: colors.textMuted, marginTop: 4 }]}>
            {t('parent.recitation.threshold')}:{' '}
            {activeRecitation.recitationMinScore}
          </Text>
        ) : null}
      </Card>

      <View style={{ height: spacing.md }} />

      <Text style={[typography.h3, { marginBottom: spacing.sm }]}>
        {t('parent.recitation.attempts')}
      </Text>

      <FlatList
        data={attempts}
        keyExtractor={(a) => a.id}
        scrollEnabled={false}
        contentContainerStyle={{ gap: spacing.xs }}
        renderItem={({ item }) => (
          <View
            style={[
              styles.row,
              {
                borderColor: item.passed ? colors.success : colors.danger,
              },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={typography.bodyStrong}>
                {item.passed
                  ? t('parent.recitation.passed')
                  : t('parent.recitation.failed')}{' '}
                — {item.score}
              </Text>
              <Text
                style={[typography.small, { color: colors.textMuted }]}
                numberOfLines={2}
              >
                "{item.transcript}"
              </Text>
            </View>
            <Text style={[typography.tiny, { color: colors.textDim }]}>
              {dayjs(item.createdAt).format('DD/MM HH:mm')}
            </Text>
          </View>
        )}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.md,
    alignItems: 'center',
  },
});
