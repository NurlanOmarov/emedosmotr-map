import { motion } from 'framer-motion';
import styled, { css } from 'styled-components';
import type { StatusType } from '@/types';

const statusConfig = {
  ready: {
    label: 'Готов',
    color: '#22C55E',
    bg: 'rgba(34,197,94,0.15)',
    border: 'rgba(34,197,94,0.3)',
    glow: '0 0 12px rgba(34,197,94,0.4)',
    dot: '#22C55E',
  },
  in_progress: {
    label: 'В работе',
    color: '#F59E0B',
    bg: 'rgba(245,158,11,0.15)',
    border: 'rgba(245,158,11,0.3)',
    glow: '0 0 12px rgba(245,158,11,0.4)',
    dot: '#F59E0B',
  },
  critical: {
    label: 'Критично',
    color: '#EF4444',
    bg: 'rgba(239,68,68,0.15)',
    border: 'rgba(239,68,68,0.3)',
    glow: '0 0 12px rgba(239,68,68,0.4)',
    dot: '#EF4444',
  },
} as const;

const Wrap = styled(motion.span)<{ $status: StatusType }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.02em;
  white-space: nowrap;
  ${({ $status }) => {
    const cfg = statusConfig[$status];
    return css`
      color: ${cfg.color};
      background: ${cfg.bg};
      border: 1px solid ${cfg.border};
      box-shadow: ${cfg.glow};
    `;
  }}
`;

const Dot = styled.span<{ $status: StatusType; $pulse?: boolean }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${({ $status }) => statusConfig[$status].dot};
  flex-shrink: 0;
  ${({ $pulse, $status }) =>
    $pulse &&
    css`
      animation: pulse-${$status} 2s ease-in-out infinite;
    `}

  @keyframes pulse-ready {
    0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(34,197,94,0.6); }
    50% { opacity: 0.8; box-shadow: 0 0 0 4px rgba(34,197,94,0); }
  }
  @keyframes pulse-in_progress {
    0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(245,158,11,0.6); }
    50% { opacity: 0.8; box-shadow: 0 0 0 4px rgba(245,158,11,0); }
  }
  @keyframes pulse-critical {
    0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(239,68,68,0.7); }
    50% { opacity: 0.7; box-shadow: 0 0 0 5px rgba(239,68,68,0); }
  }
`;

interface Props {
  status: StatusType;
  pulse?: boolean;
  className?: string;
}

export function StatusBadge({ status, pulse, className }: Props) {
  const cfg = statusConfig[status];
  return (
    <Wrap
      $status={status}
      className={className}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      <Dot $status={status} $pulse={pulse} />
      {cfg.label}
    </Wrap>
  );
}
