import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRoute, type RouteProp } from '@react-navigation/native';

import type { ParentStackParamList } from '@/navigation/types';
import { colors, radii, spacing, typography } from '@/theme';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { addRule, subscribeChildRules } from '@/services/rules';
import type { Rule } from '@/types';

type Rt = RouteProp<ParentStackParamList, 'WebFilter'>;

const STARTER_BLOCKLIST = [
  'pornhub.com',
  'xvideos.com',
  'xnxx.com',
  '4chan.org',
  '8kun.top',
];

export const WebFilterScreen: React.FC = () => {
  const { t } = useTranslation();
  const { childId } = useRoute<Rt>().params;
  const [rules, setRules] = useState<Rule[]>([]);
  const [domain, setDomain] = useState('');

  useEffect(() => subscribeChildRules(childId, setRules), [childId]);

  const blocked = new Set<string>(STARTER_BLOCKLIST);
  for (const r of rules) {
    const d = (r.payload as { domain?: string }).domain;
    if (!d) continue;
    if (r.kind === 'web_blocklist_add' && r.active) blocked.add(d);
    if (r.kind === 'web_blocklist_remove') blocked.delete(d);
  }
  const safeSearchOn = rules.some(
    (r) =>
      r.kind === 'block_category' &&
      (r.payload as { name?: string }).name === 'safe_search' &&
      r.active,
  );

  const addDomain = async (): Promise<void> => {
    const d = domain.trim().toLowerCase();
    if (!d || !d.includes('.')) {
      Alert.alert('Invalid domain');
      return;
    }
    await addRule(childId, {
      kind: 'web_blocklist_add',
      payload: { childId, domain: d },
      createdBy: 'parent',
    });
    setDomain('');
  };

  const removeDomain = async (d: string): Promise<void> => {
    await addRule(childId, {
      kind: 'web_blocklist_remove',
      payload: { childId, domain: d },
      createdBy: 'parent',
    });
  };

  const toggleSafeSearch = async (on: boolean): Promise<void> => {
    await addRule(childId, {
      kind: 'block_category',
      payload: { childId, name: 'safe_search', enabled: on },
      active: on,
      createdBy: 'parent',
    });
  };

  return (
    <Screen padded={false}>
      <View style={{ paddingHorizontal: spacing.lg }}>
        <Text style={[typography.h1, { marginVertical: spacing.lg }]}>
          {t('parent.web.title')}
        </Text>

        <Card>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1 }}>
              <Text style={typography.bodyStrong}>
                {t('parent.web.safeSearch')}
              </Text>
              <Text style={[typography.small, { color: colors.textMuted }]}>
                {t('parent.web.safeSearchDesc')}
              </Text>
            </View>
            <Switch
              value={safeSearchOn}
              onValueChange={toggleSafeSearch}
              trackColor={{ true: colors.primary, false: colors.border }}
            />
          </View>
        </Card>

        <View style={{ height: spacing.md }} />

        <Text style={[typography.h3, { marginBottom: spacing.sm }]}>
          {t('parent.web.blocklist')}
        </Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Input
              value={domain}
              onChangeText={setDomain}
              placeholder="example.com"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <Button title="+" onPress={addDomain} size="md" />
        </View>
      </View>

      <FlatList
        data={Array.from(blocked).sort()}
        keyExtractor={(d) => d}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.xs }}
        renderItem={({ item }) => (
          <View style={styles.domainRow}>
            <Text style={typography.body}>{item}</Text>
            <Pressable onPress={() => removeDomain(item)}>
              <Text style={{ color: colors.danger }}>✕</Text>
            </Pressable>
          </View>
        )}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  domainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
