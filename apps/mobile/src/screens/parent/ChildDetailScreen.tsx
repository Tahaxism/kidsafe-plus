import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { ParentStackParamList } from '@/navigation/types';
import { colors, radii, spacing, typography } from '@/theme';
import { Screen } from '@/components/Screen';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { useChildrenStore } from '@/stores/children';
import { addRule, setRuleActive, subscribeChildRules } from '@/services/rules';
import type { Rule } from '@/types';

type Nav = NativeStackNavigationProp<ParentStackParamList, 'ChildDetail'>;
type Rt = RouteProp<ParentStackParamList, 'ChildDetail'>;

const Tile: React.FC<{ icon: string; label: string; onPress: () => void }> = ({
  icon,
  label,
  onPress,
}) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [styles.tile, pressed && { opacity: 0.85 }]}
  >
    <Text style={{ fontSize: 28 }}>{icon}</Text>
    <Text style={typography.bodyStrong}>{label}</Text>
  </Pressable>
);

export const ChildDetailScreen: React.FC = () => {
  const { t } = useTranslation();
  const nav = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const { childId } = route.params;
  const child = useChildrenStore((s) =>
    s.children.find((c) => c.id === childId),
  );
  const [rules, setRules] = useState<Rule[]>([]);

  useEffect(
    () => subscribeChildRules(childId, setRules),
    [childId],
  );

  if (!child) {
    return (
      <Screen>
        <Text style={typography.body}>—</Text>
      </Screen>
    );
  }

  const activeRuleCount = rules.filter((r) => r.active).length;

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Avatar name={child.name} color={child.avatarColor} size={64} />
        <View>
          <Text style={typography.h1}>{child.name}</Text>
          <Text style={[typography.small, { color: colors.textMuted }]}>
            {activeRuleCount} {t('parent.dashboard.activeRules')}
          </Text>
        </View>
      </View>

      <View style={styles.grid}>
        <Tile
          icon="⏱️"
          label={t('parent.screenTime.title') as string}
          onPress={() => nav.navigate('ScreenTime', { childId })}
        />
        <Tile
          icon="🚫"
          label={t('parent.blocking.title') as string}
          onPress={() => nav.navigate('AppBlocking', { childId })}
        />
        <Tile
          icon="🌐"
          label={t('parent.web.title') as string}
          onPress={() => nav.navigate('WebFilter', { childId })}
        />
        <Tile
          icon="📍"
          label={t('parent.location.title') as string}
          onPress={() => nav.navigate('Location', { childId })}
        />
        <Tile
          icon="📖"
          label={t('parent.recitation.title') as string}
          onPress={() => nav.navigate('Recitation', { childId })}
        />
      </View>

      <View style={{ height: spacing.xl }} />

      <Button
        title={t('parent.detail.lockNow') as string}
        variant="danger"
        onPress={() =>
          Alert.alert(
            t('parent.detail.lockNow') as string,
            t('parent.detail.lockNowConfirm') as string,
            [
              { text: t('common.cancel') as string, style: 'cancel' },
              {
                text: t('common.confirm') as string,
                style: 'destructive',
                onPress: async () => {
                  // Deactivate any pending remote_lock so a new one fires.
                  for (const r of rules) {
                    if (r.kind === 'remote_lock' && r.active) {
                      await setRuleActive(r.id, false);
                    }
                  }
                  await addRule(childId, {
                    kind: 'remote_lock',
                    payload: { childId, ts: Date.now() },
                    createdBy: 'parent',
                    reasonText: t('parent.detail.lockNow') as string,
                  });
                },
              },
            ],
          )
        }
        size="lg"
      />

      <View style={{ height: spacing.md }} />

      <Button
        title={t('parent.detail.bonus15') as string}
        variant="primary"
        onPress={async () => {
          await addRule(childId, {
            kind: 'reward',
            payload: {
              childId,
              bonusMinutes: 15,
              expiresAt: Date.now() + 24 * 60 * 60 * 1000,
            },
            createdBy: 'parent',
            reasonText: '+15 min',
          });
        }}
        size="md"
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  tile: {
    flexBasis: '48%',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
});
