import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';

import { colors, radii, spacing, typography } from '@/theme';
import { Screen } from '@/components/Screen';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { useAuthStore } from '@/stores/auth';
import { useChildrenStore } from '@/stores/children';

export const AddChildScreen: React.FC = () => {
  const { t } = useTranslation();
  const nav = useNavigation();
  const session = useAuthStore((s) => s.session);
  const add = useChildrenStore((s) => s.add);

  const [name, setName] = useState('');
  const [created, setCreated] = useState<{ pin: string; name: string } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onCreate = async (): Promise<void> => {
    if (session?.kind !== 'parent') return;
    if (!name.trim()) {
      setErr(t('parent.children.childName') as string);
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const r = await add(session.uid, name.trim());
      setCreated({ pin: r.pin, name: r.child.name });
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
  };

  if (created) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg }}>
          <Text style={{ fontSize: 48 }}>🎉</Text>
          <Text style={typography.h2}>{created.name}</Text>
          <Text style={[typography.body, { color: colors.textMuted, textAlign: 'center' }]}>
            {t('parent.children.created')}
          </Text>
          <View style={styles.pinBox}>
            <Text style={typography.small}>{t('parent.children.childPin')}</Text>
            <Text style={styles.pinText}>{created.pin}</Text>
          </View>
        </View>
        <Button
          title={t('common.continue') as string}
          onPress={() => nav.goBack()}
          size="lg"
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={[typography.h1, { marginVertical: spacing.lg }]}>
        {t('parent.children.addTitle')}
      </Text>
      <Input
        label={t('parent.children.childName') as string}
        value={name}
        onChangeText={setName}
      />
      {err ? (
        <Text style={{ color: colors.danger, marginBottom: spacing.md }}>
          {err}
        </Text>
      ) : null}
      <Button
        title={t('parent.children.generatePin') as string}
        onPress={() =>
          Alert.alert(
            t('parent.children.generatePin') as string,
            t('parent.children.created') as string,
            [
              { text: t('common.cancel') as string, style: 'cancel' },
              { text: t('common.confirm') as string, onPress: onCreate },
            ],
          )
        }
        loading={busy}
        size="lg"
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  pinBox: {
    backgroundColor: colors.surface,
    borderColor: colors.primary,
    borderWidth: 2,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  pinText: {
    fontSize: 40,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 8,
  },
});
