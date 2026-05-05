import React, { useEffect, useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRoute, type RouteProp } from '@react-navigation/native';

import type { ParentStackParamList } from '@/navigation/types';
import { colors, radii, spacing, typography } from '@/theme';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { useChildrenStore } from '@/stores/children';
import { updateChild } from '@/services/children';
import { addRule, subscribeChildRules } from '@/services/rules';
import type { Rule } from '@/types';

type Rt = RouteProp<ParentStackParamList, 'ScreenTime'>;

const PRESETS = [60, 90, 120, 180, 240];

export const ScreenTimeScreen: React.FC = () => {
  const { t } = useTranslation();
  const { childId } = useRoute<Rt>().params;
  const child = useChildrenStore((s) =>
    s.children.find((c) => c.id === childId),
  );
  const [limit, setLimit] = useState<number>(child?.dailyLimitMinutes ?? 120);
  const [rules, setRules] = useState<Rule[]>([]);

  useEffect(
    () => subscribeChildRules(childId, setRules),
    [childId],
  );

  const bedtimeRule = rules.find(
    (r) => r.kind === 'bedtime_mode' && r.active,
  );
  const homeworkRule = rules.find(
    (r) => r.kind === 'homework_mode' && r.active,
  );

  const onSaveLimit = async (m: number): Promise<void> => {
    setLimit(m);
    await updateChild(childId, { dailyLimitMinutes: m });
    await addRule(childId, {
      kind: 'screen_time_limit',
      payload: { childId, dailyLimitMinutes: m },
      createdBy: 'parent',
    });
  };

  const toggleBedtime = async (on: boolean): Promise<void> => {
    if (on) {
      await addRule(childId, {
        kind: 'bedtime_mode',
        payload: { childId, start: '21:00', end: '07:00' },
        createdBy: 'parent',
      });
    } else if (bedtimeRule) {
      // Soft toggle: add a counter-rule (we don't delete in this simple impl)
      await addRule(childId, {
        kind: 'bedtime_mode',
        payload: { childId, off: true },
        active: false,
        createdBy: 'parent',
      });
    }
  };

  const toggleHomework = async (on: boolean): Promise<void> => {
    if (on) {
      await addRule(childId, {
        kind: 'homework_mode',
        payload: { childId, start: '17:00', end: '19:00' },
        createdBy: 'parent',
      });
    } else if (homeworkRule) {
      await addRule(childId, {
        kind: 'homework_mode',
        payload: { childId, off: true },
        active: false,
        createdBy: 'parent',
      });
    }
  };

  return (
    <Screen scroll>
      <Text style={[typography.h1, { marginVertical: spacing.lg }]}>
        {t('parent.screenTime.title')}
      </Text>

      <Card>
        <Text style={typography.h3}>{t('parent.screenTime.dailyLimit')}</Text>
        <Text style={styles.bigNumber}>{limit} min</Text>
        <View style={styles.presetRow}>
          {PRESETS.map((m) => (
            <Button
              key={m}
              title={`${m}m`}
              variant={m === limit ? 'primary' : 'secondary'}
              size="sm"
              onPress={() => void onSaveLimit(m)}
            />
          ))}
        </View>
      </Card>

      <View style={{ height: spacing.md }} />

      <Card>
        <View style={styles.rowBetween}>
          <View style={{ flex: 1 }}>
            <Text style={typography.bodyStrong}>
              {t('parent.screenTime.bedtime')}
            </Text>
            <Text style={[typography.small, { color: colors.textMuted }]}>
              {t('parent.screenTime.bedtimeDesc')}
            </Text>
          </View>
          <Switch
            value={!!bedtimeRule}
            onValueChange={toggleBedtime}
            trackColor={{ true: colors.primary, false: colors.border }}
          />
        </View>
      </Card>

      <View style={{ height: spacing.md }} />

      <Card>
        <View style={styles.rowBetween}>
          <View style={{ flex: 1 }}>
            <Text style={typography.bodyStrong}>
              {t('parent.screenTime.homework')}
            </Text>
            <Text style={[typography.small, { color: colors.textMuted }]}>
              {t('parent.screenTime.homeworkDesc')}
            </Text>
          </View>
          <Switch
            value={!!homeworkRule}
            onValueChange={toggleHomework}
            trackColor={{ true: colors.primary, false: colors.border }}
          />
        </View>
      </Card>
    </Screen>
  );
};

const styles = StyleSheet.create({
  bigNumber: { ...typography.display, color: colors.primary, marginVertical: spacing.md },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
});
