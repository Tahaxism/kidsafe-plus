import React, { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { AuthStackParamList } from '@/navigation/types';
import { colors, spacing, typography } from '@/theme';
import { Screen } from '@/components/Screen';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { useAuthStore } from '@/stores/auth';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Signup'>;

export const SignupScreen: React.FC = () => {
  const { t } = useTranslation();
  const nav = useNavigation<Nav>();
  const parentSignUp = useAuthStore((s) => s.parentSignUp);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async (): Promise<void> => {
    setErr(null);
    if (!name.trim()) {
      setErr(t('auth.name') as string);
      return;
    }
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
      await parentSignUp(email.trim(), password, name.trim());
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : (t('auth.signupFailed') as string);
      setErr(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll>
      <Text style={styles.heading}>{t('auth.signup')}</Text>
      <Input
        label={t('auth.name') as string}
        value={name}
        onChangeText={setName}
      />
      <Input
        label={t('auth.email') as string}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Input
        label={t('auth.password') as string}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      {err ? <Text style={styles.err}>{err}</Text> : null}
      <Button
        title={t('auth.signup') as string}
        onPress={onSubmit}
        loading={loading}
        size="lg"
      />
      <Pressable onPress={() => nav.navigate('Login')} style={styles.link}>
        <Text style={styles.linkText}>
          {t('auth.hasAccount')}{' '}
          <Text style={styles.linkAccent}>{t('auth.login')}</Text>
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
});
