import { useState } from 'react';
import styled from 'styled-components';
import { useProject, useProjectTasks, useCreateTask, useTemplates, useApplyTemplate } from '../api';
import { TaskRow } from '../components/TaskRow';
import { TaskDetailPanel } from '../components/TaskDetailPanel';
import { BoardView } from '../components/BoardView';
import { CyclesPanel } from '../components/CyclesPanel';
import { GanttView } from '../components/GanttView';
import { CalendarView } from '../components/CalendarView';
import { StatusBadge } from '../components/StatusBadge';
import { useTaskopsStore } from '../store/useTaskopsStore';
import { useTaskopsWS } from '../hooks/useTaskopsWS';
import type { TaskopsTaskStatus } from '../types';

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
  background: ${(p) => (p.$active ? p.theme.colors.bgCard : 'transparent')};
  color: ${(p) => (p.$active ? p.theme.colors.textPrimary : p.theme.colors.textSecondary)};
  transition: all 0.15s;
  &:hover { color: ${(p) => p.theme.colors.textPrimary}; }
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
  &:hover { opacity: 0.9; }
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

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: ${(p) => p.theme.colors.textSecondary};
  font-size: 14px;
  gap: 12px;
`;

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
`;

const Modal = styled.div`
  background: ${(p) => p.theme.colors.bgCard};
  border-radius: 12px;
  padding: 24px;
  width: 480px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: ${(p) => p.theme.shadows.lg};
`;

const ModalTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  color: ${(p) => p.theme.colors.textPrimary};
  margin: 0;
`;

const Input = styled.input`
  width: 100%;
  background: ${(p) => p.theme.colors.bgSecondary};
  color: ${(p) => p.theme.colors.textPrimary};
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 14px;
  box-sizing: border-box;
  &:focus { outline: none; border-color: ${(p) => p.theme.colors.primary}; }
`;

const Textarea = styled.textarea`
  width: 100%;
  background: ${(p) => p.theme.colors.bgSecondary};
  color: ${(p) => p.theme.colors.textPrimary};
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 13px;
  min-height: 80px;
  resize: vertical;
  font-family: inherit;
  box-sizing: border-box;
  &:focus { outline: none; border-color: ${(p) => p.theme.colors.primary}; }
`;

const ModalActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
`;

const CancelBtn = styled.button`
  background: none;
  border: 1px solid ${(p) => p.theme.colors.border};
  color: ${(p) => p.theme.colors.textPrimary};
  border-radius: 8px;
  padding: 7px 16px;
  font-size: 13px;
  cursor: pointer;
`;

const SaveBtn = styled.button`
  background: ${(p) => p.theme.colors.primary};
  color: white;
  border: none;
  border-radius: 8px;
  padding: 7px 16px;
  font-size: 13px;
  cursor: pointer;
  &:disabled { opacity: 0.5; }
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
  &:hover {
    border-color: ${(p) => p.theme.colors.primary};
    color: ${(p) => p.theme.colors.textPrimary};
  }
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
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
  width: 100%;
  transition: border-color 0.15s;
  &:hover { border-color: ${(p) => p.theme.colors.primary}; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
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

const STATUSES: TaskopsTaskStatus[] = ['backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled'];
type ViewType = 'list' | 'board' | 'timeline' | 'calendar' | 'cycles';

interface Props {
  projectId: string;
}

export function ProjectPage({ projectId }: Props) {
  const { data: project } = useProject(projectId);
  const { data: tasksResp, isLoading } = useProjectTasks(projectId, { per_page: 200 });
  const createTask = useCreateTask(projectId);
  const { data: templates = [] } = useTemplates();
  const applyTemplate = useApplyTemplate(projectId);
  const { activeTaskId, sidePanelOpen, openSidePanel, closeSidePanel } = useTaskopsStore();
  useTaskopsWS(projectId);

  const [view, setView] = useState<ViewType>('list');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const tasks = tasksResp?.items ?? [];

  const tasksByStatus = STATUSES.reduce(
    (acc, s) => ({ ...acc, [s]: tasks.filter((t) => t.status === s) }),
    {} as Record<TaskopsTaskStatus, typeof tasks>
  );

  const handleCreate = () => {
    if (!newTitle.trim()) return;
    createTask.mutate(
      { title: newTitle.trim(), description: newDesc.trim() || undefined },
      {
        onSuccess: () => {
          setNewTitle('');
          setNewDesc('');
          setShowCreateModal(false);
        },
      }
    );
  };

  return (
    <Container>
      <Main>
        <PageHeader>
          <PageTitle>{project?.name ?? '...'}</PageTitle>
          <ViewTabs>
            <ViewTab $active={view === 'list'} onClick={() => setView('list')}>Список</ViewTab>
            <ViewTab $active={view === 'board'} onClick={() => setView('board')}>Доска</ViewTab>
            <ViewTab $active={view === 'timeline'} onClick={() => setView('timeline')}>Таймлайн</ViewTab>
            <ViewTab $active={view === 'calendar'} onClick={() => setView('calendar')}>Календарь</ViewTab>
            <ViewTab $active={view === 'cycles'} onClick={() => setView('cycles')}>Спринты</ViewTab>
          </ViewTabs>
          <TemplateBtn onClick={() => setShowTemplateModal(true)}>📋 Шаблон</TemplateBtn>
          <NewTaskBtn onClick={() => setShowCreateModal(true)}>+ Задача</NewTaskBtn>
        </PageHeader>

        <Content>
          {view === 'board' ? (
            <BoardView
              projectId={projectId}
              tasks={tasks}
              selectedTaskId={activeTaskId}
              onTaskClick={(id) => openSidePanel(id)}
            />
          ) : view === 'timeline' ? (
            <GanttView
              tasks={tasks}
              selectedTaskId={activeTaskId}
              onTaskClick={(id) => openSidePanel(id)}
            />
          ) : view === 'calendar' ? (
            <CalendarView
              tasks={tasks}
              onTaskClick={(id) => openSidePanel(id)}
            />
          ) : view === 'cycles' ? (
            <CyclesPanel projectId={projectId} />
          ) : (
            <TaskList>
              {isLoading && (
                <div style={{ padding: 20, color: '#9ca3af', fontSize: 13 }}>Загрузка...</div>
              )}
              {!isLoading && tasks.length === 0 && (
                <EmptyState>
                  <span style={{ fontSize: 32 }}>📋</span>
                  <span>Задач пока нет</span>
                  <NewTaskBtn onClick={() => setShowCreateModal(true)}>
                    Создать первую задачу
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
                      {group.map((task) => (
                        <TaskRow
                          key={task.id}
                          task={task}
                          selected={activeTaskId === task.id}
                          onClick={() => openSidePanel(task.id)}
                        />
                      ))}
                    </div>
                  );
                })}
            </TaskList>
          )}
        </Content>
      </Main>

      {sidePanelOpen && activeTaskId && (
        <TaskDetailPanel taskId={activeTaskId} onClose={closeSidePanel} />
      )}

      {showTemplateModal && (
        <ModalOverlay onClick={(e) => e.target === e.currentTarget && setShowTemplateModal(false)}>
          <Modal>
            <ModalTitle>Применить шаблон</ModalTitle>
            <div style={{ fontSize: 13, color: '#9ca3af', marginTop: -4 }}>
              Шаблон добавит задачи в текущий проект
            </div>
            <TemplateList>
              {templates.map((tpl) => (
                <TemplateItem
                  key={tpl.id}
                  disabled={applyTemplate.isPending}
                  onClick={() =>
                    applyTemplate.mutate(tpl.id, {
                      onSuccess: () => setShowTemplateModal(false),
                    })
                  }
                >
                  <span style={{ fontSize: 24 }}>
                    {tpl.id === 'implementation' ? '🏗' : tpl.id === 'sprint' ? '🔄' : '🚨'}
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

      {showCreateModal && (
        <ModalOverlay onClick={(e) => e.target === e.currentTarget && setShowCreateModal(false)}>
          <Modal>
            <ModalTitle>Новая задача</ModalTitle>
            <Input
              autoFocus
              placeholder="Название задачи"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            <Textarea
              placeholder="Описание (необязательно)"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
            />
            <ModalActions>
              <CancelBtn onClick={() => setShowCreateModal(false)}>Отмена</CancelBtn>
              <SaveBtn
                onClick={handleCreate}
                disabled={!newTitle.trim() || createTask.isPending}
              >
                Создать
              </SaveBtn>
            </ModalActions>
          </Modal>
        </ModalOverlay>
      )}
    </Container>
  );
}
