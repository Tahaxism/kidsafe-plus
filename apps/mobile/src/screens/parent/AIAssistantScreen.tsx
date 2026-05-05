import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

import { colors, radii, spacing, typography } from '@/theme';
import { Screen } from '@/components/Screen';
import { useAuthStore } from '@/stores/auth';
import { useChildrenStore } from '@/stores/children';
import { askAssistant } from '@/services/ai';
import { addRule } from '@/services/rules';
import type { ChatMessage, RuleKind } from '@/types';

const newId = (): string =>
  `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

export const AIAssistantScreen: React.FC = () => {
  const { t } = useTranslation();
  const session = useAuthStore((s) => s.session);
  const children = useChildrenStore((s) => s.children);
  const refresh = useChildrenStore((s) => s.refresh);
  const selectedId = useChildrenStore((s) => s.selectedId);

  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  useEffect(() => {
    if (session?.kind === 'parent') void refresh(session.uid);
  }, [session, refresh]);

  const scrollToEnd = (): void => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  };

  const send = async (): Promise<void> => {
    if (!text.trim() || busy || session?.kind !== 'parent') return;
    const userMsg: ChatMessage = {
      id: newId(),
      role: 'user',
      text: text.trim(),
      createdAt: Date.now(),
    };
    const next = [...messages, userMsg];
    setMessages(next);
    setText('');
    setBusy(true);
    scrollToEnd();

    try {
      const lang = (i18n.language as 'fr' | 'ar' | 'en') ?? 'fr';
      const res = await askAssistant({
        parentUid: session.uid,
        childId: selectedId ?? undefined,
        language: lang,
        messages: next.map((m) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.text,
        })),
        context: {
          children: children.map((c) => ({ id: c.id, name: c.name })),
        },
      });

      const appliedIds: string[] = [];
      for (const action of res.actions) {
        try {
          const targetChild = (action.payload?.childId as string) ?? selectedId;
          if (!targetChild) continue;
          const r = await addRule(targetChild, {
            kind: action.kind as RuleKind,
            payload: action.payload,
            createdBy: 'ai',
            reasonText: action.reason,
            recitationText: action.recitationText,
            recitationMinScore: action.recitationMinScore,
            expiresAt: action.expiresAt,
          });
          appliedIds.push(r.id);
        } catch {
          // continue
        }
      }

      const reply: ChatMessage = {
        id: newId(),
        role: 'assistant',
        text: res.reply,
        createdAt: Date.now(),
        appliedRuleIds: appliedIds,
      };
      setMessages((m) => [...m, reply]);
      scrollToEnd();
    } catch (e) {
      const err: ChatMessage = {
        id: newId(),
        role: 'assistant',
        text:
          e instanceof Error
            ? `${t('parent.ai.ruleFailed')}: ${e.message}`
            : (t('parent.ai.ruleFailed') as string),
        createdAt: Date.now(),
      };
      setMessages((m) => [...m, err]);
    } finally {
      setBusy(false);
    }
  };

  const examples = [
    t('parent.ai.ex1'),
    t('parent.ai.ex2'),
    t('parent.ai.ex3'),
  ] as string[];

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Text style={typography.h1}>{t('parent.ai.title')}</Text>
      </View>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {messages.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTitle}>🤖</Text>
            <Text style={styles.emptyDesc}>{t('parent.ai.examples')}</Text>
            {examples.map((ex, i) => (
              <Pressable
                key={i}
                style={styles.example}
                onPress={() => setText(ex)}
              >
                <Text style={typography.body}>{ex}</Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm }}
            renderItem={({ item }) => (
              <View
                style={[
                  styles.bubble,
                  item.role === 'user' ? styles.userBubble : styles.botBubble,
                ]}
              >
                <Text
                  style={[
                    typography.body,
                    {
                      color:
                        item.role === 'user'
                          ? colors.textOnPrimary
                          : colors.text,
                    },
                  ]}
                >
                  {item.text}
                </Text>
                {item.appliedRuleIds && item.appliedRuleIds.length > 0 ? (
                  <Text style={styles.applied}>
                    ✓ {t('parent.ai.ruleApplied')} ×{item.appliedRuleIds.length}
                  </Text>
                ) : null}
              </View>
            )}
          />
        )}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder={t('parent.ai.placeholder') as string}
            placeholderTextColor={colors.textDim}
            multiline
            editable={!busy}
          />
          <Pressable
            onPress={send}
            disabled={busy || !text.trim()}
            style={({ pressed }) => [
              styles.send,
              {
                opacity: !text.trim() || busy ? 0.5 : pressed ? 0.85 : 1,
              },
            ]}
          >
            {busy ? (
              <ActivityIndicator color={colors.textOnPrimary} />
            ) : (
              <Text style={styles.sendText}>↗</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    gap: spacing.md,
  },
  emptyTitle: { fontSize: 56 },
  emptyDesc: { ...typography.h3, color: colors.textMuted },
  example: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    width: '100%',
  },
  bubble: {
    maxWidth: '85%',
    padding: spacing.md,
    borderRadius: radii.lg,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
  },
  botBubble: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  applied: {
    ...typography.tiny,
    color: colors.success,
    marginTop: spacing.xs,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    color: colors.text,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    maxHeight: 120,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendText: { color: colors.textOnPrimary, fontSize: 20, fontWeight: '700' },
});
