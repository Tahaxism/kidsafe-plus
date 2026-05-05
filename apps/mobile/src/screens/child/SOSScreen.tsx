import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';

import { colors, spacing, typography } from '@/theme';
import { Screen } from '@/components/Screen';
import { Button } from '@/components/Button';
import { useAuthStore } from '@/stores/auth';
import { addAlert } from '@/services/rules';

export const ChildSOSScreen: React.FC = () => {
  const { t } = useTranslation();
  const nav = useNavigation();
  const session = useAuthStore((s) => s.session);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const onSend = async (): Promise<void> => {
    if (session?.kind !== 'child') return;
    Alert.alert(
      t('child.sos') as string,
      t('child.sosConfirm') as string,
      [
        { text: t('common.cancel') as string, style: 'cancel' },
        {
          text: t('common.confirm') as string,
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            let lat: number | undefined;
            let lon: number | undefined;
            try {
              const perm = await Location.requestForegroundPermissionsAsync();
              if (perm.status === 'granted') {
                const pos = await Location.getCurrentPositionAsync({
                  accuracy: Location.Accuracy.Balanced,
                });
                lat = pos.coords.latitude;
                lon = pos.coords.longitude;
              }
            } catch {
              // ignore
            }
            await addAlert({
              childId: session.childId,
              kind: 'sos',
              title: t('parent.alerts.sos') as string,
              description: `${session.name} a déclenché un SOS`,
              severity: 'high',
              metadata: lat && lon ? { lat, lon } : {},
            });
            setSent(true);
            setBusy(false);
          },
        },
      ],
    );
  };

  return (
    <Screen>
      <View style={styles.center}>
        <Text style={{ fontSize: 80 }}>{sent ? '✅' : '🚨'}</Text>
        <Text style={[typography.h1, { textAlign: 'center' }]}>
          {sent ? t('child.sosSent') : t('child.sos')}
        </Text>
      </View>
      {!sent ? (
        <Button
          title={t('child.sos') as string}
          variant="danger"
          onPress={onSend}
          loading={busy}
          size="lg"
        />
      ) : (
        <Button
          title={t('common.continue') as string}
          onPress={() => nav.goBack()}
          size="lg"
        />
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
});
