import { motion } from 'framer-motion';
import styled, { css } from 'styled-components';

interface CardProps {
  children: React.ReactNode;
  onClick?: () => void;
  hover?: boolean;
  glow?: 'blue' | 'green' | 'red' | 'none';
  className?: string;
  padding?: string;
}

const glowMap = {
  blue: 'rgba(59,130,246,0.15)',
  green: 'rgba(34,197,94,0.15)',
  red: 'rgba(239,68,68,0.15)',
  none: 'transparent',
};

const StyledCard = styled(motion.div)<{ $hover: boolean; $glow: string; $padding: string }>`
  background: rgba(30, 41, 59, 0.7);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 16px;
  padding: ${({ $padding }) => $padding};
  position: relative;
  overflow: hidden;

  ${({ $hover }) =>
    $hover &&
    css`
      cursor: pointer;
      transition: border-color 200ms ease, box-shadow 200ms ease;
      &:hover {
        border-color: rgba(255,255,255,0.12);
        box-shadow: 0 8px 32px rgba(0,0,0,0.4);
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
}: CardProps) {
  return (
    <StyledCard
      $hover={hover || !!onClick}
      $glow={glowMap[glow]}
      $padding={padding}
      className={className}
      onClick={onClick}
      whileHover={hover || onClick ? { y: -2 } : undefined}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      {children}
    </StyledCard>
  );
}
