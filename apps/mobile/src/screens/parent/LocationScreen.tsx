import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRoute, type RouteProp } from '@react-navigation/native';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  limit,
} from 'firebase/firestore';

import type { ParentStackParamList } from '@/navigation/types';
import { colors, radii, spacing, typography } from '@/theme';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { getDb, isFirebaseConfigured } from '@/services/firebase';
import type { LocationPing } from '@/types';

type Rt = RouteProp<ParentStackParamList, 'Location'>;

export const LocationScreen: React.FC = () => {
  const { t } = useTranslation();
  const { childId } = useRoute<Rt>().params;
  const [latest, setLatest] = useState<LocationPing | null>(null);
  const [history, setHistory] = useState<LocationPing[]>([]);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    const db = getDb();
    const q = query(
      collection(db, 'locations'),
      where('childId', '==', childId),
      orderBy('ts', 'desc'),
      limit(20),
    );
    return onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => d.data() as LocationPing);
      setHistory(list);
      setLatest(list[0] ?? null);
    });
  }, [childId]);

  return (
    <Screen scroll>
      <Text style={[typography.h1, { marginVertical: spacing.lg }]}>
        {t('parent.location.title')}
      </Text>

      <Card style={styles.mapStub}>
        <Text style={{ fontSize: 48 }}>🗺️</Text>
        <Text style={[typography.body, { color: colors.textMuted, textAlign: 'center' }]}>
          {t('parent.location.mapStub')}
        </Text>
      </Card>

      <View style={{ height: spacing.md }} />

      <Card>
        <Text style={typography.h3}>{t('parent.location.live')}</Text>
        {latest ? (
          <>
            <Text style={typography.bodyStrong}>
              {latest.lat.toFixed(5)}, {latest.lon.toFixed(5)}
            </Text>
            <Text style={[typography.small, { color: colors.textMuted }]}>
              ±{Math.round(latest.accuracy)} m ·{' '}
              {new Date(latest.ts).toLocaleTimeString()}
            </Text>
          </>
        ) : (
          <Text style={[typography.small, { color: colors.textMuted }]}>
            —
          </Text>
        )}
      </Card>

      <View style={{ height: spacing.md }} />

      <Text style={[typography.h3, { marginBottom: spacing.sm }]}>
        {t('parent.location.history')}
      </Text>
      {history.map((p, i) => (
        <View key={i} style={styles.row}>
          <Text style={typography.body}>
            {p.lat.toFixed(4)}, {p.lon.toFixed(4)}
          </Text>
          <Text style={[typography.tiny, { color: colors.textDim }]}>
            {new Date(p.ts).toLocaleString()}
          </Text>
        </View>
      ))}
    </Screen>
  );
};

const styles = StyleSheet.create({
  mapStub: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xs,
  },
});
