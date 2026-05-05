import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
} from 'react-native';

import { colors, radii, spacing, typography } from '@/theme';

interface Props {
  title: string;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  style?: ViewStyle;
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<Props> = ({
  title,
  onPress,
  loading,
  disabled,
  variant = 'primary',
  style,
  size = 'md',
}) => {
  const palette =
    variant === 'primary'
      ? { bg: colors.primary, fg: colors.textOnPrimary, border: colors.primary }
      : variant === 'secondary'
      ? { bg: colors.surfaceAlt, fg: colors.text, border: colors.border }
      : variant === 'danger'
      ? { bg: colors.danger, fg: colors.white, border: colors.danger }
      : { bg: 'transparent', fg: colors.primary, border: 'transparent' };

  const padding =
    size === 'sm'
      ? { paddingVertical: 8, paddingHorizontal: 12 }
      : size === 'lg'
      ? { paddingVertical: 16, paddingHorizontal: 20 }
      : { paddingVertical: 12, paddingHorizontal: 16 };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        padding,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <Text style={[typography.button, { color: palette.fg }]}>{title}</Text>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
