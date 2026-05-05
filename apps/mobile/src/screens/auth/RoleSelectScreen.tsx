import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { AuthStackParamList } from '@/navigation/types';
import { colors, radii, spacing, typography } from '@/theme';
import { Screen } from '@/components/Screen';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'RoleSelect'>;

interface RoleCardProps {
  emoji: string;
  title: string;
  desc: string;
  onPress: () => void;
}

const RoleCard: React.FC<RoleCardProps> = ({ emoji, title, desc, onPress }) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
  >
    <Text style={styles.emoji}>{emoji}</Text>
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.desc}>{desc}</Text>
  </Pressable>
);

export const RoleSelectScreen: React.FC = () => {
  const { t } = useTranslation();
  const nav = useNavigation<Nav>();
  return (
    <Screen>
      <Text style={styles.heading}>{t('role.title')}</Text>
      <View style={styles.row}>
        <RoleCard
          emoji="👨‍👩‍👧"
          title={t('role.parent') as string}
          desc={t('role.parentDesc') as string}
          onPress={() => nav.navigate('Login')}
        />
        <RoleCard
          emoji="🧒"
          title={t('role.child') as string}
          desc={t('role.childDesc') as string}
          onPress={() => nav.navigate('ChildPin')}
        />
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  heading: { ...typography.h1, marginVertical: spacing.lg },
  row: { gap: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  emoji: { fontSize: 40 },
  title: { ...typography.h2 },
  desc: { ...typography.body, color: colors.textMuted },
});
