import { useEffect, useRef, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { useProjects, useCreateTask } from '../api';
import { useTaskopsStore } from '../store/useTaskopsStore';
import type { TaskopsProject } from '../types';

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const slideUp = keyframes`
  from { opacity: 0; transform: scale(0.97) translateY(8px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
`;

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 15vh;
  z-index: 500;
  animation: ${fadeIn} 0.1s ease;
`;

const Dialog = styled.div`
  width: 560px;
  max-height: 460px;
  background: ${(p) => p.theme.colors.bgCard};
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: 14px;
  box-shadow: ${(p) => p.theme.shadows.lg};
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: ${slideUp} 0.15s ease;
`;

const SearchRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-bottom: 1px solid ${(p) => p.theme.colors.border};
`;

const SearchIcon = styled.span`
  font-size: 16px;
  flex-shrink: 0;
  color: ${(p) => p.theme.colors.textSecondary};
`;

const SearchInput = styled.input`
  flex: 1;
  background: none;
  border: none;
  font-size: 15px;
  color: ${(p) => p.theme.colors.textPrimary};
  outline: none;
  &::placeholder { color: ${(p) => p.theme.colors.textSecondary}; }
`;

const Results = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 6px;
`;

const Section = styled.div`
  margin-bottom: 4px;
`;

const SectionLabel = styled.div`
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${(p) => p.theme.colors.textSecondary};
  padding: 6px 10px 2px;
`;

const Item = styled.button<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 9px 10px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
  background: ${(p) => (p.$active ? p.theme.colors.bgHover : 'transparent')};
  color: ${(p) => p.theme.colors.textPrimary};
  font-size: 13px;
  transition: background 0.1s;

  &:hover {
    background: ${(p) => p.theme.colors.bgHover};
  }
`;

const ItemIcon = styled.span`
  font-size: 15px;
  flex-shrink: 0;
`;

const ItemText = styled.span`
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ItemHint = styled.span`
  font-size: 11px;
  color: ${(p) => p.theme.colors.textSecondary};
`;

const KbdRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px;
  border-top: 1px solid ${(p) => p.theme.colors.border};
`;

const Kbd = styled.span`
  font-size: 10px;
  color: ${(p) => p.theme.colors.textSecondary};
  background: ${(p) => p.theme.colors.bgSecondary};
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: 4px;
  padding: 2px 6px;
  margin-left: 4px;
`;

const KbdGroup = styled.span`
  font-size: 11px;
  color: ${(p) => p.theme.colors.textSecondary};
`;

// ─── Quick-create form (shown when typing "new task") ─────────────────────

const CreateForm = styled.div`
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  border-top: 1px solid ${(p) => p.theme.colors.border};
`;

const CreateInput = styled.input`
  width: 100%;
  background: ${(p) => p.theme.colors.bgSecondary};
  color: ${(p) => p.theme.colors.textPrimary};
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: 8px;
  padding: 9px 12px;
  font-size: 13px;
  box-sizing: border-box;
  &:focus { outline: none; border-color: ${(p) => p.theme.colors.primary}; }
`;

const ProjectSelect = styled.select`
  width: 100%;
  background: ${(p) => p.theme.colors.bgSecondary};
  color: ${(p) => p.theme.colors.textPrimary};
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 13px;
  box-sizing: border-box;
`;

const CreateBtn = styled.button`
  background: ${(p) => p.theme.colors.primary};
  color: white;
  border: none;
  border-radius: 8px;
  padding: 9px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  &:disabled { opacity: 0.5; }
`;

// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
}

type CommandMode = 'search' | 'create-task';

export function CommandPalette({ open, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<CommandMode>('search');
  const [activeIndex, setActiveIndex] = useState(0);
  const [newTitle, setNewTitle] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  const { data: projects = [] } = useProjects();
  const { setActiveProject } = useTaskopsStore();
  const createTask = useCreateTask(selectedProjectId);

  useEffect(() => {
    if (open) {
      setQuery('');
      setMode('search');
      setActiveIndex(0);
      setNewTitle('');
      setSelectedProjectId(projects[0]?.id ?? '');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Always set default project when projects load
  useEffect(() => {
    if (projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects]);

  const filteredProjects: TaskopsProject[] = query
    ? projects.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
    : projects.slice(0, 5);

  const staticCommands = [
    { id: 'create-task', icon: '➕', label: 'Создать задачу', hint: 'C', action: () => { setMode('create-task'); setTimeout(() => titleRef.current?.focus(), 50); } },
    { id: 'inbox', icon: '📥', label: 'Перейти в Мои задачи', hint: 'G I', action: () => { setActiveProject(null); onClose(); } },
  ].filter((c) => !query || c.label.toLowerCase().includes(query.toLowerCase()));

  const allItems = [
    ...staticCommands.map((c) => ({ ...c, type: 'command' as const })),
    ...filteredProjects.map((p) => ({
      id: p.id,
      icon: '📋',
      label: p.name,
      hint: '',
      type: 'project' as const,
      action: () => { setActiveProject(p.id); onClose(); },
    })),
  ];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { onClose(); return; }
    if (mode === 'search') {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, allItems.length - 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)); }
      if (e.key === 'Enter' && allItems[activeIndex]) { allItems[activeIndex].action(); }
      if (e.key === 'c' && !query) { setMode('create-task'); setTimeout(() => titleRef.current?.focus(), 50); }
    }
  };

  const handleCreateTask = () => {
    if (!newTitle.trim() || !selectedProjectId) return;
    createTask.mutate(
      { title: newTitle.trim() },
      {
        onSuccess: () => {
          setActiveProject(selectedProjectId);
          onClose();
        },
      }
    );
  };

  if (!open) return null;

  return (
    <Overlay onClick={(e) => e.target === e.currentTarget && onClose()}>
      <Dialog>
        <SearchRow>
          <SearchIcon>🔍</SearchIcon>
          {mode === 'search' ? (
            <SearchInput
              ref={inputRef}
              placeholder="Поиск проектов, команды... или нажмите C для задачи"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setActiveIndex(0); }}
              onKeyDown={handleKeyDown}
            />
          ) : (
            <SearchInput
              value="Создание задачи"
              readOnly
              style={{ color: '#9ca3af', cursor: 'default' }}
            />
          )}
        </SearchRow>

        {mode === 'search' && (
          <Results>
            {staticCommands.length > 0 && (
              <Section>
                <SectionLabel>Действия</SectionLabel>
                {staticCommands.map((cmd, idx) => (
                  <Item key={cmd.id} $active={activeIndex === idx} onClick={cmd.action}>
                    <ItemIcon>{cmd.icon}</ItemIcon>
                    <ItemText>{cmd.label}</ItemText>
                    {cmd.hint && <Kbd>{cmd.hint}</Kbd>}
                  </Item>
                ))}
              </Section>
            )}

            {filteredProjects.length > 0 && (
              <Section>
                <SectionLabel>Проекты</SectionLabel>
                {filteredProjects.map((p, idx) => (
                  <Item
                    key={p.id}
                    $active={activeIndex === staticCommands.length + idx}
                    onClick={() => { setActiveProject(p.id); onClose(); }}
                  >
                    <ItemIcon>📋</ItemIcon>
                    <ItemText>{p.name}</ItemText>
                    <ItemHint>{p.is_external ? 'внешний' : ''}</ItemHint>
                  </Item>
                ))}
              </Section>
            )}

            {allItems.length === 0 && (
              <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280', fontSize: 13 }}>
                Ничего не найдено
              </div>
            )}
          </Results>
        )}

        {mode === 'create-task' && (
          <CreateForm>
            <CreateInput
              ref={titleRef}
              placeholder="Название задачи"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') { setMode('search'); setQuery(''); }
                if (e.key === 'Enter') handleCreateTask();
              }}
            />
            <ProjectSelect
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </ProjectSelect>
            <CreateBtn
              onClick={handleCreateTask}
              disabled={!newTitle.trim() || !selectedProjectId || createTask.isPending}
            >
              {createTask.isPending ? 'Создание...' : 'Создать задачу (Enter)'}
            </CreateBtn>
          </CreateForm>
        )}

        <KbdRow>
          <KbdGroup>
            <Kbd>↑↓</Kbd> выбор
            <Kbd>Enter</Kbd> открыть
            <Kbd>Esc</Kbd> закрыть
          </KbdGroup>
          <KbdGroup>
            <Kbd>C</Kbd> создать задачу
          </KbdGroup>
        </KbdRow>
      </Dialog>
    </Overlay>
  );
}
