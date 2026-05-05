import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { ParentStackParamList } from '@/navigation/types';
import { colors, radii, spacing, typography } from '@/theme';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { useAuthStore } from '@/stores/auth';
import { useChildrenStore } from '@/stores/children';
import { subscribeAlerts } from '@/services/rules';
import type { SafetyAlert } from '@/types';

type Nav = NativeStackNavigationProp<ParentStackParamList, 'Tabs'>;

export const DashboardScreen: React.FC = () => {
  const { t } = useTranslation();
  const nav = useNavigation<Nav>();
  const session = useAuthStore((s) => s.session);
  const parentName =
    session?.kind === 'parent' ? session.displayName : '';

  const children = useChildrenStore((s) => s.children);
  const refresh = useChildrenStore((s) => s.refresh);
  const loading = useChildrenStore((s) => s.loading);
  const selectedId = useChildrenStore((s) => s.selectedId);
  const select = useChildrenStore((s) => s.select);

  const [alerts, setAlerts] = useState<SafetyAlert[]>([]);

  useEffect(() => {
    if (session?.kind === 'parent') {
      void refresh(session.uid);
    }
  }, [session, refresh]);

  useEffect(() => {
    const ids = children.map((c) => c.id);
    if (ids.length === 0) {
      setAlerts([]);
      return;
    }
    const unsub = subscribeAlerts(ids, setAlerts);
    return unsub;
  }, [children]);

  const selected = useMemo(
    () => children.find((c) => c.id === selectedId) ?? children[0],
    [children, selectedId],
  );

  const todayUsageMin = 0; // wired later via usage stats
  const recentAlerts = alerts.slice(0, 3);

  return (
    <Screen scroll={false}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => session?.kind === 'parent' && refresh(session.uid)}
            tintColor={colors.primary}
          />
        }
      >
        <Text style={styles.hello}>
          {t('parent.dashboard.hello', { name: parentName || '👋' })}
        </Text>

        {children.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>
              {t('parent.dashboard.noChildren')}
            </Text>
            <View style={{ height: spacing.md }} />
            <Button
              title={t('parent.dashboard.addChild') as string}
              onPress={() => nav.navigate('AddChild')}
            />
          </Card>
        ) : (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.childRow}
            >
              {children.map((c) => {
                const isSel = c.id === selected?.id;
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => select(c.id)}
                    style={[
                      styles.childChip,
                      isSel && { borderColor: colors.primary },
                    ]}
                  >
                    <Avatar name={c.name} color={c.avatarColor} size={36} />
                    <Text style={styles.childName}>{c.name}</Text>
                  </Pressable>
                );
              })}
              <Pressable
                onPress={() => nav.navigate('AddChild')}
                style={[styles.childChip, styles.childChipAdd]}
              >
                <Text style={styles.addPlus}>+</Text>
              </Pressable>
            </ScrollView>

            <Card>
              <Text style={typography.small}>
                {t('parent.dashboard.todayUsage')}
              </Text>
              <View style={styles.usageRow}>
                <Text style={typography.display}>{todayUsageMin}</Text>
                <Text style={[typography.body, { color: colors.textMuted }]}>
                  {' '}
                  / {selected?.dailyLimitMinutes ?? 120} min
                </Text>
              </View>
              <View style={styles.bar}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${Math.min(
                        100,
                        (todayUsageMin /
                          (selected?.dailyLimitMinutes ?? 120)) *
                          100,
                      )}%`,
                    },
                  ]}
                />
              </View>
            </Card>

            <View style={{ height: spacing.md }} />

            <Card>
              <Text style={typography.h3}>
                {t('parent.dashboard.recentAlerts')}
              </Text>
              <View style={{ height: spacing.sm }} />
              {loading ? (
                <ActivityIndicator color={colors.primary} />
              ) : recentAlerts.length === 0 ? (
                <Text style={[typography.body, { color: colors.textMuted }]}>
                  {t('parent.dashboard.noAlerts')}
                </Text>
              ) : (
                recentAlerts.map((a) => (
                  <View key={a.id} style={styles.alertRow}>
                    <View
                      style={[
                        styles.dot,
                        {
                          backgroundColor:
                            a.severity === 'high'
                              ? colors.danger
                              : a.severity === 'warn'
                              ? colors.warning
                              : colors.info,
                        },
                      ]}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={typography.bodyStrong}>{a.title}</Text>
                      <Text
                        style={[typography.small, { color: colors.textMuted }]}
                      >
                        {a.description}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </Card>

            <View style={{ height: spacing.md }} />

            <View style={styles.gridRow}>
              <Pressable
                style={styles.gridCard}
                onPress={() =>
                  selected &&
                  nav.navigate('ScreenTime', { childId: selected.id })
                }
              >
                <Text style={styles.gridEmoji}>⏱️</Text>
                <Text style={typography.bodyStrong}>
                  {t('parent.screenTime.title')}
                </Text>
              </Pressable>
              <Pressable
                style={styles.gridCard}
                onPress={() =>
                  selected &&
                  nav.navigate('AppBlocking', { childId: selected.id })
                }
              >
                <Text style={styles.gridEmoji}>🚫</Text>
                <Text style={typography.bodyStrong}>
                  {t('parent.blocking.title')}
                </Text>
              </Pressable>
            </View>
            <View style={styles.gridRow}>
              <Pressable
                style={styles.gridCard}
                onPress={() =>
                  selected &&
                  nav.navigate('Location', { childId: selected.id })
                }
              >
                <Text style={styles.gridEmoji}>📍</Text>
                <Text style={typography.bodyStrong}>
                  {t('parent.location.title')}
                </Text>
              </Pressable>
              <Pressable
                style={styles.gridCard}
                onPress={() =>
                  selected &&
                  nav.navigate('WebFilter', { childId: selected.id })
                }
              >
                <Text style={styles.gridEmoji}>🌐</Text>
                <Text style={typography.bodyStrong}>
                  {t('parent.web.title')}
                </Text>
              </Pressable>
            </View>
            <View style={styles.gridRow}>
              <Pressable
                style={styles.gridCard}
                onPress={() =>
                  selected &&
                  nav.navigate('Recitation', { childId: selected.id })
                }
              >
                <Text style={styles.gridEmoji}>📖</Text>
                <Text style={typography.bodyStrong}>
                  {t('parent.recitation.title')}
                </Text>
              </Pressable>
              <Pressable
                style={styles.gridCard}
                onPress={() =>
                  nav.navigate('Tabs', { screen: 'AI' })
                }
              >
                <Text style={styles.gridEmoji}>🤖</Text>
                <Text style={typography.bodyStrong}>
                  {t('parent.ai.title')}
                </Text>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl },
  hello: { ...typography.h1, marginVertical: spacing.lg },
  emptyCard: { alignItems: 'flex-start' },
  emptyTitle: { ...typography.body, color: colors.textMuted },
  childRow: { gap: spacing.sm, paddingVertical: spacing.sm },
  childChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingRight: spacing.lg,
  },
  childChipAdd: {
    paddingRight: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  addPlus: { ...typography.h2, color: colors.primary },
  childName: { ...typography.bodyStrong },
  usageRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: spacing.sm },
  bar: {
    height: 8,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 4,
    marginTop: spacing.md,
    overflow: 'hidden',
  },
  barFill: { height: '100%', backgroundColor: colors.primary },
  alertRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  gridRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  gridCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  gridEmoji: { fontSize: 28 },
});
