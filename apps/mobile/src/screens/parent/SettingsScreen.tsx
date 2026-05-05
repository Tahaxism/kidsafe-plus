import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Constants from 'expo-constants';

import type { ParentStackParamList } from '@/navigation/types';
import { colors, radii, spacing, typography } from '@/theme';
import { Screen } from '@/components/Screen';
import { Button } from '@/components/Button';
import { useAuthStore } from '@/stores/auth';
import { checkBackend } from '@/services/api';

type Nav = NativeStackNavigationProp<ParentStackParamList, 'Tabs'>;

const Row: React.FC<{
  label: string;
  value?: string;
  onPress?: () => void;
}> = ({ label, value, onPress }) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
  >
    <Text style={typography.body}>{label}</Text>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
      {value ? (
        <Text style={[typography.small, { color: colors.textMuted }]}>
          {value}
        </Text>
      ) : null}
      {onPress ? <Text style={{ color: colors.textMuted, fontSize: 20 }}>›</Text> : null}
    </View>
  </Pressable>
);

export const SettingsScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const nav = useNavigation<Nav>();
  const session = useAuthStore((s) => s.session);
  const signOut = useAuthStore((s) => s.signOut);
  const [backendUp, setBackendUp] = useState<boolean | null>(null);

  useEffect(() => {
    checkBackend().then(setBackendUp);
  }, []);

  return (
    <Screen scroll>
      <Text style={[typography.h1, { marginVertical: spacing.lg }]}>
        {t('parent.settings.title')}
      </Text>

      <Text style={styles.section}>{t('parent.settings.account')}</Text>
      <View style={styles.group}>
        <Row
          label="Email"
          value={session?.kind === 'parent' ? session.email : ''}
        />
        <Row
          label={t('auth.name') as string}
          value={session?.kind === 'parent' ? session.displayName : ''}
        />
      </View>

      <Text style={styles.section}>{t('parent.settings.language')}</Text>
      <View style={styles.group}>
        <Row
          label={t('language.title') as string}
          value={
            i18n.language === 'fr'
              ? 'Français'
              : i18n.language === 'ar'
              ? 'Darija'
              : 'English'
          }
          onPress={() => nav.navigate('Language')}
        />
      </View>

      <Text style={styles.section}>{t('parent.settings.privacy')}</Text>
      <View style={styles.group}>
        <Text style={[typography.small, { color: colors.textMuted, padding: spacing.md }]}>
          {t('parent.settings.monitoringNotice')}
        </Text>
      </View>

      <Text style={styles.section}>{t('parent.settings.backendStatus')}</Text>
      <View style={styles.group}>
        <Row
          label="Backend"
          value={
            backendUp === null
              ? '…'
              : backendUp
              ? '🟢 OK'
              : '🔴 Down'
          }
        />
        <Row
          label="API base"
          value={(Constants.expoConfig?.extra?.apiBaseUrl as string) ?? '-'}
        />
        <Row
          label={t('parent.settings.version') as string}
          value={Constants.expoConfig?.version ?? '0.1.0'}
        />
      </View>

      <View style={{ height: spacing.xl }} />
      <Button
        title={t('auth.logout') as string}
        variant="danger"
        onPress={signOut}
        size="lg"
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  section: {
    ...typography.tiny,
    color: colors.textDim,
    textTransform: 'uppercase',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  group: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
});
