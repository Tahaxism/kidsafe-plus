import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { WebView, type WebViewNavigation } from 'react-native-webview';
import {
  collection,
  onSnapshot,
  query,
  where,
  addDoc,
} from 'firebase/firestore';

import type { ChildStackParamList } from '@/navigation/types';
import { colors, radii, spacing, typography } from '@/theme';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import {
  classifyUrlViaLLM,
  enforceSafeSearch,
  hasAdultHint,
  isHostBlocked,
  normalizeHost,
} from '@/services/safeBrowser';
import { useAuthStore } from '@/stores/auth';
import { getDb, isFirebaseConfigured } from '@/services/firebase';
import { addAlert } from '@/services/rules';

type Rt = RouteProp<ChildStackParamList, 'SafeBrowser'>;

const HOMEPAGE = 'https://duckduckgo.com/?kp=1';

export const ChildSafeBrowserScreen: React.FC = () => {
  const { t } = useTranslation();
  const route = useRoute<Rt>();
  const session = useAuthStore((s) => s.session);
  const childId = session?.kind === 'child' ? session.childId : null;

  const initialUrl = enforceSafeSearch(route.params?.url ?? HOMEPAGE);
  const [bar, setBar] = useState(initialUrl);
  const [currentUrl, setCurrentUrl] = useState(initialUrl);
  const [blocked, setBlocked] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [customBlocklist, setCustomBlocklist] = useState<string[]>([]);
  const webRef = useRef<WebView>(null);

  // Load per-parent blocklist from Firestore
  useEffect(() => {
    if (!isFirebaseConfigured || !childId) return;
    const q = query(
      collection(getDb(), 'rules'),
      where('childId', '==', childId),
      where('kind', '==', 'web_blocklist'),
    );
    const unsub = onSnapshot(q, (snap) => {
      const all: string[] = [];
      snap.forEach((d) => {
        const r = d.data() as { payload?: { domains?: string[] } };
        if (Array.isArray(r.payload?.domains)) all.push(...r.payload.domains);
      });
      setCustomBlocklist(all);
    });
    return () => unsub();
  }, [childId]);

  const recordVisit = async (url: string, allowed: boolean): Promise<void> => {
    if (!isFirebaseConfigured || !childId) return;
    try {
      await addDoc(collection(getDb(), 'web_history'), {
        childId,
        url,
        host: normalizeHost(url),
        allowed,
        ts: Date.now(),
      });
    } catch {
      // best-effort
    }
  };

  const reportBlocked = async (
    url: string,
    reason: string,
  ): Promise<void> => {
    if (!isFirebaseConfigured || !childId) return;
    try {
      await addAlert({
        childId,
        kind: 'web_blocked',
        title: t('parent.alerts.webBlocked') as string,
        description: `${normalizeHost(url)} — ${reason}`,
        severity: 'warn',
        metadata: { url, reason },
      });
    } catch {
      // best-effort
    }
  };

  const decideAndLoad = async (raw: string): Promise<void> => {
    let url = raw.trim();
    if (!url) return;
    if (!url.includes('://')) {
      // Treat as a search query if it has spaces; otherwise as a URL.
      if (url.includes(' ') || !url.includes('.')) {
        url = `https://duckduckgo.com/?kp=1&q=${encodeURIComponent(url)}`;
      } else {
        url = `https://${url}`;
      }
    }
    url = enforceSafeSearch(url);
    setLoading(true);
    setBlocked(null);

    let host = '';
    try {
      host = normalizeHost(new URL(url).hostname);
    } catch {
      host = url;
    }

    if (isHostBlocked(host, customBlocklist)) {
      setBlocked(t('child.reciteBlockedSite') as string);
      setLoading(false);
      void recordVisit(url, false);
      void reportBlocked(url, 'denylist');
      return;
    }
    if (hasAdultHint(url)) {
      // Quick LLM check on suspicious URLs
      const c = await classifyUrlViaLLM(url);
      if (c.flagged) {
        setBlocked(t('child.reciteBlockedSite') as string);
        setLoading(false);
        void recordVisit(url, false);
        void reportBlocked(url, c.reason);
        return;
      }
    }
    setCurrentUrl(url);
    setBar(url);
    void recordVisit(url, true);
  };

  const onNav = (navState: WebViewNavigation): void => {
    setBar(navState.url);
    if (!navState.loading) setLoading(false);
    let host = '';
    try {
      host = normalizeHost(new URL(navState.url).hostname);
    } catch {
      return;
    }
    if (isHostBlocked(host, customBlocklist)) {
      webRef.current?.stopLoading();
      setBlocked(t('child.reciteBlockedSite') as string);
      void recordVisit(navState.url, false);
      void reportBlocked(navState.url, 'redirect_to_denylist');
    }
  };

  const goHome = (): void => {
    void decideAndLoad(HOMEPAGE);
  };

  const onShouldStart = useMemo(
    () => (request: { url: string }): boolean => {
      let host = '';
      try {
        host = normalizeHost(new URL(request.url).hostname);
      } catch {
        return true;
      }
      if (isHostBlocked(host, customBlocklist)) {
        setBlocked(t('child.reciteBlockedSite') as string);
        void recordVisit(request.url, false);
        void reportBlocked(request.url, 'denylist');
        return false;
      }
      return true;
    },
    [customBlocklist, t],
  );

  return (
    <Screen padded={false}>
      <View style={styles.bar}>
        <TextInput
          value={bar}
          onChangeText={setBar}
          onSubmitEditing={() => decideAndLoad(bar)}
          placeholder="https://"
          placeholderTextColor={colors.textDim}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="go"
          style={styles.barInput}
        />
        <Pressable
          onPress={() => decideAndLoad(bar)}
          style={({ pressed }) => [styles.go, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.goText}>↗</Text>
        </Pressable>
        <Pressable
          onPress={goHome}
          style={({ pressed }) => [styles.go, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.goText}>⌂</Text>
        </Pressable>
      </View>
      {loading ? (
        <View style={styles.spinner}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : null}
      {blocked ? (
        <Card style={{ margin: spacing.md, borderColor: colors.danger }}>
          <Text style={[typography.h3, { color: colors.danger }]}>🛑</Text>
          <Text style={typography.body}>{blocked}</Text>
          <View style={{ height: spacing.md }} />
          <Pressable
            onPress={() => {
              setBlocked(null);
              goHome();
            }}
            style={({ pressed }) => [styles.go, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.goText}>{t('common.continue')}</Text>
          </Pressable>
        </Card>
      ) : (
        <WebView
          ref={webRef}
          source={{ uri: currentUrl }}
          onNavigationStateChange={onNav}
          onShouldStartLoadWithRequest={onShouldStart}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          // Block file:// & content:// schemes
          originWhitelist={['http://*', 'https://*']}
          // Decline insecure mixed content
          mixedContentMode="never"
          // Reduce JS-injected popups
          javaScriptCanOpenWindowsAutomatically={false}
          incognito={false}
          allowsBackForwardNavigationGestures
          style={{ flex: 1 }}
        />
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    gap: spacing.xs,
    padding: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  barInput: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    color: colors.text,
    fontSize: 14,
  },
  go: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
  },
  goText: { color: colors.textOnPrimary, fontSize: 18, fontWeight: '700' },
  spinner: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
});

// Silence unused warnings — Alert is reserved for future confirm dialogs.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _alert = Alert;
