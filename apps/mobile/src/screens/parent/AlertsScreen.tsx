import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';

import { colors, radii, spacing, typography } from '@/theme';
import { Screen } from '@/components/Screen';
import { useAuthStore } from '@/stores/auth';
import { useChildrenStore } from '@/stores/children';
import { subscribeAlerts, markAlertRead } from '@/services/rules';
import type { SafetyAlert } from '@/types';

const iconFor = (k: SafetyAlert['kind']): string => {
  switch (k) {
    case 'bullying':
      return '⚠️';
    case 'time_limit':
      return '⏱️';
    case 'geofence':
      return '📍';
    case 'recite_fail':
      return '📖';
    case 'recite_ok':
      return '✅';
    case 'sos':
      return '🚨';
    case 'app_blocked':
      return '🚫';
    case 'risky_url':
      return '🌐';
    default:
      return '🔔';
  }
};

export const AlertsScreen: React.FC = () => {
  const { t } = useTranslation();
  const session = useAuthStore((s) => s.session);
  const children = useChildrenStore((s) => s.children);
  const refresh = useChildrenStore((s) => s.refresh);
  const [alerts, setAlerts] = useState<SafetyAlert[]>([]);

  useEffect(() => {
    if (session?.kind === 'parent') void refresh(session.uid);
  }, [session, refresh]);

  useEffect(() => {
    const ids = children.map((c) => c.id);
    if (ids.length === 0) {
      setAlerts([]);
      return;
    }
    return subscribeAlerts(ids, setAlerts);
  }, [children]);

  return (
    <Screen>
      <Text style={[typography.h1, { marginVertical: spacing.lg }]}>
        {t('parent.alerts.title')}
      </Text>
      {alerts.length === 0 ? (
        <Text style={[typography.body, { color: colors.textMuted }]}>
          {t('parent.alerts.empty')}
        </Text>
      ) : (
        <FlatList
          data={alerts}
          keyExtractor={(a) => a.id}
          contentContainerStyle={{ gap: spacing.sm }}
          renderItem={({ item }) => (
            <View
              style={[
                styles.row,
                {
                  borderColor:
                    item.severity === 'high'
                      ? colors.danger
                      : item.severity === 'warn'
                      ? colors.warning
                      : colors.border,
                },
              ]}
            >
              <Text style={styles.icon}>{iconFor(item.kind)}</Text>
              <View style={{ flex: 1 }}>
                <Text style={typography.bodyStrong}>{item.title}</Text>
                <Text
                  style={[typography.small, { color: colors.textMuted }]}
                >
                  {item.description}
                </Text>
                <Text style={[typography.tiny, { color: colors.textDim, marginTop: 4 }]}>
                  {dayjs(item.createdAt).format('DD/MM HH:mm')}
                </Text>
              </View>
              {!item.read ? (
                <View
                  style={[styles.unread, { backgroundColor: colors.primary }]}
                />
              ) : null}
            </View>
          )}
          onEndReached={() => {
            // mark first 5 as read for demo
            alerts
              .filter((a) => !a.read)
              .slice(0, 5)
              .forEach((a) => void markAlertRead(a.id));
          }}
        />
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  icon: { fontSize: 24 },
  unread: { width: 8, height: 8, borderRadius: 4 },
});
