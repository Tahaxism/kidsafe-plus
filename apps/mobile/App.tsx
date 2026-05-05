import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { initI18n } from '@/i18n';
import { RootNavigator } from '@/navigation/RootNavigator';
import { useAuthStore } from '@/stores/auth';
import { colors } from '@/theme';
import {
  registerParentDevice,
  ensureNotificationChannel,
} from '@/services/notifications';
import { startBackgroundTracking } from '@/services/location';

export default function App(): React.ReactElement {
  const [ready, setReady] = useState(false);
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const session = useAuthStore((s) => s.session);

  useEffect(() => {
    (async () => {
      await initI18n();
      await bootstrap();
      await ensureNotificationChannel();
      setReady(true);
    })();
  }, [bootstrap]);

  // Side-effect: when a parent logs in, register their FCM token.
  // When a child logs in, start background location tracking.
  useEffect(() => {
    if (!session) return;
    if (session.kind === 'parent') {
      void registerParentDevice(session.uid);
    } else if (session.kind === 'child') {
      void startBackgroundTracking(session.childId);
    }
  }, [session]);

  if (!ready) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <RootNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
