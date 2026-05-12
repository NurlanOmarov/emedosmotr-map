import { useState } from 'react';
import styled from 'styled-components';
import { useTask, useUpdateTask, useTaskComments, useAddComment } from '../api';
import { StatusBadge } from './StatusBadge';
import { MentionTextarea } from './MentionTextarea';
import { STATUS_LABELS, PRIORITY_LABELS } from '../types';
import type { TaskopsTaskStatus, TaskopsTaskPriority } from '../types';

const Panel = styled.div`
  width: 440px;
  min-width: 440px;
  height: 100%;
  border-left: 1px solid ${(p) => p.theme.colors.border};
  background: ${(p) => p.theme.colors.bgCard};
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 12px;
  border-bottom: 1px solid ${(p) => p.theme.colors.border};
`;

const CloseBtn = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  color: ${(p) => p.theme.colors.textSecondary};
  font-size: 18px;
  padding: 4px;
  line-height: 1;
  &:hover { color: ${(p) => p.theme.colors.textPrimary}; }
`;

const PanelBody = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 20px;
`;

const Title = styled.h2`
  font-size: 16px;
  font-weight: 600;
  color: ${(p) => p.theme.colors.textPrimary};
  margin: 0 0 16px;
  line-height: 1.4;
`;

const FieldGrid = styled.div`
  display: grid;
  grid-template-columns: 100px 1fr;
  gap: 8px 16px;
  margin-bottom: 20px;
`;

const FieldLabel = styled.span`
  font-size: 12px;
  color: ${(p) => p.theme.colors.textSecondary};
  display: flex;
  align-items: center;
`;

const FieldValue = styled.span`
  font-size: 13px;
  color: ${(p) => p.theme.colors.textPrimary};
  display: flex;
  align-items: center;
`;

const Select = styled.select`
  font-size: 12px;
  background: ${(p) => p.theme.colors.bgSecondary};
  color: ${(p) => p.theme.colors.textPrimary};
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: 6px;
  padding: 4px 8px;
  cursor: pointer;
`;

const Description = styled.p`
  font-size: 13px;
  color: ${(p) => p.theme.colors.textSecondary};
  white-space: pre-wrap;
  margin: 0 0 24px;
  line-height: 1.6;
`;

const CommentsSection = styled.div`
  border-top: 1px solid ${(p) => p.theme.colors.border};
  padding-top: 16px;
`;

const SectionTitle = styled.div`
  font-size: 12px;
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

function renderWithMentions(text: string) {
  const parts = text.split(/(@[\w.]+)/g);
  return parts.map((part, i) =>
    /^@[\w.]+$/.test(part)
      ? <MentionSpan key={i}>{part}</MentionSpan>
      : <span key={i}>{part}</span>
  );
}

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

interface Props {
  taskId: string;
  onClose: () => void;
}

const STATUSES: TaskopsTaskStatus[] = ['backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled'];
const PRIORITIES: TaskopsTaskPriority[] = ['p0_urgent', 'p1_high', 'p2_medium', 'p3_low'];

export function TaskDetailPanel({ taskId, onClose }: Props) {
  const { data: task, isLoading } = useTask(taskId);
  const { data: comments = [] } = useTaskComments(taskId);
  const updateTask = useUpdateTask(taskId, task?.project_id);
  const addComment = useAddComment(taskId);
  const [commentText, setCommentText] = useState('');

  if (isLoading || !task) {
    return (
      <Panel>
        <PanelHeader>
          <span />
          <CloseBtn onClick={onClose}>×</CloseBtn>
        </PanelHeader>
        <PanelBody>
          <div style={{ color: '#9ca3af', fontSize: 13 }}>Загрузка...</div>
        </PanelBody>
      </Panel>
    );
  }

  const handleStatusChange = (status: TaskopsTaskStatus) => {
    updateTask.mutate({ status });
  };

  const handlePriorityChange = (priority: TaskopsTaskPriority) => {
    updateTask.mutate({ priority });
  };

  const handleSendComment = () => {
    const text = commentText.trim();
    if (!text) return;
    addComment.mutate(text, { onSuccess: () => setCommentText('') });
  };

  return (
    <Panel>
      <PanelHeader>
        <StatusBadge status={task.status} />
        <CloseBtn onClick={onClose}>×</CloseBtn>
      </PanelHeader>

      <PanelBody>
        <Title>{task.title}</Title>

        <FieldGrid>
          <FieldLabel>Статус</FieldLabel>
          <FieldValue>
            <Select
              value={task.status}
              onChange={(e) => handleStatusChange(e.target.value as TaskopsTaskStatus)}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </Select>
          </FieldValue>

          <FieldLabel>Приоритет</FieldLabel>
          <FieldValue>
            <Select
              value={task.priority}
              onChange={(e) => handlePriorityChange(e.target.value as TaskopsTaskPriority)}
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
              ))}
            </Select>
          </FieldValue>

          {task.assignee_name && (
            <>
              <FieldLabel>Исполнитель</FieldLabel>
              <FieldValue>{task.assignee_name}</FieldValue>
            </>
          )}

          {task.reporter_name && (
            <>
              <FieldLabel>Автор</FieldLabel>
              <FieldValue>{task.reporter_name}</FieldValue>
            </>
          )}

          {task.due_date && (
            <>
              <FieldLabel>Срок</FieldLabel>
              <FieldValue>
                {new Date(task.due_date).toLocaleDateString('ru-RU', {
                  day: 'numeric', month: 'long', year: 'numeric',
                })}
              </FieldValue>
            </>
          )}

          {task.estimate && (
            <>
              <FieldLabel>Оценка</FieldLabel>
              <FieldValue>{task.estimate}</FieldValue>
            </>
          )}

          {task.location_name && (
            <>
              <FieldLabel>Объект</FieldLabel>
              <FieldValue>{task.location_name}</FieldValue>
            </>
          )}
        </FieldGrid>

        {task.description && (
          <Description>{task.description}</Description>
        )}

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
  );
}
