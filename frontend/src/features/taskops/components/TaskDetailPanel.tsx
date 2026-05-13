import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { 
  LuX, 
  LuTrash2, 
  LuPlay, 
  LuCheck, 
  LuClipboardList, 
  LuRefreshCw, 
  LuFlag, 
  LuUser, 
  LuCalendar, 
  LuCalendarDays, 
  LuTimer, 
  LuCircleUser, 
  LuMapPin, 
  LuMap 
} from 'react-icons/lu';
import { useTask, useUpdateTask, useTaskComments, useAddComment, useAssignableUsers, useDeleteTask, useProjectCycles } from '../api';
import { useConfirm } from '@/components/shared/ConfirmDialog';
import { useEscapeKey } from '@/hooks/useKeyboardShortcuts';
import { StatusBadge } from './StatusBadge';
import { MentionTextarea } from './MentionTextarea';
import { AttachmentsSection } from './AttachmentsSection';
import { SubtasksSection } from './SubtasksSection';
import { DependenciesSection } from './DependenciesSection';
import { STATUS_LABELS, PRIORITY_LABELS } from '../types';
import type { TaskopsTaskStatus, TaskopsTaskPriority } from '../types';

// ─── Layout ──────────────────────────────────────────────────────────────────

const PanelOverlay = styled.div`
  display: none;
  @media (max-width: 768px) {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.5);
    backdrop-filter: blur(2px);
    z-index: 1999;
  }
`;

const Panel = styled.div`
  width: 440px;
  min-width: 440px;
  height: 100%;
  border-left: 1px solid ${(p) => p.theme.colors.border};
  background: ${(p) => p.theme.colors.bgCard};
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: -4px 0 12px rgba(0, 0, 0, 0.1);
  animation: slideIn 0.2s ease-out;

  @media (max-width: 768px) {
    position: fixed;
    inset: 10% 0 0 0;
    width: 100%;
    min-width: 0;
    z-index: 2000;
    border-left: none;
    border-top: 1px solid ${(p) => p.theme.colors.border};
    border-radius: 20px 20px 0 0;
    animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  @keyframes slideIn {
    from { transform: translateX(100%); }
    to { transform: translateX(0); }
  }

  @keyframes slideUp {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
  }
`;

const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px 12px;
  border-bottom: 1px solid ${(p) => p.theme.colors.border};
  gap: 10px;
`;

const DeleteTaskBtn = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  color: ${(p) => p.theme.colors.textSecondary};
  padding: 5px 6px;
  line-height: 1;
  flex-shrink: 0;
  border-radius: 5px;
  display: flex;
  align-items: center;
  transition: all 0.15s;
  &:hover { background: ${(p) => p.theme.colors.criticalBg}; color: ${(p) => p.theme.colors.critical}; }
  &:focus-visible { outline: 2px solid ${(p) => p.theme.colors.critical}; outline-offset: 2px; }
`;

const CloseBtn = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  color: ${(p) => p.theme.colors.textSecondary};
  font-size: 20px;
  padding: 2px 6px;
  line-height: 1;
  flex-shrink: 0;
  border-radius: 5px;
  &:hover { background: ${(p) => p.theme.colors.bgHover}; color: ${(p) => p.theme.colors.textPrimary}; }
`;

const PanelBody = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 18px 20px;
`;

const TitleInput = styled.input`
  font-size: 16px;
  font-weight: 600;
  color: ${(p) => p.theme.colors.textPrimary};
  background: none;
  border: none;
  outline: none;
  width: 100%;
  margin: 0 0 18px;
  padding: 0;
  line-height: 1.4;
  border-bottom: 2px solid transparent;
  &:hover { border-bottom-color: ${(p) => p.theme.colors.border}; }
  &:focus { border-bottom-color: ${(p) => p.theme.colors.primary}; }
`;

// ─── Field rows ──────────────────────────────────────────────────────────────

const FieldGrid = styled.div`
  display: grid;
  grid-template-columns: 110px 1fr;
  gap: 6px 12px;
  margin-bottom: 20px;
  align-items: center;
`;

const FieldLabel = styled.span`
  font-size: 12px;
  color: ${(p) => p.theme.colors.textSecondary};
  display: flex;
  align-items: center;
  gap: 4px;
`;

const FieldControl = styled.div`
  display: flex;
  align-items: center;
`;

const Select = styled.select`
  font-size: 12px;
  background: ${(p) => p.theme.colors.bgSecondary};
  color: ${(p) => p.theme.colors.textPrimary};
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: 6px;
  padding: 5px 8px;
  cursor: pointer;
  width: 100%;
  &:focus { outline: none; border-color: ${(p) => p.theme.colors.primary}; }
`;

const DateInput = styled.input`
  font-size: 12px;
  background: ${(p) => p.theme.colors.bgSecondary};
  color: ${(p) => p.theme.colors.textPrimary};
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: 6px;
  padding: 5px 8px;
  cursor: pointer;
  width: 100%;
  &:focus { outline: none; border-color: ${(p) => p.theme.colors.primary}; }
  &::-webkit-calendar-picker-indicator { filter: ${(p) => p.theme.colors.textSecondary === '#6b7280' ? 'invert(0)' : 'invert(1)'}; opacity: 0.5; }
`;

const EstimateInput = styled.input`
  font-size: 12px;
  background: ${(p) => p.theme.colors.bgSecondary};
  color: ${(p) => p.theme.colors.textPrimary};
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: 6px;
  padding: 5px 8px;
  width: 100%;
  &:focus { outline: none; border-color: ${(p) => p.theme.colors.primary}; }
`;

const UnsetBtn = styled.button`
  margin-left: 6px;
  background: none;
  border: none;
  color: ${(p) => p.theme.colors.textSecondary};
  font-size: 14px;
  cursor: pointer;
  padding: 0 2px;
  flex-shrink: 0;
  opacity: 0.6;
  &:hover { opacity: 1; color: ${(p) => p.theme.colors.critical}; }
`;

// ─── Description ─────────────────────────────────────────────────────────────

const DescLabel = styled.div`
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${(p) => p.theme.colors.textSecondary};
  margin-bottom: 6px;
`;

const DescTextarea = styled.textarea`
  width: 100%;
  background: ${(p) => p.theme.colors.bgSecondary};
  color: ${(p) => p.theme.colors.textPrimary};
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 13px;
  font-family: inherit;
  min-height: 90px;
  resize: vertical;
  box-sizing: border-box;
  line-height: 1.6;
  margin-bottom: 20px;
  &:focus { outline: none; border-color: ${(p) => p.theme.colors.primary}; }
  &::placeholder { color: ${(p) => p.theme.colors.textSecondary}; opacity: 0.6; }
`;

// ─── Comments ────────────────────────────────────────────────────────────────

const CommentsSection = styled.div`
  border-top: 1px solid ${(p) => p.theme.colors.border};
  padding-top: 16px;
`;

const SectionTitle = styled.div`
  font-size: 11px;
  font-weight: 600;
  color: ${(p) => p.theme.colors.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 12px;
`;

const CommentItem = styled.div`
  margin-bottom: 12px;
`;

const CommentAuthor = styled.div`
  font-size: 12px;
  font-weight: 500;
  color: ${(p) => p.theme.colors.textPrimary};
  margin-bottom: 2px;
`;

const CommentTime = styled.span`
  font-size: 11px;
  color: ${(p) => p.theme.colors.textSecondary};
  margin-left: 8px;
  font-weight: 400;
`;

const CommentText = styled.div`
  font-size: 13px;
  color: ${(p) => p.theme.colors.textSecondary};
  white-space: pre-wrap;
  line-height: 1.5;
`;

const MentionSpan = styled.span`
  color: ${(p) => p.theme.colors.primary};
  font-weight: 500;
  background: ${(p) => p.theme.colors.primaryGlow};
  border-radius: 3px;
  padding: 0 2px;
`;

const CommentForm = styled.div`
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const SendBtn = styled.button`
  align-self: flex-end;
  background: ${(p) => p.theme.colors.primary};
  color: white;
  border: none;
  border-radius: 6px;
  padding: 6px 16px;
  font-size: 13px;
  cursor: pointer;
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const QuickActionBtn = styled.button<{ $variant?: 'primary' | 'success' }>`
  background: ${(p) => p.$variant === 'success' ? '#10b981' : p.theme.colors.primary};
  color: white;
  border: none;
  border-radius: 8px;
  padding: 10px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: opacity 0.2s;
  &:hover { opacity: 0.9; }
`;

const SaveIndicator = styled.span`
  font-size: 11px;
  color: ${(p) => p.theme.colors.textSecondary};
  margin-left: 8px;
`;

const MapContextBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 500;
  color: ${(p) => p.theme.colors.primary};
  background: ${(p) => p.theme.colors.primaryGlow};
  border: 1px solid ${(p) => p.theme.colors.primary}33;
  border-radius: 6px;
  padding: 3px 8px;
  cursor: pointer;
  margin-left: 8px;
  flex-shrink: 0;
  transition: all 0.18s;
  &:hover {
    background: ${(p) => p.theme.colors.primary};
    color: white;
    transform: translateY(-1px);
    box-shadow: 0 3px 10px rgba(59,130,246,0.35);
  }
  &:focus-visible { outline: 2px solid ${(p) => p.theme.colors.primary}; outline-offset: 2px; }
`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function renderWithMentions(text: string) {
  const parts = text.split(/(@[\w.]+)/g);
  return parts.map((part, i) =>
    /^@[\w.]+$/.test(part)
      ? <MentionSpan key={i}>{part}</MentionSpan>
      : <span key={i}>{part}</span>
  );
}

const ROLE_LABELS: Record<string, string> = {
  superadmin: 'Суперадмин',
  director: 'Директор',
  regional_manager: 'Рег. менеджер',
  admin: 'Администратор',
  engineer: 'Инженер',
  operator: 'Оператор',
  analyst: 'Аналитик',
};

interface Props {
  taskId: string;
  onClose: () => void;
}

const STATUSES: TaskopsTaskStatus[] = ['backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled'];
const PRIORITIES: TaskopsTaskPriority[] = ['p0_urgent', 'p1_high', 'p2_medium', 'p3_low'];

export function TaskDetailPanel({ taskId, onClose }: Props) {
  useEscapeKey(onClose);
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { data: task, isLoading } = useTask(taskId);
  const { data: comments = [] } = useTaskComments(taskId);
  const { data: assignableUsers = [] } = useAssignableUsers();
  const updateTask = useUpdateTask(taskId, task?.project_id);
  const deleteTask = useDeleteTask(task?.project_id ?? '');
  const addComment = useAddComment(taskId);
  const { data: cycles = [] } = useProjectCycles(task?.project_id || '');

  const handleDelete = async () => {
    if (!task) return;
    const ok = await confirm({
      title: 'Удалить задачу?',
      message: `«${task.title}» будет удалена вместе со всеми комментариями. Это действие нельзя отменить.`,
      confirmLabel: 'Удалить',
      variant: 'danger',
    });
    if (!ok) return;
    deleteTask.mutate(taskId, { onSuccess: onClose });
  };

  const [commentText, setCommentText] = useState('');
  const [localTitle, setLocalTitle] = useState<string | null>(null);
  const [localDesc, setLocalDesc] = useState<string | null>(null);
  const [localEstimate, setLocalEstimate] = useState<string | null>(null);

  if (isLoading || !task) {
    return (
      <Panel>
        <PanelHeader>
          <span />
          <CloseBtn onClick={onClose}><LuX /></CloseBtn>
        </PanelHeader>
        <PanelBody>
          <div style={{ color: '#9ca3af', fontSize: 13 }}>Загрузка...</div>
        </PanelBody>
      </Panel>
    );
  }

  const update = (data: Parameters<typeof updateTask.mutate>[0]) => updateTask.mutate(data);

  const handleSendComment = () => {
    const text = commentText.trim();
    if (!text) return;
    addComment.mutate(text, { onSuccess: () => setCommentText('') });
  };

  const handleStatusChange = (status: TaskopsTaskStatus) => {
    update({ status });
  };

  const titleValue = localTitle ?? task.title;
  const descValue = localDesc ?? (task.description || '');
  const estimateValue = localEstimate ?? (task.estimate || '');

  return (
    <>
      <PanelOverlay onClick={onClose} />
      <Panel>
        <PanelHeader>
          <StatusBadge status={task.status} />
          {updateTask.isPending && <SaveIndicator>Сохранение...</SaveIndicator>}
          <DeleteTaskBtn
            title="Удалить задачу"
            onClick={handleDelete}
            disabled={deleteTask.isPending}
          >
            <LuTrash2 size={16} />
          </DeleteTaskBtn>
          <CloseBtn onClick={onClose}><LuX /></CloseBtn>
        </PanelHeader>

        <PanelBody>
          {/* ── Field Ops Quick Actions ────────────────────────────────── */}
          {(task.status !== 'done' && task.status !== 'cancelled') && (
            <div style={{ marginBottom: 20, display: 'flex', gap: 8 }}>
              {task.status !== 'in_progress' && (
                <QuickActionBtn onClick={() => handleStatusChange('in_progress')}>
                  <LuPlay size={14} /> В работу
                </QuickActionBtn>
              )}
              <QuickActionBtn $variant="success" onClick={() => handleStatusChange('done')}>
                <LuCheck size={16} /> Выполнено
              </QuickActionBtn>
            </div>
          )}

          {/* ── Title ────────────────────────────────────────────────────── */}
          <TitleInput
            value={titleValue}
            onChange={(e) => setLocalTitle(e.target.value)}
            onBlur={() => {
              if (localTitle !== null && localTitle.trim() && localTitle !== task.title) {
                update({ title: localTitle.trim() });
              }
              setLocalTitle(null);
            }}
          />

          {/* ── Fields ───────────────────────────────────────────────────── */}
          <FieldGrid>
            {/* Status */}
            <FieldLabel><LuClipboardList size={14} /> Статус</FieldLabel>
            <FieldControl>
              <Select
                value={task.status}
                onChange={(e) => update({ status: e.target.value as TaskopsTaskStatus })}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </Select>
            </FieldControl>

            {/* Subtasks Section */}
            <SubtasksSection parentTask={task} />

            {/* Dependencies Section */}
            <DependenciesSection task={task} />

            {/* Cycle / Sprint */}
            <FieldLabel><LuRefreshCw size={14} /> Спринт</FieldLabel>
            <FieldControl>
              <Select
                value={task.cycle_id || ''}
                onChange={(e) => update({ cycle_id: e.target.value || null } as any)}
              >
                <option value="">— вне спринтов —</option>
                {cycles.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.is_closed ? 'закрыт' : 'активен'})
                  </option>
                ))}
              </Select>
              {task.cycle_id && (
                <UnsetBtn title="Убрать из спринта" onClick={() => update({ cycle_id: null } as any)}>
                  <LuX size={14} />
                </UnsetBtn>
              )}
            </FieldControl>

            {/* Priority */}
            <FieldLabel><LuFlag size={14} /> Приоритет</FieldLabel>
            <FieldControl>
              <Select
                value={task.priority}
                onChange={(e) => update({ priority: e.target.value as TaskopsTaskPriority })}
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
                ))}
              </Select>
            </FieldControl>

            {/* Assignee */}
            <FieldLabel><LuUser size={14} /> Исполнитель</FieldLabel>
            <FieldControl>
              <Select
                value={task.assignee_id || ''}
                onChange={(e) => update({ assignee_id: e.target.value || null } as any)}
              >
                <option value="">— не назначен —</option>
                {assignableUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name} ({ROLE_LABELS[u.role] || u.role})
                  </option>
                ))}
              </Select>
              {task.assignee_id && (
                <UnsetBtn title="Снять исполнителя" onClick={() => update({ assignee_id: null } as any)}>
                  <LuX size={14} />
                </UnsetBtn>
              )}
            </FieldControl>

            {/* Due date */}
            <FieldLabel><LuCalendar size={14} /> Срок</FieldLabel>
            <FieldControl>
              <DateInput
                type="date"
                onClick={(e) => e.currentTarget.showPicker?.()}
                value={task.due_date ? task.due_date.slice(0, 10) : ''}
                onChange={(e) => update({ due_date: e.target.value || null } as any)}
              />
              {task.due_date && (
                <UnsetBtn title="Убрать срок" onClick={() => update({ due_date: null } as any)}>
                  <LuX size={14} />
                </UnsetBtn>
              )}
            </FieldControl>

            {/* Start date */}
            <FieldLabel><LuCalendarDays size={14} /> Начало</FieldLabel>
            <FieldControl>
              <DateInput
                type="date"
                onClick={(e) => e.currentTarget.showPicker?.()}
                value={task.start_date ? task.start_date.slice(0, 10) : ''}
                onChange={(e) => update({ start_date: e.target.value || null } as any)}
              />
              {task.start_date && (
                <UnsetBtn title="Убрать дату начала" onClick={() => update({ start_date: null } as any)}>
                  <LuX size={14} />
                </UnsetBtn>
              )}
            </FieldControl>

            {/* Estimate */}
            <FieldLabel><LuTimer size={14} /> Оценка</FieldLabel>
            <FieldControl>
              <EstimateInput
                placeholder="XS / S / M / L / XL или часы"
                value={estimateValue}
                onChange={(e) => setLocalEstimate(e.target.value)}
                onBlur={() => {
                  if (localEstimate !== null) {
                    update({ estimate: localEstimate.trim() || null } as any);
                  }
                  setLocalEstimate(null);
                }}
              />
              {task.estimate && (
                <UnsetBtn title="Убрать оценку" onClick={() => { update({ estimate: null } as any); setLocalEstimate(''); }}>
                  <LuX size={14} />
                </UnsetBtn>
              )}
            </FieldControl>

            {/* Reporter (read-only) */}
            {task.reporter_name && (
              <>
                <FieldLabel><LuCircleUser size={14} /> Автор</FieldLabel>
                <FieldControl>
                  <span style={{ fontSize: 13 }}>{task.reporter_name}</span>
                </FieldControl>
              </>
            )}

            {/* Location */}
            {task.location_name && (
              <>
                <FieldLabel><LuMapPin size={14} /> Объект</FieldLabel>
                <FieldControl>
                  <span style={{ fontSize: 13, flex: 1 }}>{task.location_name}</span>
                  {task.location_id && (
                    <MapContextBtn
                      title="Показать на карте"
                      onClick={() => navigate(`/map?location_id=${task.location_id}`)}
                    >
                      <LuMap size={14} />
                      На карту
                    </MapContextBtn>
                  )}
                </FieldControl>
              </>
            )}
          </FieldGrid>

          {/* ── Description ──────────────────────────────────────────────── */}
          <DescLabel>Описание</DescLabel>
          <DescTextarea
            placeholder="Добавьте описание задачи..."
            value={descValue}
            onChange={(e) => setLocalDesc(e.target.value)}
            onBlur={() => {
              if (localDesc !== null && localDesc !== (task.description || '')) {
                update({ description: localDesc.trim() || undefined });
              }
              setLocalDesc(null);
            }}
          />

          {/* ── Attachments ──────────────────────────────────────────────── */}
          <AttachmentsSection taskId={task.id} attachments={task.attachments || []} />

          {/* ── Comments ─────────────────────────────────────────────────── */}
          <CommentsSection>
            <SectionTitle>Комментарии ({comments.length})</SectionTitle>
            {comments.map((c) => (
              <CommentItem key={c.id}>
                <CommentAuthor>
                  {c.author_name || 'Пользователь'}
                  <CommentTime>
                    {new Date(c.created_at).toLocaleDateString('ru-RU', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                    })}
                  </CommentTime>
                </CommentAuthor>
                <CommentText>{renderWithMentions(c.content)}</CommentText>
              </CommentItem>
            ))}
            <CommentForm>
              <MentionTextarea
                placeholder="Написать комментарий... (@имя для упоминания)"
                value={commentText}
                onChange={setCommentText}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSendComment();
                }}
              />
              <SendBtn
                onClick={handleSendComment}
                disabled={!commentText.trim() || addComment.isPending}
              >
                Отправить
              </SendBtn>
            </CommentForm>
          </CommentsSection>
        </PanelBody>
      </Panel>
    </>
  );
}
