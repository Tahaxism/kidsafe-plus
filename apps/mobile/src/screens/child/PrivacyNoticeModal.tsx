import React, { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/Button';
import { colors, radii, spacing, typography } from '@/theme';

const ACK_KEY = 'kidsafe.privacy_ack.v1';

interface Props {
  childId: string;
}

/**
 * One-shot consent / transparency modal shown to the child on first sign-in.
 * Required by most jurisdictions before recording, monitoring SMS, or
 * tracking location. Stored in SecureStore keyed by childId so it survives
 * sign-out but resets if a new child profile takes over the device.
 */
export const PrivacyNoticeModal: React.FC<Props> = ({ childId }) => {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const seen = await SecureStore.getItemAsync(`${ACK_KEY}.${childId}`);
        if (!cancelled && !seen) setVisible(true);
      } catch {
        if (!cancelled) setVisible(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [childId]);

  const ack = async (): Promise<void> => {
    try {
      await SecureStore.setItemAsync(`${ACK_KEY}.${childId}`, '1');
    } catch {
      // ignore — worst case, modal shows again next time
    }
    setVisible(false);
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={() => undefined}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={typography.h2}>{t('child.privacy.title')}</Text>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={{ gap: spacing.sm }}
          >
            <Text style={typography.body}>{t('child.privacy.intro')}</Text>
            <Text style={typography.bodyStrong}>
              {t('child.privacy.whatTitle')}
            </Text>
            <Text style={typography.body}>{t('child.privacy.what1')}</Text>
            <Text style={typography.body}>{t('child.privacy.what2')}</Text>
            <Text style={typography.body}>{t('child.privacy.what3')}</Text>
            <Text style={typography.body}>{t('child.privacy.what4')}</Text>
            <Text style={typography.bodyStrong}>
              {t('child.privacy.whyTitle')}
            </Text>
            <Text style={typography.body}>{t('child.privacy.why')}</Text>
            <Text style={typography.bodyStrong}>
              {t('child.privacy.rightsTitle')}
            </Text>
            <Text style={typography.body}>{t('child.privacy.rights')}</Text>
          </ScrollView>
          <Button
            title={t('child.privacy.ack') as string}
            onPress={() => void ack()}
            size="lg"
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
    maxHeight: '90%',
  },
  scroll: {
    maxHeight: 380,
  },
});
