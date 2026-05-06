import { motion } from 'framer-motion';
import styled, { css } from 'styled-components';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
}

const variantStyles: Record<Variant, ReturnType<typeof css>> = {
  primary: css`
    background: linear-gradient(135deg, #3B82F6, #2563EB);
    color: #fff;
    border: 1px solid rgba(59,130,246,0.4);
    box-shadow: 0 0 20px rgba(59,130,246,0.2), inset 0 1px 0 rgba(255,255,255,0.1);
    &:hover:not(:disabled) {
      background: linear-gradient(135deg, #60A5FA, #3B82F6);
      box-shadow: 0 0 30px rgba(59,130,246,0.4), inset 0 1px 0 rgba(255,255,255,0.15);
      transform: translateY(-1px);
    }
    &:active:not(:disabled) { transform: translateY(0); }
  `,
  secondary: css`
    background: rgba(30, 41, 59, 0.9);
    color: #F1F5F9;
    border: 1px solid rgba(255,255,255,0.1);
    backdrop-filter: blur(8px);
    &:hover:not(:disabled) {
      background: rgba(39, 53, 73, 0.95);
      border-color: rgba(255,255,255,0.2);
      transform: translateY(-1px);
    }
  `,
  ghost: css`
    background: transparent;
    color: #94A3B8;
    border: 1px solid transparent;
    &:hover:not(:disabled) {
      background: rgba(255,255,255,0.06);
      color: #F1F5F9;
      border-color: rgba(255,255,255,0.08);
    }
  `,
  danger: css`
    background: rgba(239,68,68,0.15);
    color: #EF4444;
    border: 1px solid rgba(239,68,68,0.3);
    &:hover:not(:disabled) {
      background: rgba(239,68,68,0.25);
      box-shadow: 0 0 20px rgba(239,68,68,0.2);
      transform: translateY(-1px);
    }
  `,
};

const sizeStyles: Record<Size, ReturnType<typeof css>> = {
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

  ${({ $variant }) => variantStyles[$variant]}
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
      {...(props as React.ComponentProps<typeof motion.button>)}
    >
      {loading ? <Spinner /> : icon}
      {children}
    </StyledButton>
  );
}
