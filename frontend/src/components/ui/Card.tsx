import { motion } from 'framer-motion';
import styled, { css } from 'styled-components';

interface CardProps {
  children: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLElement>;
  hover?: boolean;
  glow?: 'blue' | 'green' | 'red' | 'none';
  className?: string;
  padding?: string;
  style?: React.CSSProperties;
}

const glowMap = {
  blue: 'rgba(59,130,246,0.15)',
  green: 'rgba(34,197,94,0.15)',
  red: 'rgba(239,68,68,0.15)',
  none: 'transparent',
};

const StyledCard = styled(motion.div)<{ $hover: boolean; $glow: string; $padding: string }>`
  background: ${({ theme }) => theme.colors.glass};
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid ${({ theme }) => theme.colors.glassBorder};
  border-radius: 16px;
  padding: ${({ $padding }) => $padding};
  position: relative;
  overflow: hidden;

  ${({ $hover, theme }) =>
    $hover &&
    css`
      cursor: pointer;
      transition: border-color 200ms ease, box-shadow 200ms ease;
      &:hover {
        border-color: ${theme.colors.borderHover};
        box-shadow: ${theme.shadows.lg};
      }
    `}

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(255,255,255,0.04) 0%, transparent 50%);
    pointer-events: none;
  }

  ${({ $glow }) =>
    $glow !== 'transparent' &&
    css`
      box-shadow: inset 0 0 40px ${$glow}, 0 4px 16px rgba(0,0,0,0.3);
    `}
`;

export function Card({
  children,
  onClick,
  hover = false,
  glow = 'none',
  className,
  padding = '20px',
  style,
}: CardProps) {
  return (
    <StyledCard
      $hover={hover || !!onClick}
      $glow={glowMap[glow]}
      $padding={padding}
      className={className}
      style={style}
      onClick={onClick}
      whileHover={hover || onClick ? { y: -2 } : undefined}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      {children}
    </StyledCard>
  );
}
