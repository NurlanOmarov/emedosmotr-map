import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';

const PromptContainer = styled(motion.div)`
  position: fixed;
  top: 72px;
  left: 16px;
  right: 16px;
  background: ${({ theme }) => theme.colors.primary};
  color: white;
  padding: 12px 16px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  z-index: 1100;
  box-shadow: ${({ theme }) => theme.shadows.lg};
  border: 1px solid rgba(255, 255, 255, 0.2);

  @media (min-width: 768px) {
    width: 320px;
    left: auto;
    right: 20px;
  }
`;

const Content = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const Title = styled.div`
  font-weight: 600;
  font-size: 13px;
`;

const Desc = styled.div`
  font-size: 11px;
  opacity: 0.9;
`;

const InstallButton = styled.button`
  background: white;
  color: ${({ theme }) => theme.colors.primary};
  border: none;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
`;

const CloseButton = styled.button`
  background: transparent;
  border: none;
  color: white;
  opacity: 0.7;
  cursor: pointer;
  padding: 4px;
`;

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Only show if not already in standalone mode
      if (!window.matchMedia('(display-mode: standalone)').matches) {
        setIsVisible(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setIsVisible(false);
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <PromptContainer
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
        >
          <Content>
            <Title>Установить приложение</Title>
            <Desc>Добавьте eMap на главный экран для быстрого доступа</Desc>
          </Content>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <InstallButton onClick={handleInstall}>Установить</InstallButton>
            <CloseButton onClick={() => setIsVisible(false)}>✕</CloseButton>
          </div>
        </PromptContainer>
      )}
    </AnimatePresence>
  );
}
