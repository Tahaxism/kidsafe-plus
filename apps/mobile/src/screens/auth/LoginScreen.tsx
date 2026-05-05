import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { AuthStackParamList } from '@/navigation/types';
import { colors, spacing, typography } from '@/theme';
import { Screen } from '@/components/Screen';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { useAuthStore } from '@/stores/auth';
import { isFirebaseConfigured } from '@/services/firebase';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

export const LoginScreen: React.FC = () => {
  const { t } = useTranslation();
  const nav = useNavigation<Nav>();
  const parentSignIn = useAuthStore((s) => s.parentSignIn);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async (): Promise<void> => {
    setErr(null);
    if (!email.includes('@')) {
      setErr(t('auth.invalidEmail') as string);
      return;
    }
    if (password.length < 6) {
      setErr(t('auth.weakPassword') as string);
      return;
    }
    setLoading(true);
    try {
      await parentSignIn(email.trim(), password);
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : (t('auth.loginFailed') as string);
      setErr(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll>
      <Text style={styles.heading}>{t('auth.login')}</Text>

      {!isFirebaseConfigured && (
        <View style={styles.warn}>
          <Text style={styles.warnText}>
            ⚠️ Firebase is not configured. See FIREBASE_SETUP.md.
          </Text>
        </View>
      )}

      <Input
        label={t('auth.email') as string}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="emailAddress"
      />
      <Input
        label={t('auth.password') as string}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        textContentType="password"
      />
      {err ? <Text style={styles.err}>{err}</Text> : null}
      <Button
        title={t('auth.login') as string}
        onPress={onSubmit}
        loading={loading}
        size="lg"
      />
      <Pressable onPress={() => nav.navigate('Signup')} style={styles.link}>
        <Text style={styles.linkText}>
          {t('auth.needAccount')}{' '}
          <Text style={styles.linkAccent}>{t('auth.signup')}</Text>
        </Text>
      </Pressable>
    </Screen>
  );
};

const styles = StyleSheet.create({
  heading: { ...typography.h1, marginBottom: spacing.lg },
  err: { ...typography.small, color: colors.danger, marginBottom: spacing.md },
  link: { alignItems: 'center', marginTop: spacing.lg },
  linkText: { ...typography.body, color: colors.textMuted },
  linkAccent: { color: colors.primary, fontWeight: '700' },
  warn: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.warning,
    borderWidth: 1,
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.lg,
  },
  warnText: { ...typography.small, color: colors.warning },
});
