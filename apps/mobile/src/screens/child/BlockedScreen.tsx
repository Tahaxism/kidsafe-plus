import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRoute, type RouteProp } from '@react-navigation/native';

import type { ChildStackParamList } from '@/navigation/types';
import { colors, spacing, typography } from '@/theme';
import { Screen } from '@/components/Screen';

type Rt = RouteProp<ChildStackParamList, 'Blocked'>;

export const ChildBlockedScreen: React.FC = () => {
  const { t } = useTranslation();
  const { appName, reason } = useRoute<Rt>().params;
  return (
    <Screen>
      <View style={styles.center}>
        <Text style={{ fontSize: 64 }}>🚫</Text>
        <Text style={typography.h1}>{appName ?? t('child.blockedTitle')}</Text>
        {reason ? (
          <Text style={[typography.body, { color: colors.textMuted, textAlign: 'center' }]}>
            {reason}
          </Text>
        ) : null}
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
});
