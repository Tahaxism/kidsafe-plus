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
import { startUsageReporting } from '@/services/usage';
import { setAuthToken } from '@/services/api';
import { getFirebaseAuth, isFirebaseConfigured } from '@/services/firebase';

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

  // Refresh the Firebase ID token used by the backend's `/report` and
  // `/notifications` endpoints. Runs whenever the Firebase auth user changes
  // and proactively every 30 minutes (tokens are valid for 1h).
  useEffect(() => {
    if (!isFirebaseConfigured) return;
    const auth = getFirebaseAuth();
    const refresh = async (): Promise<void> => {
      const u = auth.currentUser;
      if (!u) {
        setAuthToken(null);
        return;
      }
      try {
        const tok = await u.getIdToken();
        setAuthToken(tok);
      } catch {
        setAuthToken(null);
      }
    };
    void refresh();
    const unsub = auth.onIdTokenChanged(() => void refresh());
    const id = setInterval(() => void refresh(), 30 * 60_000);
    return () => {
      unsub();
      clearInterval(id);
    };
  }, []);

  // Side-effect: when a parent logs in, register their FCM token.
  // When a child logs in, start background location tracking + usage reporting.
  useEffect(() => {
    if (!session) return;
    let stopUsage: (() => void) | null = null;
    if (session.kind === 'parent') {
      void registerParentDevice(session.uid);
    } else if (session.kind === 'child') {
      void startBackgroundTracking(session.childId);
      stopUsage = startUsageReporting(session.childId);
    }
    return () => {
      stopUsage?.();
    };
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
