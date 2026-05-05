import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Switch, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRoute, type RouteProp } from '@react-navigation/native';

import type { ParentStackParamList } from '@/navigation/types';
import { colors, radii, spacing, typography } from '@/theme';
import { Screen } from '@/components/Screen';
import { addRule, subscribeChildRules } from '@/services/rules';
import type { Rule } from '@/types';

type Rt = RouteProp<ParentStackParamList, 'AppBlocking'>;

interface AppEntry {
  pkg: string;
  name: string;
  category: string;
  emoji: string;
}

// Common Android apps the parent might want to block. The native module (added
// later) replaces this with the actual installed-app list from the child device.
const KNOWN_APPS: AppEntry[] = [
  { pkg: 'com.google.android.youtube', name: 'YouTube', category: 'Video', emoji: '📺' },
  { pkg: 'com.zhiliaoapp.musically', name: 'TikTok', category: 'Social', emoji: '🎵' },
  { pkg: 'com.instagram.android', name: 'Instagram', category: 'Social', emoji: '📸' },
  { pkg: 'com.snapchat.android', name: 'Snapchat', category: 'Social', emoji: '👻' },
  { pkg: 'com.whatsapp', name: 'WhatsApp', category: 'Chat', emoji: '💬' },
  { pkg: 'com.facebook.katana', name: 'Facebook', category: 'Social', emoji: '📘' },
  { pkg: 'com.discord', name: 'Discord', category: 'Chat', emoji: '🎮' },
  { pkg: 'com.netflix.mediaclient', name: 'Netflix', category: 'Video', emoji: '🎬' },
  { pkg: 'com.king.candycrushsaga', name: 'Candy Crush', category: 'Games', emoji: '🍬' },
  { pkg: 'com.roblox.client', name: 'Roblox', category: 'Games', emoji: '🟦' },
  { pkg: 'com.mojang.minecraftpe', name: 'Minecraft', category: 'Games', emoji: '⛏️' },
  { pkg: 'com.spotify.music', name: 'Spotify', category: 'Music', emoji: '🎧' },
];

export const AppBlockingScreen: React.FC = () => {
  const { t } = useTranslation();
  const { childId } = useRoute<Rt>().params;
  const [rules, setRules] = useState<Rule[]>([]);

  useEffect(() => subscribeChildRules(childId, setRules), [childId]);

  const isBlocked = (pkg: string): boolean => {
    // last write wins on this packageName
    let blocked = false;
    for (const r of [...rules].reverse()) {
      if (
        r.kind === 'block_app' &&
        (r.payload as { packageName?: string }).packageName === pkg &&
        r.active
      ) {
        blocked = true;
      }
      if (
        r.kind === 'unblock_app' &&
        (r.payload as { packageName?: string }).packageName === pkg
      ) {
        blocked = false;
      }
    }
    return blocked;
  };

  const toggle = async (entry: AppEntry, on: boolean): Promise<void> => {
    await addRule(childId, {
      kind: on ? 'block_app' : 'unblock_app',
      payload: { childId, packageName: entry.pkg, name: entry.name },
      createdBy: 'parent',
    });
  };

  return (
    <Screen padded={false}>
      <View style={{ paddingHorizontal: spacing.lg }}>
        <Text style={[typography.h1, { marginVertical: spacing.lg }]}>
          {t('parent.blocking.title')}
        </Text>
      </View>
      <FlatList
        data={KNOWN_APPS}
        keyExtractor={(a) => a.pkg}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}
        renderItem={({ item }) => {
          const blocked = isBlocked(item.pkg);
          return (
            <View style={styles.row}>
              <Text style={{ fontSize: 26 }}>{item.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={typography.bodyStrong}>{item.name}</Text>
                <Text style={[typography.tiny, { color: colors.textMuted }]}>
                  {item.category}
                </Text>
              </View>
              <Switch
                value={blocked}
                onValueChange={(v) => toggle(item, v)}
                trackColor={{ true: colors.danger, false: colors.border }}
              />
            </View>
          );
        }}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
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
