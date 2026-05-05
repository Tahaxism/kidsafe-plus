import React, { useEffect, useMemo, useState } from 'react';
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
import { computeScheduleStatus, formatRemaining } from '@/services/scheduling';
import { Native } from '@/services/native';
import { PrivacyNoticeModal } from './PrivacyNoticeModal';
import type { Rule } from '@/types';

type Nav = NativeStackNavigationProp<ChildStackParamList, 'Home'>;

// Module-scope set so that re-mounts don't replay locks.
const firedLocks = new Set<string>();

export const ChildHomeScreen: React.FC = () => {
  const { t } = useTranslation();
  const nav = useNavigation<Nav>();
  const session = useAuthStore((s) => s.session);
  const signOut = useAuthStore((s) => s.signOut);
  const [rules, setRules] = useState<Rule[]>([]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (session?.kind !== 'child') return;
    return subscribeChildRules(session.childId, setRules);
  }, [session]);

  // Re-compute status every minute so the bedtime banner appears on schedule.
  useEffect(() => {
    const id = setInterval(() => setTick((x) => x + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  // Used screen-time minutes today, read from native UsageStatsManager.
  const [usedMin, setUsedMin] = useState<number>(0);
  useEffect(() => {
    let stopped = false;
    const refresh = async (): Promise<void> => {
      const has = await Native.hasUsageAccess();
      if (!has || stopped) return;
      const entries = await Native.getTodayUsage();
      if (stopped) return;
      const total = entries.reduce(
        (acc, e) => acc + e.totalTimeForegroundMin,
        0,
      );
      setUsedMin(Math.round(total));
    };
    void refresh();
    const id = setInterval(refresh, 60_000);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, []);

  // Sync the active blocklist to the native AccessibilityService whenever the
  // rule set changes. The service uses this to redirect the user back to the
  // launcher when they open a blocked app. Also trigger a Device-Admin lock
  // immediately when a `remote_lock` rule becomes active.
  useEffect(() => {
    const blockedPkgs: string[] = [];
    let lockNow = false;
    for (const r of rules) {
      if (!r.active) continue;
      if (r.kind === 'block_app') {
        const p = (r.payload as { packageName?: string }).packageName;
        if (p) blockedPkgs.push(p);
      } else if (r.kind === 'remote_lock') {
        // Only lock once per remote-lock rule activation: we treat ruleId as
        // the dedup key by stuffing it into a one-shot ref outside React's
        // state machine.
        if (!firedLocks.has(r.id)) {
          firedLocks.add(r.id);
          lockNow = true;
        }
      }
    }
    void Native.setBlockedPackages(blockedPkgs);
    if (lockNow) void Native.lockNow();
  }, [rules]);

  const status = useMemo(
    () => computeScheduleStatus(rules, new Date()),
    // tick triggers re-evaluation, even though it isn't directly used inside
    // the function — we just want a fresh `new Date()`.
    [rules, tick],
  );

  // Enforce the daily screen-time limit: lock the device once the child has
  // burned through their allotted minutes (plus any reward bonuses). Only
  // fires once per day per limit value to avoid relock loops.
  const limitFiredKey =
    status.dailyLimitMin !== null
      ? `limit:${status.dailyLimitMin + status.bonusMinutes}:${new Date().toDateString()}`
      : null;
  useEffect(() => {
    if (!limitFiredKey) return;
    if (status.dailyLimitMin === null) return;
    const cap = status.dailyLimitMin + status.bonusMinutes;
    if (usedMin >= cap && !firedLocks.has(limitFiredKey)) {
      firedLocks.add(limitFiredKey);
      void Native.lockNow();
    }
  }, [usedMin, status.dailyLimitMin, status.bonusMinutes, limitFiredKey]);

  // Auto-lock when bedtime / homework windows become active. Fires once per
  // mode per day so the child can unlock and use whitelisted apps but the
  // device locks the moment they enter the window.
  useEffect(() => {
    const day = new Date().toDateString();
    if (status.bedtimeActive) {
      const k = `bedtime:${day}`;
      if (!firedLocks.has(k)) {
        firedLocks.add(k);
        void Native.lockNow();
      }
    }
    if (status.homeworkActive) {
      const k = `homework:${day}`;
      if (!firedLocks.has(k)) {
        firedLocks.add(k);
        void Native.lockNow();
      }
    }
  }, [status.bedtimeActive, status.homeworkActive]);

  if (session?.kind !== 'child') return <Screen />;

  const activeBlocks = rules.filter(
    (r) =>
      (r.kind === 'block_app' || r.kind === 'block_category') && r.active,
  );
  const recitationRule = rules.find(
    (r) => r.kind === 'require_recitation' && r.active,
  );
  const remoteLock = rules.find((r) => r.kind === 'remote_lock' && r.active);

  const remaining = formatRemaining(
    usedMin,
    status.dailyLimitMin,
    status.bonusMinutes,
  );

  return (
    <Screen scroll>
      <PrivacyNoticeModal childId={session.childId} />
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

      {remoteLock ? (
        <Card style={{ borderColor: colors.danger, backgroundColor: colors.dangerSoft }}>
          <Text style={{ fontSize: 32 }}>🔒</Text>
          <Text style={[typography.h3, { color: colors.danger }]}>
            {t('child.remoteLockTitle')}
          </Text>
          <Text style={typography.small}>{t('child.remoteLockBody')}</Text>
        </Card>
      ) : null}

      {status.bedtimeActive ? (
        <Card style={{ borderColor: colors.warning, backgroundColor: colors.warningSoft }}>
          <Text style={{ fontSize: 28 }}>🌙</Text>
          <Text style={[typography.h3, { color: colors.warning }]}>
            {t('child.bedtimeTitle')}
          </Text>
          <Text style={typography.small}>{t('child.bedtimeBody')}</Text>
        </Card>
      ) : null}

      {status.homeworkActive ? (
        <Card style={{ borderColor: colors.primary }}>
          <Text style={{ fontSize: 28 }}>📚</Text>
          <Text style={[typography.h3, { color: colors.primary }]}>
            {t('child.homeworkTitle')}
          </Text>
          <Text style={typography.small}>{t('child.homeworkBody')}</Text>
        </Card>
      ) : null}

      <Card>
        <Text style={typography.small}>{t('child.timeRemaining')}</Text>
        <Text style={typography.display}>{remaining}</Text>
        {status.bonusMinutes > 0 ? (
          <Text style={[typography.tiny, { color: colors.success }]}>
            +{status.bonusMinutes} min {t('child.rewardSuffix')} 🎁
          </Text>
        ) : null}
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
            <Text
              style={[typography.small, { color: colors.textMuted }]}
              numberOfLines={2}
            >
              {recitationRule.recitationText ?? '...'}
            </Text>
          </View>
          <Text style={{ fontSize: 22 }}>›</Text>
        </Pressable>
      ) : null}

      <View style={{ height: spacing.md }} />

      <View style={styles.tileRow}>
        <Pressable
          onPress={() => nav.navigate('SafeBrowser', {})}
          style={({ pressed }) => [
            styles.tile,
            { backgroundColor: colors.primarySoft },
            pressed && { opacity: 0.85 },
          ]}
        >
          <Text style={{ fontSize: 32 }}>🌐</Text>
          <Text style={typography.bodyStrong}>{t('child.browserTile')}</Text>
          <Text style={[typography.tiny, { color: colors.textMuted }]}>
            {t('child.browserTileDesc')}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => nav.navigate('SOS')}
          style={({ pressed }) => [
            styles.tile,
            { backgroundColor: colors.dangerSoft },
            pressed && { opacity: 0.85 },
          ]}
        >
          <Text style={{ fontSize: 32 }}>🆘</Text>
          <Text style={typography.bodyStrong}>{t('child.sos')}</Text>
          <Text style={[typography.tiny, { color: colors.textMuted }]}>
            {t('child.sosTileDesc')}
          </Text>
        </Pressable>
      </View>

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
        <Text
          style={[
            typography.tiny,
            { color: colors.textMuted, textAlign: 'center' },
          ]}
        >
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
  tileRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  tile: {
    flex: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
