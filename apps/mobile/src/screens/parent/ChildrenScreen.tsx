import React, { useEffect } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { ParentStackParamList } from '@/navigation/types';
import { colors, radii, spacing, typography } from '@/theme';
import { Screen } from '@/components/Screen';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { useAuthStore } from '@/stores/auth';
import { useChildrenStore } from '@/stores/children';

type Nav = NativeStackNavigationProp<ParentStackParamList, 'Tabs'>;

export const ChildrenScreen: React.FC = () => {
  const { t } = useTranslation();
  const nav = useNavigation<Nav>();
  const session = useAuthStore((s) => s.session);
  const children = useChildrenStore((s) => s.children);
  const refresh = useChildrenStore((s) => s.refresh);

  useEffect(() => {
    if (session?.kind === 'parent') void refresh(session.uid);
  }, [session, refresh]);

  return (
    <Screen>
      <View style={styles.headerRow}>
        <Text style={typography.h1}>{t('parent.children.title')}</Text>
        <Button
          title={t('parent.children.add') as string}
          onPress={() => nav.navigate('AddChild')}
          size="sm"
        />
      </View>
      <FlatList
        data={children}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ paddingTop: spacing.md, gap: spacing.sm }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => nav.navigate('ChildDetail', { childId: item.id })}
            style={styles.row}
          >
            <Avatar name={item.name} color={item.avatarColor} />
            <View style={{ flex: 1 }}>
              <Text style={typography.bodyStrong}>{item.name}</Text>
              <Text style={[typography.small, { color: colors.textMuted }]}>
                {t('parent.screenTime.dailyLimit')}:{' '}
                {item.dailyLimitMinutes ?? 120} min
              </Text>
            </View>
            <Text style={{ color: colors.textMuted, fontSize: 22 }}>›</Text>
          </Pressable>
        )}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
});
