import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { ChildStackParamList } from '@/navigation/types';
import { colors, radii, spacing, typography } from '@/theme';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { useAuthStore } from '@/stores/auth';
import { subscribeChildRules } from '@/services/rules';
import type { Rule } from '@/types';

type Nav = NativeStackNavigationProp<ChildStackParamList, 'Home'>;

export const ChildHomeScreen: React.FC = () => {
  const { t } = useTranslation();
  const nav = useNavigation<Nav>();
  const session = useAuthStore((s) => s.session);
  const signOut = useAuthStore((s) => s.signOut);
  const [rules, setRules] = useState<Rule[]>([]);

  useEffect(() => {
    if (session?.kind !== 'child') return;
    return subscribeChildRules(session.childId, setRules);
  }, [session]);

  if (session?.kind !== 'child') return <Screen />;

  const activeBlocks = rules.filter(
    (r) =>
      (r.kind === 'block_app' || r.kind === 'block_category') && r.active,
  );
  const recitationRule = rules.find(
    (r) => r.kind === 'require_recitation' && r.active,
  );

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text style={typography.h1}>
          {t('child.helloChild', { name: session.name })}
        </Text>
        <Pressable onPress={signOut}>
          <Text style={[typography.small, { color: colors.textMuted }]}>
            {t('auth.logout')}
          </Text>
        </Pressable>
      </View>

      <Card>
        <Text style={typography.small}>{t('child.timeRemaining')}</Text>
        <Text style={typography.display}>—</Text>
      </Card>

      <View style={{ height: spacing.md }} />

      {recitationRule ? (
        <Pressable
          onPress={() =>
            nav.navigate('RecitationGate', { ruleId: recitationRule.id })
          }
          style={[styles.reciteCard]}
        >
          <Text style={{ fontSize: 32 }}>📖</Text>
          <View style={{ flex: 1 }}>
            <Text style={typography.h3}>{t('child.reciteToUnlock')}</Text>
            <Text style={[typography.small, { color: colors.textMuted }]} numberOfLines={2}>
              {recitationRule.recitationText ?? '...'}
            </Text>
          </View>
          <Text style={{ fontSize: 22 }}>›</Text>
        </Pressable>
      ) : null}

      <View style={{ height: spacing.md }} />

      <Text style={[typography.h3, { marginBottom: spacing.sm }]}>
        {t('child.blockedTitle')}
      </Text>
      {activeBlocks.length === 0 ? (
        <Text style={[typography.body, { color: colors.textMuted }]}>—</Text>
      ) : (
        activeBlocks.map((r) => (
          <View key={r.id} style={styles.blockedRow}>
            <Text style={typography.bodyStrong}>
              {(r.payload as { name?: string }).name ?? r.kind}
            </Text>
            {r.reasonText ? (
              <Text style={[typography.small, { color: colors.textMuted }]}>
                {r.reasonText}
              </Text>
            ) : null}
          </View>
        ))
      )}

      <View style={{ height: spacing.xl }} />

      <Button
        title={t('child.sos') as string}
        variant="danger"
        onPress={() => nav.navigate('SOS')}
        size="lg"
      />

      <View style={{ height: spacing.xl }} />

      <Card>
        <Text style={[typography.tiny, { color: colors.textMuted, textAlign: 'center' }]}>
          {t('child.monitored')}
        </Text>
      </Card>
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.lg,
  },
  reciteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  blockedRow: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.xs,
  },
});
