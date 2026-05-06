export const theme = {
  colors: {
    // Brand
    primary: '#3B82F6',
    primaryHover: '#2563EB',
    primaryGlow: 'rgba(59,130,246,0.25)',

    // Status
    ready: '#22C55E',
    readyBg: 'rgba(34,197,94,0.12)',
    inProgress: '#F59E0B',
    inProgressBg: 'rgba(245,158,11,0.12)',
    critical: '#EF4444',
    criticalBg: 'rgba(239,68,68,0.12)',

    // Priority
    priorityLow: '#6B7280',
    priorityNormal: '#3B82F6',
    priorityHigh: '#F97316',
    priorityCritical: '#DC2626',

    // Neutrals
    bg: '#0F172A',
    bgSecondary: '#1E293B',
    bgCard: '#1E293B',
    bgHover: '#273549',
    border: 'rgba(255,255,255,0.08)',
    borderHover: 'rgba(255,255,255,0.16)',

    // Text
    textPrimary: '#F1F5F9',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',

    // Glass
    glass: 'rgba(30, 41, 59, 0.8)',
    glassBorder: 'rgba(255,255,255,0.06)',
  },
  shadows: {
    sm: '0 1px 3px rgba(0,0,0,0.4)',
    md: '0 4px 16px rgba(0,0,0,0.4)',
    lg: '0 8px 32px rgba(0,0,0,0.5)',
    glow: '0 0 24px rgba(59,130,246,0.3)',
    glowGreen: '0 0 20px rgba(34,197,94,0.3)',
    glowRed: '0 0 20px rgba(239,68,68,0.3)',
  },
  radii: {
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
    full: '9999px',
  },
  transitions: {
    fast: '150ms ease',
    normal: '250ms ease',
    slow: '400ms cubic-bezier(0.4, 0, 0.2, 1)',
  },
  blur: {
    sm: 'blur(8px)',
    md: 'blur(16px)',
    lg: 'blur(24px)',
  },
};

export type Theme = typeof theme;
