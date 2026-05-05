import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';

import { changeLanguage, SupportedLanguage } from '@/i18n';
import { colors, radii, spacing, typography } from '@/theme';
import { Screen } from '@/components/Screen';

const OPTIONS: { code: SupportedLanguage; label: string; flag: string }[] = [
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'ar', label: 'Darija (العربية)', flag: '🇲🇦' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
];

export const LanguageScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const nav = useNavigation();

  const onSelect = async (code: SupportedLanguage): Promise<void> => {
    if (code === i18n.language) return;
    await changeLanguage(code);
    if (code === 'ar' || i18n.language === 'ar') {
      Alert.alert(
        t('language.title') as string,
        'Restart the app for layout direction to apply (Arabic = RTL).',
      );
    }
    nav.goBack();
  };

  return (
    <Screen>
      <Text style={[typography.h1, { marginVertical: spacing.lg }]}>
        {t('language.title')}
      </Text>
      <View style={{ gap: spacing.sm }}>
        {OPTIONS.map((o) => {
          const active = i18n.language === o.code;
          return (
            <Pressable
              key={o.code}
              onPress={() => onSelect(o.code)}
              style={[
                styles.row,
                active && { borderColor: colors.primary },
              ]}
            >
              <Text style={{ fontSize: 24 }}>{o.flag}</Text>
              <Text style={[typography.bodyStrong, { flex: 1 }]}>
                {o.label}
              </Text>
              {active ? <Text style={{ color: colors.primary }}>✓</Text> : null}
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
});
