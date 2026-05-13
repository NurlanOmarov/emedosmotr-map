import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { LuUser } from 'react-icons/lu';
import { useProjectTasks } from '../api';
import { useTaskopsStore } from '../store/useTaskopsStore';
import { useSearchParams } from 'react-router-dom';
import { StatusBadge } from './StatusBadge';

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(8px);
  z-index: 1000;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 100px;
`;

const Palette = styled.div`
  width: 600px;
  max-width: 90vw;
  background: ${(p) => p.theme.mode === 'dark' ? 'rgba(30, 30, 30, 0.8)' : 'rgba(255, 255, 255, 0.8)'};
  backdrop-filter: blur(12px);
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: 12px;
  box-shadow: ${(p) => p.theme.shadows.lg};
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: fadeInDown 0.2s ease-out;

  @keyframes fadeInDown {
    from { opacity: 0; transform: translateY(-20px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 16px 20px;
  font-size: 16px;
  background: none;
  border: none;
  border-bottom: 1px solid ${(p) => p.theme.colors.border};
  color: ${(p) => p.theme.colors.textPrimary};
  outline: none;
  &::placeholder { color: ${(p) => p.theme.colors.textSecondary}; opacity: 0.6; }
`;

const ResultsList = styled.div`
  max-height: 400px;
  overflow-y: auto;
  padding: 8px;
`;

const ResultItem = styled.div<{ $active: boolean }>`
  padding: 10px 12px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  background: ${(p) => p.$active ? p.theme.colors.bgHover : 'transparent'};
  color: ${(p) => p.$active ? p.theme.colors.textPrimary : p.theme.colors.textSecondary};
  transition: all 0.1s;
  &:hover { background: ${(p) => p.theme.colors.bgHover}; }
`;

const ResultTitle = styled.div`
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  color: ${(p) => p.theme.colors.textPrimary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Hint = styled.div`
  padding: 8px 16px;
  font-size: 11px;
  color: ${(p) => p.theme.colors.textSecondary};
  border-top: 1px solid ${(p) => p.theme.colors.border};
  display: flex;
  justify-content: space-between;
  background: ${(p) => p.theme.colors.bgSecondary};
`;

const Kbd = styled.kbd`
  background: ${(p) => p.theme.colors.bgCard};
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: 3px;
  padding: 0 4px;
  font-family: inherit;
  font-size: 10px;
  margin: 0 2px;
`;

interface Props {
  open?: boolean;
  onClose?: () => void;
  projectId?: string;
}

export function CommandPalette({ open: controlledOpen, onClose: controlledClose, projectId }: Props) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [q, setQ] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const { openSidePanel } = useTaskopsStore();
  const [, setSearchParams] = useSearchParams();
  
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsOpen = (val: boolean) => {
    if (controlledClose !== undefined) {
      if (!val) controlledClose();
    } else {
      setInternalOpen(val);
    }
  };

  // Search only in current project if provided
  const { data: results } = useProjectTasks(projectId || '', { q, per_page: 10 }, { enabled: !!projectId && isOpen });
  const items = results?.items ?? [];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSelect = (id: string) => {
    openSidePanel(id);
    setSearchParams({ task: id });
    setIsOpen(false);
    setQ('');
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev + 1) % (items.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev - 1 + items.length) % (items.length || 1));
    } else if (e.key === 'Enter' && items[activeIndex]) {
      handleSelect(items[activeIndex].id);
    }
  };

  if (!isOpen) return null;

  return (
    <Overlay onClick={() => setIsOpen(false)}>
      <Palette onClick={(e) => e.stopPropagation()}>
        <SearchInput
          autoFocus
          placeholder="Поиск задач в проекте..."
          value={q}
          onChange={(e) => { setQ(e.target.value); setActiveIndex(0); }}
          onKeyDown={onKeyDown}
        />
        <ResultsList>
          {items.length === 0 && q && (
            <div style={{ padding: 20, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
              Ничего не найдено
            </div>
          )}
          {items.map((item, idx) => (
            <ResultItem 
              key={item.id} 
              $active={idx === activeIndex}
              onClick={() => handleSelect(item.id)}
            >
              <StatusBadge status={item.status} />
              <ResultTitle>{item.title}</ResultTitle>
              {item.assignee_name && (
                <span style={{ fontSize: 11, opacity: 0.6, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <LuUser size={12} /> {item.assignee_name}
                </span>
              )}
            </ResultItem>
          ))}
        </ResultsList>
        <Hint>
          <div>
            Навигация: <Kbd>↑</Kbd> <Kbd>↓</Kbd>, Выбор: <Kbd>Enter</Kbd>
          </div>
          <div>
            Закрыть: <Kbd>Esc</Kbd>
          </div>
        </Hint>
      </Palette>
    </Overlay>
  );
}
