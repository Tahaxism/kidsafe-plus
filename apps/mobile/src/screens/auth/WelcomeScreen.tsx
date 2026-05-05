import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { AuthStackParamList } from '@/navigation/types';
import { colors, spacing, typography } from '@/theme';
import { Screen } from '@/components/Screen';
import { Button } from '@/components/Button';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Welcome'>;

export const WelcomeScreen: React.FC = () => {
  const { t } = useTranslation();
  const nav = useNavigation<Nav>();
  return (
    <Screen>
      <View style={styles.center}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoEmoji}>🛡️</Text>
        </View>
        <Text style={styles.title}>{t('app.name')}</Text>
        <Text style={styles.tagline}>{t('app.tagline')}</Text>
      </View>
      <View style={styles.actions}>
        <Button
          title={t('common.continue') as string}
          onPress={() => nav.navigate('RoleSelect')}
          size="lg"
        />
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
  },
  logoCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  logoEmoji: { fontSize: 48 },
  title: { ...typography.display, textAlign: 'center' },
  tagline: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
  actions: { paddingBottom: spacing.xl, gap: spacing.md },
});
