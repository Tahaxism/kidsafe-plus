import React, { useCallback, useEffect, useState } from 'react';
import {
  AppState,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors, radii, spacing, typography } from '@/theme';
import { Screen } from '@/components/Screen';
import { Native } from '@/services/native';

interface PermissionState {
  usageAccess: boolean;
  deviceAdmin: boolean;
  accessibility: boolean;
  overlay: boolean;
}

export const NativePermissionsScreen: React.FC = () => {
  const { t } = useTranslation();
  const [perms, setPerms] = useState<PermissionState>({
    usageAccess: false,
    deviceAdmin: false,
    accessibility: false,
    overlay: false,
  });
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async (): Promise<void> => {
    setBusy(true);
    try {
      const [u, d, a, o] = await Promise.all([
        Native.hasUsageAccess(),
        Native.isDeviceAdminActive(),
        Native.isAccessibilityEnabled(),
        Native.hasOverlayPermission(),
      ]);
      setPerms({ usageAccess: u, deviceAdmin: d, accessibility: a, overlay: o });
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  const Row: React.FC<{
    title: string;
    desc: string;
    enabled: boolean;
    onPress: () => void;
  }> = ({ title, desc, enabled, onPress }) => (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
    >
      <View style={{ flex: 1 }}>
        <Text style={typography.bodyStrong}>{title}</Text>
        <Text style={[typography.small, { color: colors.textMuted }]}>
          {desc}
        </Text>
      </View>
      <View
        style={[
          styles.pill,
          { backgroundColor: enabled ? colors.successSoft : colors.warningSoft },
        ]}
      >
        <Text
          style={[
            typography.tiny,
            { color: enabled ? colors.success : colors.warning },
          ]}
        >
          {enabled ? t('common.on') : t('common.off')}
        </Text>
      </View>
    </Pressable>
  );

  return (
    <Screen padded={false}>
      <ScrollView
        contentContainerStyle={{
          padding: spacing.lg,
          paddingBottom: spacing.xxxl,
          gap: spacing.md,
        }}
        refreshControl={
          <RefreshControl refreshing={busy} onRefresh={refresh} tintColor={colors.primary} />
        }
      >
        <Text style={typography.h1}>{t('parent.native.title')}</Text>
        <Text style={[typography.small, { color: colors.textMuted }]}>
          {t('parent.native.intro')}
        </Text>

        <View style={styles.group}>
          <Row
            title={t('parent.native.usageAccess') as string}
            desc={t('parent.native.usageAccessDesc') as string}
            enabled={perms.usageAccess}
            onPress={() => Native.openUsageAccessSettings()}
          />
          <Row
            title={t('parent.native.deviceAdmin') as string}
            desc={t('parent.native.deviceAdminDesc') as string}
            enabled={perms.deviceAdmin}
            onPress={() => Native.requestDeviceAdmin()}
          />
          <Row
            title={t('parent.native.accessibility') as string}
            desc={t('parent.native.accessibilityDesc') as string}
            enabled={perms.accessibility}
            onPress={() => Native.openAccessibilitySettings()}
          />
          <Row
            title={t('parent.native.overlay') as string}
            desc={t('parent.native.overlayDesc') as string}
            enabled={perms.overlay}
            onPress={() => Native.openOverlaySettings()}
          />
        </View>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
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
    gap: spacing.md,
    padding: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  pill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
});
