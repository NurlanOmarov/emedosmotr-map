import { motion } from 'framer-motion';
import styled, { css } from 'styled-components';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'xs' | 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<React.ComponentPropsWithoutRef<'button'>, 'onAnimationStart' | 'onDragStart' | 'onDrag' | 'onDragEnd'> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
}

const variantStyles = {
  primary: (theme: any) => css`
    background: linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.primaryHover});
    color: #fff;
    border: 1px solid rgba(255,255,255,0.1);
    box-shadow: 0 4px 12px ${theme.colors.primary}33;
    &:hover:not(:disabled) {
      filter: brightness(1.1);
      box-shadow: 0 6px 16px ${theme.colors.primary}44;
      transform: translateY(-1px);
    }
    &:active:not(:disabled) { transform: translateY(0); }
  `,
  secondary: (theme: any) => css`
    background: ${theme.colors.bgSecondary};
    color: ${theme.colors.textPrimary};
    border: 1px solid ${theme.colors.border};
    backdrop-filter: blur(8px);
    &:hover:not(:disabled) {
      background: ${theme.colors.bgHover};
      border-color: ${theme.colors.borderHover};
      transform: translateY(-1px);
    }
  `,
  ghost: (theme: any) => css`
    background: transparent;
    color: ${theme.colors.textSecondary};
    border: 1px solid transparent;
    &:hover:not(:disabled) {
      background: ${theme.colors.bgSecondary};
      color: ${theme.colors.textPrimary};
      border-color: ${theme.colors.border};
    }
  `,
  danger: (theme: any) => css`
    background: ${theme.colors.critical}15;
    color: ${theme.colors.critical};
    border: 1px solid ${theme.colors.critical}33;
    &:hover:not(:disabled) {
      background: ${theme.colors.critical}25;
      box-shadow: 0 0 20px ${theme.colors.critical}22;
      transform: translateY(-1px);
    }
  `,
};

const sizeStyles: Record<Size, ReturnType<typeof css>> = {
  xs: css`padding: 3px 8px; font-size: 11px; gap: 4px; border-radius: 6px;`,
  sm: css`padding: 6px 12px; font-size: 12px; gap: 6px;`,
  md: css`padding: 10px 18px; font-size: 14px; gap: 8px;`,
  lg: css`padding: 14px 24px; font-size: 15px; gap: 10px; min-height: 48px;`,
};

const StyledButton = styled(motion.button)<{ $variant: Variant; $size: Size }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  border-radius: 10px;
  transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  user-select: none;
  letter-spacing: 0.01em;

  ${({ $variant, theme }) => variantStyles[$variant](theme)}
  ${({ $size }) => sizeStyles[$size]}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 60%);
    pointer-events: none;
  }
`;

const Spinner = styled.span`
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: currentColor;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  @keyframes spin { to { transform: rotate(360deg); } }
`;

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading,
  icon,
  ...props
}: ButtonProps) {
  return (
    <StyledButton
      $variant={variant}
      $size={size}
      whileTap={{ scale: 0.97 }}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? <Spinner /> : icon}
      {children}
    </StyledButton>
  );
}
