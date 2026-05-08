import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { searchApi } from '@/services/api';
import { useMapViewStore } from '@/features/map/useMapViewStore';
import type { Location, Settlement, Task } from '@/types';
import { LOCATION_TYPE_CONFIG } from '@/types';

// ─── Styled ────────────────────────────────────────────────────────────────────

const Backdrop = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 80px;
`;

const Panel = styled(motion.div)`
  width: 100%;
  max-width: 600px;
  background: ${({ theme }) => theme.colors.bgCard};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 16px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.6);
  overflow: hidden;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
`;

const SearchRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  flex-shrink: 0;
`;

const SearchIcon = styled.span`
  font-size: 18px;
  opacity: 0.5;
  flex-shrink: 0;
`;

const Input = styled.input`
  flex: 1;
  background: none;
  border: none;
  outline: none;
  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: 16px;
  font-family: inherit;
  caret-color: ${({ theme }) => theme.colors.primary};

  &::placeholder {
    color: ${({ theme }) => theme.colors.textMuted};
  }
`;

const Kbd = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.textMuted};
  background: ${({ theme }) => theme.colors.bgSecondary};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 5px;
  padding: 2px 7px;
  flex-shrink: 0;
`;

const Results = styled.div`
  overflow-y: auto;
  flex: 1;

  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: ${({ theme }) => theme.colors.borderHover}; border-radius: 2px; }
`;

const Section = styled.div`
  padding: 8px 0;
`;

const SectionLabel = styled.div`
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.textMuted};
  padding: 6px 20px 4px;
`;

const ResultItem = styled(motion.button)<{ $active: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 20px;
  text-align: left;
  cursor: pointer;
  transition: background 100ms;
  background: ${({ $active, theme }) => ($active ? theme.colors.primaryGlow : 'transparent')};

  &:hover {
    background: ${({ theme }) => theme.colors.bgHover};
  }
`;

const ItemIcon = styled.div<{ $color?: string }>`
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: ${({ $color, theme }) => $color ? `${$color}22` : theme.colors.bgSecondary};
  border: 1px solid ${({ $color, theme }) => $color ? `${$color}44` : theme.colors.border};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  flex-shrink: 0;
  color: ${({ $color, theme }) => $color || theme.colors.textSecondary};
  font-weight: 700;
`;

const ItemText = styled.div`
  flex: 1;
  min-width: 0;
`;

const ItemTitle = styled.div`
  font-size: 13px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.textPrimary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ItemSub = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.textMuted};
  margin-top: 1px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ItemArrow = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textMuted};
  flex-shrink: 0;
`;

const EmptyState = styled.div`
  padding: 40px 20px;
  text-align: center;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 13px;
`;

const Spinner = styled(motion.div)`
  width: 14px;
  height: 14px;
  border: 2px solid ${({ theme }) => theme.colors.border};
  border-top-color: ${({ theme }) => theme.colors.primary};
  border-radius: 50%;
  flex-shrink: 0;
`;

// ─── Types ────────────────────────────────────────────────────────────────────

interface SearchResults {
  locations: Location[];
  settlements: Settlement[];
  tasks: Task[];
}

const TASK_PRIORITY_COLORS: Record<string, string> = {
  critical: '#EF4444',
  high: '#F59E0B',
  normal: '#3B82F6',
  low: '#64748B',
};

// ─── Component ────────────────────────────────────────────────────────────────

interface GlobalSearchProps {
  open: boolean;
  onClose: () => void;
}

export function GlobalSearch({ open, onClose }: GlobalSearchProps) {
  const [inputValue, setInputValue] = useState('');
  const [results, setResults] = useState<SearchResults>({ locations: [], settlements: [], tasks: [] });
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { selectLocation, selectSettlementLevel } = useMapViewStore();

  // Focus input on open
  useEffect(() => {
    if (open) {
      setInputValue('');
      setResults({ locations: [], settlements: [], tasks: [] });
      setActiveIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (!inputValue.trim() || inputValue.length < 2) {
      setResults({ locations: [], settlements: [], tasks: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const [locsRes, setsRes, tasksRes] = await Promise.allSettled([
          searchApi.locations(inputValue),
          searchApi.settlements(inputValue),
          searchApi.tasks(inputValue),
        ]);

        setResults({
          locations: locsRes.status === 'fulfilled' ? locsRes.value.data.items ?? [] : [],
          settlements: setsRes.status === 'fulfilled' ? setsRes.value.data ?? [] : [],
          tasks: tasksRes.status === 'fulfilled' ? tasksRes.value.data.items ?? [] : [],
        });
        setActiveIdx(0);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [inputValue]);

  // Build flat list for keyboard nav
  type ResultEntry =
    | { kind: 'location'; item: Location }
    | { kind: 'settlement'; item: Settlement }
    | { kind: 'task'; item: Task };

  const flat: ResultEntry[] = [
    ...results.locations.map((item) => ({ kind: 'location' as const, item })),
    ...results.settlements.map((item) => ({ kind: 'settlement' as const, item })),
    ...results.tasks.map((item) => ({ kind: 'task' as const, item })),
  ];

  function handleSelect(entry: ResultEntry) {
    if (entry.kind === 'location') {
      navigate('/map');
      selectLocation(entry.item.id, []);
    } else if (entry.kind === 'settlement') {
      navigate('/map');
      selectSettlementLevel(entry.item.settlement_id, entry.item.name);
    } else {
      navigate('/tasks');
    }
    onClose();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, flat.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && flat[activeIdx]) {
      handleSelect(flat[activeIdx]);
    }
  }

  const hasResults = flat.length > 0;
  const showEmpty = inputValue.length >= 2 && !loading && !hasResults;

  let flatIdx = 0;

  return (
    <AnimatePresence>
      {open && (
        <Backdrop
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
        >
          <Panel
            initial={{ opacity: 0, y: -16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            <SearchRow>
              <SearchIcon>🔍</SearchIcon>
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Поиск объектов, поселений, задач..."
              />
              {loading && (
                <Spinner
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 0.7, ease: 'linear' }}
                />
              )}
              <Kbd>ESC</Kbd>
            </SearchRow>

            <Results>
              {showEmpty && (
                <EmptyState>Ничего не найдено по запросу «{inputValue}»</EmptyState>
              )}

              {!inputValue && (
                <EmptyState>Начните вводить для поиска</EmptyState>
              )}

              {results.locations.length > 0 && (
                <Section>
                  <SectionLabel>Объекты</SectionLabel>
                  {results.locations.map((loc) => {
                    const idx = flatIdx++;
                    const cfg = LOCATION_TYPE_CONFIG[loc.type];
                    return (
                      <ResultItem
                        key={loc.id}
                        $active={activeIdx === idx}
                        onClick={() => handleSelect({ kind: 'location', item: loc })}
                        onMouseEnter={() => setActiveIdx(idx)}
                      >
                        <ItemIcon $color={cfg?.color}>
                          {cfg?.label?.slice(0, 2) ?? '📍'}
                        </ItemIcon>
                        <ItemText>
                          <ItemTitle>{loc.name}</ItemTitle>
                          <ItemSub>{cfg?.label}{loc.address ? ` · ${loc.address}` : ''}</ItemSub>
                        </ItemText>
                        <ItemArrow>›</ItemArrow>
                      </ResultItem>
                    );
                  })}
                </Section>
              )}

              {results.settlements.length > 0 && (
                <Section>
                  <SectionLabel>Поселения</SectionLabel>
                  {results.settlements.map((s) => {
                    const idx = flatIdx++;
                    return (
                      <ResultItem
                        key={s.settlement_id}
                        $active={activeIdx === idx}
                        onClick={() => handleSelect({ kind: 'settlement', item: s })}
                        onMouseEnter={() => setActiveIdx(idx)}
                      >
                        <ItemIcon>🏘️</ItemIcon>
                        <ItemText>
                          <ItemTitle>{s.name}</ItemTitle>
                          <ItemSub>Поселение</ItemSub>
                        </ItemText>
                        <ItemArrow>›</ItemArrow>
                      </ResultItem>
                    );
                  })}
                </Section>
              )}

              {results.tasks.length > 0 && (
                <Section>
                  <SectionLabel>Задачи</SectionLabel>
                  {results.tasks.map((t) => {
                    const idx = flatIdx++;
                    const color = TASK_PRIORITY_COLORS[t.priority] ?? '#64748B';
                    return (
                      <ResultItem
                        key={t.id}
                        $active={activeIdx === idx}
                        onClick={() => handleSelect({ kind: 'task', item: t })}
                        onMouseEnter={() => setActiveIdx(idx)}
                      >
                        <ItemIcon $color={color}>✓</ItemIcon>
                        <ItemText>
                          <ItemTitle>{t.title}</ItemTitle>
                          <ItemSub>
                            {t.location_name ? t.location_name : 'Без объекта'}
                            {t.assignee_name ? ` · ${t.assignee_name}` : ''}
                          </ItemSub>
                        </ItemText>
                        <ItemArrow>›</ItemArrow>
                      </ResultItem>
                    );
                  })}
                </Section>
              )}
            </Results>
          </Panel>
        </Backdrop>
      )}
    </AnimatePresence>
  );
}
