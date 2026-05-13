import { createContext, useCallback, useContext, useRef, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { useEscapeKey } from '@/hooks/useKeyboardShortcuts';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
}

interface DialogState extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ConfirmContext = createContext<(opts: ConfirmOptions) => Promise<boolean>>(
  () => Promise.resolve(false),
);

export function useConfirm() {
  return useContext(ConfirmContext);
}

// ─── Animations ───────────────────────────────────────────────────────────────

const overlayIn = keyframes`
  from { opacity: 0; }
  to   { opacity: 1; }
`;

const dialogIn = keyframes`
  from { opacity: 0; transform: scale(0.94) translateY(8px); }
  to   { opacity: 1; transform: scale(1)    translateY(0); }
`;

const dialogOut = keyframes`
  from { opacity: 1; transform: scale(1)    translateY(0); }
  to   { opacity: 0; transform: scale(0.94) translateY(8px); }
`;

// ─── Styled Components ────────────────────────────────────────────────────────

const Overlay = styled.div<{ $closing: boolean }>`
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(4px);
  animation: ${overlayIn} 0.18s ease-out;
  ${(p) => p.$closing && 'animation: none; opacity: 0; transition: opacity 0.15s;'}
`;

const Dialog = styled.div<{ $closing: boolean }>`
  width: 100%;
  max-width: 400px;
  background: ${(p) =>
    p.theme.mode === 'dark'
      ? 'rgba(22, 32, 50, 0.95)'
      : 'rgba(255, 255, 255, 0.97)'};
  backdrop-filter: blur(24px);
  border: 1px solid ${(p) => p.theme.colors.glassBorder};
  border-radius: 16px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.04);
  padding: 28px 28px 24px;
  animation: ${(p) => (p.$closing ? dialogOut : dialogIn)} 0.22s cubic-bezier(0.4, 0, 0.2, 1);

  @media (max-width: 480px) {
    padding: 22px 20px 20px;
    border-radius: 14px;
    margin-bottom: 16px;
    align-self: flex-end;
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
    max-width: 100%;
  }
`;

const IconWrap = styled.div<{ $variant: string }>`
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  background: ${(p) =>
    p.$variant === 'danger'
      ? 'rgba(239,68,68,0.15)'
      : p.$variant === 'warning'
      ? 'rgba(245,158,11,0.15)'
      : 'rgba(59,130,246,0.15)'};
  color: ${(p) =>
    p.$variant === 'danger'
      ? '#ef4444'
      : p.$variant === 'warning'
      ? '#f59e0b'
      : '#3b82f6'};
`;

const Title = styled.h2`
  font-size: 16px;
  font-weight: 700;
  color: ${(p) => p.theme.colors.textPrimary};
  margin: 0 0 8px;
  line-height: 1.3;
`;

const Message = styled.p`
  font-size: 13.5px;
  color: ${(p) => p.theme.colors.textSecondary};
  margin: 0 0 24px;
  line-height: 1.55;
`;

const Buttons = styled.div`
  display: flex;
  gap: 10px;
  justify-content: flex-end;

  @media (max-width: 480px) {
    flex-direction: column-reverse;
  }
`;

const BtnBase = styled.button`
  padding: 9px 20px;
  border-radius: 9px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  border: none;
  min-width: 90px;

  &:focus-visible {
    outline: 2px solid ${(p) => p.theme.colors.primary};
    outline-offset: 2px;
  }

  @media (max-width: 480px) {
    padding: 12px 20px;
  }
`;

const CancelBtn = styled(BtnBase)`
  background: ${(p) =>
    p.theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'};
  color: ${(p) => p.theme.colors.textSecondary};

  &:hover {
    background: ${(p) =>
      p.theme.mode === 'dark' ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)'};
    color: ${(p) => p.theme.colors.textPrimary};
  }
`;

const ConfirmBtn = styled(BtnBase)<{ $variant: string }>`
  background: ${(p) =>
    p.$variant === 'danger'
      ? '#ef4444'
      : p.$variant === 'warning'
      ? '#f59e0b'
      : p.theme.colors.primary};
  color: #fff;
  box-shadow: 0 2px 8px ${(p) =>
    p.$variant === 'danger'
      ? 'rgba(239,68,68,0.35)'
      : p.$variant === 'warning'
      ? 'rgba(245,158,11,0.35)'
      : 'rgba(59,130,246,0.35)'};

  &:hover {
    background: ${(p) =>
      p.$variant === 'danger'
        ? '#dc2626'
        : p.$variant === 'warning'
        ? '#d97706'
        : p.theme.colors.primaryHover};
    transform: translateY(-1px);
    box-shadow: 0 4px 14px ${(p) =>
      p.$variant === 'danger'
        ? 'rgba(239,68,68,0.45)'
        : p.$variant === 'warning'
        ? 'rgba(245,158,11,0.45)'
        : 'rgba(59,130,246,0.45)'};
  }

  &:active { transform: translateY(0); }
`;

// ─── Icons ────────────────────────────────────────────────────────────────────

function DangerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14H6L5 6"/>
      <path d="M9 6V4h6v2"/>
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  );
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DialogState | null>(null);
  const [closing, setClosing] = useState(false);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({ ...opts, resolve });
      setClosing(false);
      setTimeout(() => confirmBtnRef.current?.focus(), 60);
    });
  }, []);

  const close = (value: boolean) => {
    setClosing(true);
    state?.resolve(value);
    setTimeout(() => { setState(null); setClosing(false); }, 180);
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) close(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') close(false);
  };

  const variant = state?.variant ?? 'danger';

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <Overlay $closing={closing} onClick={handleOverlayClick}>
          <Dialog $closing={closing} role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-msg">
            <IconWrap $variant={variant}>
              {variant === 'danger' ? <DangerIcon /> : variant === 'warning' ? <WarningIcon /> : <InfoIcon />}
            </IconWrap>
            <Title id="confirm-title">{state.title}</Title>
            {state.message && <Message id="confirm-msg">{state.message}</Message>}
            <Buttons>
              <CancelBtn onClick={() => close(false)}>
                {state.cancelLabel ?? 'Отмена'}
              </CancelBtn>
              <ConfirmBtn
                ref={confirmBtnRef}
                $variant={variant}
                onClick={() => close(true)}
                autoFocus
              >
                {state.confirmLabel ?? 'Подтвердить'}
              </ConfirmBtn>
            </Buttons>
          </Dialog>
        </Overlay>
      )}
    </ConfirmContext.Provider>
  );
}
