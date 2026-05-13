import { useState, useRef, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { useDeleteDependency, useCreateDependency, useProjectTasks } from '../api';
import { TaskopsTask, TaskopsDependencyType } from '../types';

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(-6px); }
  to { opacity: 1; transform: translateY(0); }
`;

const Container = styled.div`
  margin-top: 24px;
  border-top: 1px solid ${(p) => p.theme.colors.border};
  padding-top: 16px;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
`;

const Title = styled.h3`
  font-size: 14px;
  font-weight: 600;
  color: ${(p) => p.theme.colors.textPrimary};
  margin: 0;
`;

const AddBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 500;
  color: ${(p) => p.theme.colors.primary};
  background: none;
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: 6px;
  padding: 4px 10px;
  cursor: pointer;
  transition: all 0.15s;
  &:hover {
    background: ${(p) => p.theme.colors.primaryGlow};
    border-color: ${(p) => p.theme.colors.primary};
  }
  &:focus-visible {
    outline: 2px solid ${(p) => p.theme.colors.primary};
    outline-offset: 2px;
  }
`;

const DepList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const DepRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  background: ${(p) => p.theme.colors.bgSecondary};
  border: 1px solid ${(p) => p.theme.colors.border};
  font-size: 13px;
  transition: border-color 0.15s;
  &:hover { border-color: ${(p) => p.theme.colors.borderHover}; }
`;

const DepTypeLabel = styled.span<{ $type: TaskopsDependencyType }>`
  font-size: 10px;
  text-transform: uppercase;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 4px;
  flex-shrink: 0;
  background: ${(p) =>
    p.$type === 'blocks' ? p.theme.colors.critical :
    p.$type === 'blocked_by' ? p.theme.colors.primary :
    p.theme.colors.bgCard};
  color: ${(p) => p.$type === 'relates_to' ? p.theme.colors.textPrimary : 'white'};
`;

const DepTitle = styled.span`
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: ${(p) => p.theme.colors.textPrimary};
`;

const RemoveBtn = styled.button`
  background: none;
  border: none;
  color: ${(p) => p.theme.colors.textSecondary};
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  line-height: 1;
  opacity: 0;
  transition: all 0.15s;
  flex-shrink: 0;
  ${DepRow}:hover & { opacity: 1; }
  &:hover { color: ${(p) => p.theme.colors.critical}; }
  &:focus-visible { outline: 2px solid ${(p) => p.theme.colors.primary}; opacity: 1; }
`;

/* ── Add form ─────────────────────────────────────────────────────── */

const AddForm = styled.div`
  margin-top: 10px;
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: 10px;
  overflow: hidden;
  background: ${(p) => p.theme.colors.bgSecondary};
  animation: ${fadeIn} 0.18s ease-out;
`;

const AddFormTop = styled.div`
  display: flex;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid ${(p) => p.theme.colors.border};
`;

const TypeSelect = styled.select`
  font-size: 12px;
  font-weight: 600;
  background: ${(p) => p.theme.colors.bgCard};
  color: ${(p) => p.theme.colors.textPrimary};
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: 6px;
  padding: 5px 8px;
  cursor: pointer;
  flex-shrink: 0;
  &:focus { outline: none; border-color: ${(p) => p.theme.colors.primary}; }
`;

const SearchInput = styled.input`
  flex: 1;
  font-size: 13px;
  background: none;
  color: ${(p) => p.theme.colors.textPrimary};
  border: none;
  outline: none;
  &::placeholder { color: ${(p) => p.theme.colors.textSecondary}; opacity: 0.7; }
`;

const CancelAddBtn = styled.button`
  background: none;
  border: none;
  color: ${(p) => p.theme.colors.textSecondary};
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  padding: 0 4px;
  flex-shrink: 0;
  &:hover { color: ${(p) => p.theme.colors.critical}; }
  &:focus-visible { outline: 2px solid ${(p) => p.theme.colors.primary}; border-radius: 4px; }
`;

const SearchResults = styled.div`
  max-height: 200px;
  overflow-y: auto;
`;

const SearchResultItem = styled.button<{ $active?: boolean }>`
  width: 100%;
  text-align: left;
  background: ${(p) => p.$active ? p.theme.colors.primaryGlow : 'transparent'};
  border: none;
  padding: 8px 12px;
  font-size: 13px;
  color: ${(p) => p.theme.colors.textPrimary};
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background 0.1s;
  &:hover { background: ${(p) => p.theme.colors.bgHover}; }
  &:focus-visible {
    outline: none;
    background: ${(p) => p.theme.colors.bgHover};
  }
`;

const SearchEmpty = styled.div`
  padding: 16px 12px;
  text-align: center;
  font-size: 12px;
  color: ${(p) => p.theme.colors.textSecondary};
`;

const DEP_LABELS: Record<TaskopsDependencyType, string> = {
  blocks: 'Блокирует',
  blocked_by: 'Зависит от',
  relates_to: 'Связана с',
};

interface Props {
  task: TaskopsTask;
}

export function DependenciesSection({ task }: Props) {
  const deleteDep = useDeleteDependency(task.id);
  const createDep = useCreateDependency(task.id);

  const [showAdd, setShowAdd] = useState(false);
  const [depType, setDepType] = useState<TaskopsDependencyType>('blocks');
  const [q, setQ] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: searchResults } = useProjectTasks(
    task.project_id,
    { q, per_page: 8 },
    { enabled: showAdd && q.length >= 1 }
  );

  const candidates = (searchResults?.items ?? []).filter(
    (t) =>
      t.id !== task.id &&
      !task.dependencies_outgoing?.some((d) => d.target_task_id === t.id) &&
      !task.dependencies_incoming?.some((d) => d.source_task_id === t.id)
  );

  useEffect(() => {
    if (showAdd) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [showAdd]);

  const handleAdd = (targetId: string) => {
    createDep.mutate(
      { target_task_id: targetId, type: depType },
      {
        onSuccess: () => {
          setShowAdd(false);
          setQ('');
        },
      }
    );
  };

  const allDeps = [
    ...(task.dependencies_outgoing || []).map((d) => ({ ...d, dir: 'out' as const })),
    ...(task.dependencies_incoming || []).map((d) => ({ ...d, dir: 'in' as const })),
  ];

  return (
    <Container>
      <Header>
        <Title>Зависимости {allDeps.length > 0 && `(${allDeps.length})`}</Title>
        {!showAdd && (
          <AddBtn onClick={() => setShowAdd(true)} aria-label="Добавить зависимость">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Добавить
          </AddBtn>
        )}
      </Header>

      <DepList>
        {allDeps.map((d) => (
          <DepRow key={d.id}>
            <DepTypeLabel $type={d.type as TaskopsDependencyType}>
              {DEP_LABELS[d.type as TaskopsDependencyType]}
            </DepTypeLabel>
            <DepTitle>
              {d.dir === 'out' ? d.target_task_title : d.source_task_title}
            </DepTitle>
            <RemoveBtn
              onClick={() => deleteDep.mutate(d.id)}
              aria-label="Удалить зависимость"
            >
              ×
            </RemoveBtn>
          </DepRow>
        ))}
      </DepList>

      {showAdd && (
        <AddForm>
          <AddFormTop>
            <TypeSelect
              value={depType}
              onChange={(e) => setDepType(e.target.value as TaskopsDependencyType)}
            >
              <option value="blocks">Блокирует</option>
              <option value="blocked_by">Зависит от</option>
              <option value="relates_to">Связана с</option>
            </TypeSelect>
            <SearchInput
              ref={inputRef}
              placeholder="Найти задачу..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <CancelAddBtn onClick={() => { setShowAdd(false); setQ(''); }}>×</CancelAddBtn>
          </AddFormTop>

          <SearchResults>
            {q.length === 0 && (
              <SearchEmpty>Введите название задачи для поиска</SearchEmpty>
            )}
            {q.length > 0 && candidates.length === 0 && (
              <SearchEmpty>Задачи не найдены</SearchEmpty>
            )}
            {candidates.map((t) => (
              <SearchResultItem
                key={t.id}
                onClick={() => handleAdd(t.id)}
                disabled={createDep.isPending}
              >
                <span
                  style={{
                    width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                    background: t.status === 'done' ? '#10b981' :
                      t.status === 'in_progress' ? '#f59e0b' :
                      t.status === 'cancelled' ? '#ef4444' : '#6b7280',
                  }}
                />
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {t.title}
                </span>
                {t.assignee_name && (
                  <span style={{ fontSize: 11, opacity: 0.5, flexShrink: 0 }}>
                    {t.assignee_name}
                  </span>
                )}
              </SearchResultItem>
            ))}
          </SearchResults>
        </AddForm>
      )}
    </Container>
  );
}
