import React, { useRef } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { colors, radii, spacing, typography } from '@/theme';

interface Props {
  value: string;
  onChange: (v: string) => void;
  length?: number;
  error?: string;
}

export const PinInput: React.FC<Props> = ({
  value,
  onChange,
  length = 4,
  error,
}) => {
  const ref = useRef<TextInput>(null);

  return (
    <View>
      <View style={styles.row}>
        {Array.from({ length }).map((_, i) => {
          const ch = value[i] ?? '';
          return (
            <View
              key={i}
              style={[
                styles.cell,
                ch ? styles.cellFilled : null,
                error ? styles.cellError : null,
              ]}
            >
              <Text style={styles.cellText}>{ch ? '•' : ''}</Text>
            </View>
          );
        })}
      </View>
      <TextInput
        ref={ref}
        autoFocus
        value={value}
        onChangeText={(t) =>
          onChange(t.replace(/\D/g, '').slice(0, length))
        }
        keyboardType="number-pad"
        maxLength={length}
        style={styles.hidden}
        caretHidden
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'center',
  },
  cell: {
    width: 56,
    height: 64,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellFilled: { borderColor: colors.primary },
  cellError: { borderColor: colors.danger },
  cellText: { ...typography.h1, color: colors.text },
  hidden: { position: 'absolute', opacity: 0, height: 1, width: 1 },
  error: {
    ...typography.small,
    color: colors.danger,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});
