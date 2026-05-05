import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors, spacing, typography } from '@/theme';
import { Screen } from '@/components/Screen';
import { PinInput } from '@/components/PinInput';
import { Button } from '@/components/Button';
import { useAuthStore } from '@/stores/auth';

export const ChildPinScreen: React.FC = () => {
  const { t } = useTranslation();
  const childSignIn = useAuthStore((s) => s.childSignIn);
  const [pin, setPin] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (): Promise<void> => {
    setErr(null);
    setLoading(true);
    try {
      const ok = await childSignIn(pin);
      if (!ok) setErr(t('auth.invalidPin') as string);
    } finally {
      setLoading(false);
    }
  };

  // Auto-submit when 4 digits entered
  useEffect(() => {
    if (pin.length === 4 && !loading) {
      void onSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  return (
    <Screen>
      <View style={styles.center}>
        <Text style={styles.title}>{t('auth.pinTitle')}</Text>
        <Text style={styles.sub}>{t('auth.pinSub')}</Text>
        <View style={{ height: spacing.xl }} />
        <PinInput value={pin} onChange={setPin} error={err ?? undefined} />
      </View>
      <Button
        title={t('auth.login') as string}
        onPress={onSubmit}
        loading={loading}
        disabled={pin.length !== 4}
        size="lg"
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.xxl,
  },
  title: { ...typography.h1, textAlign: 'center' },
  sub: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
