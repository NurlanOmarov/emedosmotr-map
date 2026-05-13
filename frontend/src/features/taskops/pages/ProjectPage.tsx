import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import styled, { keyframes, css } from 'styled-components';
import {
  useProject, useProjectTasks, useCreateTask,
  useTemplates, useApplyTemplate, useAssignableUsers,
} from '../api';
import { 
  LuPlus, 
  LuFileText, 
  LuConstruction, 
  LuRefreshCw, 
  LuTriangleAlert 
} from 'react-icons/lu';
import { TaskRow } from '../components/TaskRow';
import { TaskDetailPanel } from '../components/TaskDetailPanel';
import { BoardView } from '../components/BoardView';
import { CyclesPanel } from '../components/CyclesPanel';
import { GanttView } from '../components/GanttView';
import { CalendarView } from '../components/CalendarView';
import { StatusBadge } from '../components/StatusBadge';
import { FiltersBar } from '../components/FiltersBar';
import { CommandPalette } from '../components/CommandPalette';
import { useTaskopsStore } from '../store/useTaskopsStore';
import { useTaskopsWS } from '../hooks/useTaskopsWS';
import type { TaskopsTaskStatus, TaskopsTaskPriority } from '../types';
import { PRIORITY_LABELS } from '../types';

// ─── Animations ──────────────────────────────────────────────────────────────

const modalIn = keyframes`
  from { opacity: 0; transform: scale(0.95) translateY(-8px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
`;

const overlayIn = keyframes`
  from { opacity: 0; }
  to   { opacity: 1; }
`;

const shimmer = keyframes`
  0%   { background-position: -400px 0; }
  100% { background-position: 400px 0; }
`;

const rowAppear = keyframes`
  from { opacity: 0; transform: translateX(-6px); }
  to   { opacity: 1; transform: translateX(0); }
`;

// ─── Layout ───────────────────────────────────────────────────────────────────

const Container = styled.div`
  display: flex;
  height: 100%;
`;

const Main = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
`;

const PageHeader = styled.div`
  padding: 14px 20px 10px;
  border-bottom: 1px solid ${(p) => p.theme.colors.border};
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
`;

const PageTitle = styled.h1`
  font-size: 16px;
  font-weight: 600;
  color: ${(p) => p.theme.colors.textPrimary};
  margin: 0;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ViewTabs = styled.div`
  display: flex;
  gap: 2px;
  background: ${(p) => p.theme.colors.bgSecondary};
  border-radius: 8px;
  padding: 3px;
  flex-shrink: 0;
`;

const ViewTab = styled.button<{ $active?: boolean }>`
  padding: 4px 12px;
  font-size: 12px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.18s;
  background: ${(p) => (p.$active ? p.theme.colors.bgCard : 'transparent')};
  color: ${(p) => (p.$active ? p.theme.colors.textPrimary : p.theme.colors.textSecondary)};
  box-shadow: ${(p) => p.$active ? '0 1px 3px rgba(0,0,0,0.25)' : 'none'};
  &:hover { color: ${(p) => p.theme.colors.textPrimary}; }
  &:focus-visible { outline: 2px solid ${(p) => p.theme.colors.primary}; outline-offset: 1px; }
`;

const NewTaskBtn = styled.button`
  background: ${(p) => p.theme.colors.primary};
  color: white;
  border: none;
  border-radius: 7px;
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.18s;
  display: flex;
  align-items: center;
  gap: 6px;
  &:hover { opacity: 0.9; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(59,130,246,0.35); }
  &:active { transform: translateY(0); }
  &:focus-visible { outline: 2px solid ${(p) => p.theme.colors.primary}; outline-offset: 2px; }
`;

const Content = styled.div`
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const TaskList = styled.div`
  flex: 1;
  overflow-y: auto;
`;

const StatusGroupHeader = styled.div`
  padding: 6px 16px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${(p) => p.theme.colors.textSecondary};
  background: ${(p) => p.theme.colors.bgSecondary};
  position: sticky;
  top: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const AnimatedRow = styled.div<{ $index: number }>`
  animation: ${rowAppear} 0.22s ease-out both;
  animation-delay: ${(p) => Math.min(p.$index * 25, 200)}ms;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 240px;
  color: ${(p) => p.theme.colors.textSecondary};
  font-size: 14px;
  gap: 12px;
`;

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const skeletonBase = css`
  background: linear-gradient(
    90deg,
    ${(p) => p.theme.colors.bgSecondary} 25%,
    ${(p) => p.theme.colors.bgHover} 50%,
    ${(p) => p.theme.colors.bgSecondary} 75%
  );
  background-size: 800px 100%;
  animation: ${shimmer} 1.4s infinite linear;
  border-radius: 6px;
`;

const SkeletonRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid ${(p) => p.theme.colors.border};
`;

const SkeletonBlock = styled.div<{ w?: string; h?: string }>`
  ${skeletonBase}
  width: ${(p) => p.w || '100%'};
  height: ${(p) => p.h || '14px'};
  flex-shrink: 0;
`;

function TaskListSkeleton() {
  return (
    <>
      {[40, 65, 50, 80, 55, 70].map((w, i) => (
        <SkeletonRow key={i}>
          <SkeletonBlock w="16px" h="16px" style={{ borderRadius: '50%' }} />
          <SkeletonBlock w={`${w}%`} />
          <SkeletonBlock w="60px" />
          <SkeletonBlock w="70px" />
        </SkeletonRow>
      ))}
    </>
  );
}

// ─── Glassmorphism Modal ──────────────────────────────────────────────────────

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  animation: ${overlayIn} 0.2s ease-out;
`;

const Modal = styled.div`
  background: ${(p) =>
    p.theme.mode === 'dark'
      ? 'rgba(30, 41, 59, 0.85)'
      : 'rgba(255, 255, 255, 0.92)'};
  backdrop-filter: blur(20px);
  border: 1px solid ${(p) => p.theme.colors.glassBorder || p.theme.colors.border};
  border-radius: 16px;
  padding: 24px;
  width: 520px;
  max-width: 96vw;
  display: flex;
  flex-direction: column;
  gap: 14px;
  box-shadow: ${(p) => p.theme.shadows.lg};
  animation: ${modalIn} 0.22s cubic-bezier(0.4, 0, 0.2, 1);
`;

const ModalTitle = styled.h3`
  font-size: 17px;
  font-weight: 700;
  color: ${(p) => p.theme.colors.textPrimary};
  margin: 0;
`;

const FormField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
`;

const FormLabel = styled.label`
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${(p) => p.theme.colors.textSecondary};
`;

const Input = styled.input`
  width: 100%;
  background: ${(p) => p.theme.colors.bgSecondary};
  color: ${(p) => p.theme.colors.textPrimary};
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 14px;
  font-family: inherit;
  box-sizing: border-box;
  transition: border-color 0.15s, box-shadow 0.15s;
  &:focus {
    outline: none;
    border-color: ${(p) => p.theme.colors.primary};
    box-shadow: 0 0 0 3px ${(p) => p.theme.colors.primaryGlow};
  }
`;

const Textarea = styled.textarea`
  width: 100%;
  background: ${(p) => p.theme.colors.bgSecondary};
  color: ${(p) => p.theme.colors.textPrimary};
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 13px;
  min-height: 70px;
  resize: vertical;
  font-family: inherit;
  box-sizing: border-box;
  transition: border-color 0.15s, box-shadow 0.15s;
  &:focus {
    outline: none;
    border-color: ${(p) => p.theme.colors.primary};
    box-shadow: 0 0 0 3px ${(p) => p.theme.colors.primaryGlow};
  }
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 10px;
`;

const Select = styled.select`
  width: 100%;
  background: ${(p) => p.theme.colors.bgSecondary};
  color: ${(p) => p.theme.colors.textPrimary};
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: 8px;
  padding: 9px 10px;
  font-size: 13px;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
  &:focus {
    outline: none;
    border-color: ${(p) => p.theme.colors.primary};
    box-shadow: 0 0 0 3px ${(p) => p.theme.colors.primaryGlow};
  }
`;

const DateInput = styled(Input)`
  &::-webkit-calendar-picker-indicator {
    filter: invert(0.5);
    cursor: pointer;
  }
`;

const ModalActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 2px;
`;

const CancelBtn = styled.button`
  background: none;
  border: 1px solid ${(p) => p.theme.colors.border};
  color: ${(p) => p.theme.colors.textPrimary};
  border-radius: 8px;
  padding: 8px 18px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
  &:hover { border-color: ${(p) => p.theme.colors.borderHover}; }
  &:focus-visible { outline: 2px solid ${(p) => p.theme.colors.primary}; outline-offset: 2px; }
`;

const SaveBtn = styled.button`
  background: ${(p) => p.theme.colors.primary};
  color: white;
  border: none;
  border-radius: 8px;
  padding: 8px 20px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.18s;
  &:hover:not(:disabled) {
    opacity: 0.92;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(59,130,246,0.35);
  }
  &:disabled { opacity: 0.45; cursor: not-allowed; }
  &:focus-visible { outline: 2px solid ${(p) => p.theme.colors.primary}; outline-offset: 2px; }
`;

const TemplateBtn = styled.button`
  background: none;
  border: 1px solid ${(p) => p.theme.colors.border};
  color: ${(p) => p.theme.colors.textSecondary};
  border-radius: 7px;
  padding: 6px 12px;
  font-size: 13px;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s;
  &:hover {
    border-color: ${(p) => p.theme.colors.primary};
    color: ${(p) => p.theme.colors.textPrimary};
  }
  &:focus-visible { outline: 2px solid ${(p) => p.theme.colors.primary}; outline-offset: 2px; }
`;

const TemplateList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const TemplateItem = styled.button`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: ${(p) => p.theme.colors.bgSecondary};
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: 10px;
  cursor: pointer;
  text-align: left;
  width: 100%;
  transition: all 0.18s;
  &:hover {
    border-color: ${(p) => p.theme.colors.primary};
    background: ${(p) => p.theme.colors.primaryGlow};
    transform: translateY(-1px);
  }
  &:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
  &:focus-visible { outline: 2px solid ${(p) => p.theme.colors.primary}; outline-offset: 2px; }
`;

const TemplateName = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: ${(p) => p.theme.colors.textPrimary};
`;

const TemplateCount = styled.div`
  font-size: 12px;
  color: ${(p) => p.theme.colors.textSecondary};
  margin-top: 2px;
`;

// ─── Consts ───────────────────────────────────────────────────────────────────

const STATUSES: TaskopsTaskStatus[] = ['backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled'];
const PRIORITIES: TaskopsTaskPriority[] = ['p0_urgent', 'p1_high', 'p2_medium', 'p3_low'];
type ViewType = 'list' | 'board' | 'timeline' | 'calendar' | 'cycles';

interface Props {
  projectId: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ProjectPage({ projectId }: Props) {
  const [filters, setFilters] = useState<any>({});
  const { data: project } = useProject(projectId);
  const { data: tasksResp, isLoading } = useProjectTasks(projectId, { per_page: 200, ...filters });
  const createTask = useCreateTask(projectId);
  const { data: templates = [] } = useTemplates();
  const applyTemplate = useApplyTemplate(projectId);
  const { data: assignableUsers = [] } = useAssignableUsers();
  const [searchParams, setSearchParams] = useSearchParams();
  const { activeTaskId, sidePanelOpen, openSidePanel, closeSidePanel } = useTaskopsStore();
  useTaskopsWS(projectId);

  const handleOpenTask = (id: string) => {
    openSidePanel(id);
    setSearchParams({ task: id });
  };

  const handleCloseTask = () => {
    closeSidePanel();
    setSearchParams({});
  };

  useEffect(() => {
    const urlTaskId = searchParams.get('task');
    if (urlTaskId && urlTaskId !== activeTaskId) {
      openSidePanel(urlTaskId);
    }
  }, []);

  const [view, setView] = useState<ViewType>('list');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  // Create form state
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState<TaskopsTaskPriority>('p2_medium');
  const [newAssigneeId, setNewAssigneeId] = useState('');
  const [newDueDate, setNewDueDate] = useState('');

  const tasks = tasksResp?.items ?? [];

  const tasksByStatus = STATUSES.reduce(
    (acc, s) => ({ ...acc, [s]: tasks.filter((t) => t.status === s) }),
    {} as Record<TaskopsTaskStatus, typeof tasks>
  );

  const resetForm = () => {
    setNewTitle('');
    setNewDesc('');
    setNewPriority('p2_medium');
    setNewAssigneeId('');
    setNewDueDate('');
  };

  const handleCreate = () => {
    if (!newTitle.trim()) return;
    createTask.mutate(
      {
        title: newTitle.trim(),
        description: newDesc.trim() || undefined,
        priority: newPriority,
        assignee_id: newAssigneeId || undefined,
        due_date: newDueDate || undefined,
      } as any,
      {
        onSuccess: () => {
          resetForm();
          setShowCreateModal(false);
        },
      }
    );
  };

  const handleCloseCreate = () => {
    resetForm();
    setShowCreateModal(false);
  };

  return (
    <Container>
      <Main>
        <PageHeader>
          <PageTitle>{project?.name ?? '…'}</PageTitle>
          <ViewTabs>
            {(['list', 'board', 'timeline', 'calendar', 'cycles'] as ViewType[]).map((v) => (
              <ViewTab key={v} $active={view === v} onClick={() => setView(v)}>
                {v === 'list' ? 'Список' :
                 v === 'board' ? 'Доска' :
                 v === 'timeline' ? 'Таймлайн' :
                 v === 'calendar' ? 'Календарь' : 'Спринты'}
              </ViewTab>
            ))}
          </ViewTabs>
          <TemplateBtn onClick={() => setShowTemplateModal(true)}>
            Шаблон
          </TemplateBtn>
          <NewTaskBtn onClick={() => setShowCreateModal(true)}>
            <LuPlus size={16} /> Задача
          </NewTaskBtn>
        </PageHeader>

        <FiltersBar filters={filters} onChange={setFilters} />

        <Content>
          {view === 'board' ? (
            <BoardView
              projectId={projectId}
              tasks={tasks}
              selectedTaskId={activeTaskId}
              onTaskClick={handleOpenTask}
            />
          ) : view === 'timeline' ? (
            <GanttView
              tasks={tasks}
              selectedTaskId={activeTaskId}
              onTaskClick={handleOpenTask}
            />
          ) : view === 'calendar' ? (
            <CalendarView tasks={tasks} onTaskClick={handleOpenTask} />
          ) : view === 'cycles' ? (
            <CyclesPanel projectId={projectId} />
          ) : (
            <TaskList>
              {isLoading && <TaskListSkeleton />}
              {!isLoading && tasks.length === 0 && (
                <EmptyState>
                  <LuFileText size={40} style={{ opacity: 0.4 }} />
                  <span>Задач пока нет</span>
                  <NewTaskBtn onClick={() => setShowCreateModal(true)}>
                    <LuPlus size={16} /> Создать первую задачу
                  </NewTaskBtn>
                </EmptyState>
              )}
              {!isLoading &&
                STATUSES.map((status) => {
                  const group = tasksByStatus[status];
                  if (group.length === 0) return null;
                  return (
                    <div key={status}>
                      <StatusGroupHeader>
                        <StatusBadge status={status} />
                        <span>{group.length}</span>
                      </StatusGroupHeader>
                      {group.map((task, idx) => (
                        <AnimatedRow key={task.id} $index={idx}>
                          <TaskRow
                            task={task}
                            selected={activeTaskId === task.id}
                            onClick={() => handleOpenTask(task.id)}
                          />
                        </AnimatedRow>
                      ))}
                    </div>
                  );
                })}
            </TaskList>
          )}
        </Content>
      </Main>

      {sidePanelOpen && activeTaskId && (
        <TaskDetailPanel taskId={activeTaskId} onClose={handleCloseTask} />
      )}

      {/* ── Template Modal ──────────────────────────────────────────────── */}
      {showTemplateModal && (
        <ModalOverlay onClick={(e) => e.target === e.currentTarget && setShowTemplateModal(false)}>
          <Modal>
            <ModalTitle>Применить шаблон</ModalTitle>
            <div style={{ fontSize: 13, color: 'var(--text-secondary, #9ca3af)', marginTop: -6 }}>
              Шаблон добавит задачи в текущий проект
            </div>
            <TemplateList>
              {templates.map((tpl) => (
                <TemplateItem
                  key={tpl.id}
                  disabled={applyTemplate.isPending}
                  onClick={() => applyTemplate.mutate(tpl.id, { onSuccess: () => setShowTemplateModal(false) })}
                >
                  <span style={{ fontSize: 20, color: '#3B82F6' }}>
                    {tpl.id === 'implementation' ? <LuConstruction /> : tpl.id === 'sprint' ? <LuRefreshCw /> : <LuTriangleAlert />}
                  </span>
                  <div>
                    <TemplateName>{tpl.name}</TemplateName>
                    <TemplateCount>{tpl.task_count} задач</TemplateCount>
                  </div>
                </TemplateItem>
              ))}
            </TemplateList>
            <ModalActions>
              <CancelBtn onClick={() => setShowTemplateModal(false)}>Закрыть</CancelBtn>
            </ModalActions>
          </Modal>
        </ModalOverlay>
      )}

      {/* ── Create Task Modal ───────────────────────────────────────────── */}
      {showCreateModal && (
        <ModalOverlay onClick={(e) => e.target === e.currentTarget && handleCloseCreate()}>
          <Modal role="dialog" aria-modal="true" aria-labelledby="create-task-title">
            <ModalTitle id="create-task-title">Новая задача</ModalTitle>

            <FormField>
              <FormLabel htmlFor="task-title">Название</FormLabel>
              <Input
                id="task-title"
                autoFocus
                placeholder="Что нужно сделать?"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleCreate()}
              />
            </FormField>

            <FormField>
              <FormLabel htmlFor="task-desc">Описание</FormLabel>
              <Textarea
                id="task-desc"
                placeholder="Дополнительные детали (необязательно)"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
              />
            </FormField>

            <FormRow>
              <FormField>
                <FormLabel htmlFor="task-priority">Приоритет</FormLabel>
                <Select
                  id="task-priority"
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as TaskopsTaskPriority)}
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
                  ))}
                </Select>
              </FormField>

              <FormField>
                <FormLabel htmlFor="task-assignee">Исполнитель</FormLabel>
                <Select
                  id="task-assignee"
                  value={newAssigneeId}
                  onChange={(e) => setNewAssigneeId(e.target.value)}
                >
                  <option value="">Не назначен</option>
                  {assignableUsers.map((u) => (
                    <option key={u.id} value={u.id}>{u.full_name}</option>
                  ))}
                </Select>
              </FormField>

              <FormField>
                <FormLabel htmlFor="task-due">Срок</FormLabel>
                <DateInput
                  id="task-due"
                  type="date"
                  onClick={(e) => e.currentTarget.showPicker?.()}
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                />
              </FormField>
            </FormRow>

            <ModalActions>
              <CancelBtn onClick={handleCloseCreate}>Отмена</CancelBtn>
              <SaveBtn
                onClick={handleCreate}
                disabled={!newTitle.trim() || createTask.isPending}
              >
                {createTask.isPending ? 'Создание…' : 'Создать задачу'}
              </SaveBtn>
            </ModalActions>
          </Modal>
        </ModalOverlay>
      )}

      <CommandPalette projectId={projectId} />
    </Container>
  );
}
