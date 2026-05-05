import { TextStyle } from 'react-native';

export const colors = {
  // Brand
  primary: '#10B981', // emerald — Moroccan flag accent
  primaryDark: '#047857',
  primarySoft: '#D1FAE5',
  accent: '#EF4444', // Moroccan red
  accentSoft: '#FEE2E2',
  gold: '#F59E0B',

  // Neutrals (dark-first)
  bg: '#0F172A',
  surface: '#1E293B',
  surfaceAlt: '#273449',
  border: '#334155',
  divider: '#1F2937',

  // Text
  text: '#F8FAFC',
  textMuted: '#94A3B8',
  textDim: '#64748B',
  textOnPrimary: '#0F172A',

  // States
  success: '#22C55E',
  successSoft: '#064E3B',
  warning: '#F59E0B',
  warningSoft: '#78350F',
  danger: '#EF4444',
  dangerSoft: '#7F1D1D',
  info: '#3B82F6',
  infoSoft: '#1E3A8A',

  // Light tokens (for child-mode if we ever switch)
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radii = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export const typography: Record<string, TextStyle> = {
  display: { fontSize: 32, fontWeight: '800', color: colors.text },
  h1: { fontSize: 26, fontWeight: '700', color: colors.text },
  h2: { fontSize: 20, fontWeight: '700', color: colors.text },
  h3: { fontSize: 17, fontWeight: '600', color: colors.text },
  body: { fontSize: 15, fontWeight: '400', color: colors.text },
  bodyStrong: { fontSize: 15, fontWeight: '600', color: colors.text },
  small: { fontSize: 13, fontWeight: '400', color: colors.textMuted },
  tiny: { fontSize: 11, fontWeight: '500', color: colors.textDim },
  button: { fontSize: 16, fontWeight: '700', color: colors.textOnPrimary },
};

export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 4,
  },
};
