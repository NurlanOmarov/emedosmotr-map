import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';
import { useNotificationStore, NotificationType } from './useNotificationStore';

const Container = styled.div`
  position: fixed;
  bottom: 24px;
  right: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  z-index: 1000;
  pointer-events: none;
`;

const ToastItem = styled(motion.div)<{ $type: NotificationType }>`
  pointer-events: auto;
  min-width: 300px;
  max-width: 400px;
  padding: 16px;
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.9);
  backdrop-filter: blur(16px);
  border: 1px solid ${props => {
    switch (props.$type) {
      case 'success': return 'rgba(34, 197, 94, 0.3)';
      case 'error': return 'rgba(239, 68, 68, 0.3)';
      case 'warning': return 'rgba(234, 179, 8, 0.3)';
      default: return 'rgba(59, 130, 246, 0.3)';
    }
  }};
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: flex-start;
  gap: 12px;
  color: #F1F5F9;
`;

const Icon = styled.div<{ $type: NotificationType }>`
  width: 24px;
  height: 24px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  flex-shrink: 0;
  background: ${props => {
    switch (props.$type) {
      case 'success': return 'rgba(34, 197, 94, 0.1)';
      case 'error': return 'rgba(239, 68, 68, 0.1)';
      case 'warning': return 'rgba(234, 179, 8, 0.1)';
      default: return 'rgba(59, 130, 246, 0.1)';
    }
  }};
  color: ${props => {
    switch (props.$type) {
      case 'success': return '#22C55E';
      case 'error': return '#EF4444';
      case 'warning': return '#EAB308';
      default: return '#3B82F6';
    }
  }};
`;

const Content = styled.div`
  flex: 1;
  font-size: 14px;
  line-height: 1.5;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: #64748B;
  cursor: pointer;
  padding: 4px;
  margin: -4px;
  border-radius: 4px;
  transition: all 150ms;
  &:hover {
    color: #F1F5F9;
    background: rgba(255, 255, 255, 0.1);
  }
`;

export function ToastContainer() {
  const { toasts, removeToast } = useNotificationStore();

  return (
    <Container>
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            $type={toast.type}
            initial={{ opacity: 0, x: 20, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.9 }}
            layout
          >
            <Icon $type={toast.type}>
              {toast.type === 'success' && '✓'}
              {toast.type === 'error' && '✕'}
              {toast.type === 'warning' && '⚠'}
              {toast.type === 'info' && 'ℹ'}
            </Icon>
            <Content>{toast.message}</Content>
            <CloseButton onClick={() => removeToast(toast.id)}>✕</CloseButton>
          </ToastItem>
        ))}
      </AnimatePresence>
    </Container>
  );
}
