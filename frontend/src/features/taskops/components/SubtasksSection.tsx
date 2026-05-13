import { useState } from 'react';
import styled from 'styled-components';
import { LuCheck, LuUser } from 'react-icons/lu';
import { useSubtasks, useCreateTask, useUpdateTask } from '../api';
import { TaskopsTask, TaskopsTaskStatus } from '../types';

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

const SubtaskList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const SubtaskRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
  border-radius: 6px;
  background: ${(p) => p.theme.colors.bgSecondary};
  border: 1px solid ${(p) => p.theme.colors.border};
  transition: all 0.2s;
  &:hover {
    border-color: ${(p) => p.theme.colors.primary};
  }
`;

const Checkbox = styled.div<{ $checked: boolean }>`
  width: 16px;
  height: 16px;
  border-radius: 4px;
  border: 2px solid ${(p) => p.$checked ? p.theme.colors.ready : p.theme.colors.textSecondary};
  background: ${(p) => p.$checked ? p.theme.colors.ready : 'transparent'};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  &::after {
    display: none;
  }
`;

const SubtaskTitle = styled.span<{ $done: boolean }>`
  flex: 1;
  font-size: 13px;
  color: ${(p) => p.$done ? p.theme.colors.textSecondary : p.theme.colors.textPrimary};
  text-decoration: ${(p) => p.$done ? 'line-through' : 'none'};
`;

const NewSubtaskInput = styled.input`
  width: 100%;
  padding: 8px 12px;
  font-size: 13px;
  background: ${(p) => p.theme.colors.bgSecondary};
  border: 1px dashed ${(p) => p.theme.colors.border};
  border-radius: 6px;
  color: ${(p) => p.theme.colors.textPrimary};
  outline: none;
  margin-top: 8px;
  &:focus {
    border-style: solid;
    border-color: ${(p) => p.theme.colors.primary};
  }
`;

interface Props {
  parentTask: TaskopsTask;
}

export function SubtasksSection({ parentTask }: Props) {
  const { data: subtasks = [] } = useSubtasks(parentTask.id);
  const createTask = useCreateTask(parentTask.project_id);
  const [newTitle, setNewTitle] = useState('');

  const handleAdd = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newTitle.trim()) {
      await createTask.mutateAsync({
        title: newTitle.trim(),
        parent_task_id: parentTask.id,
        status: 'todo' as TaskopsTaskStatus,
      });
      setNewTitle('');
    }
  };

  return (
    <Container>
      <Header>
        <Title>Подзадачи ({parentTask.completed_subtask_count || 0}/{parentTask.subtask_count || 0})</Title>
      </Header>
      
      <SubtaskList>
        {subtasks.map((st) => (
          <SubtaskItem key={st.id} subtask={st} />
        ))}
      </SubtaskList>

      <NewSubtaskInput 
        placeholder="+ Добавить подзадачу..." 
        value={newTitle}
        onChange={(e) => setNewTitle(e.target.value)}
        onKeyDown={handleAdd}
        disabled={createTask.isPending}
      />
    </Container>
  );
}

function SubtaskItem({ subtask }: { subtask: TaskopsTask }) {
  const update = useUpdateTask(subtask.id);
  
  const handleToggle = () => {
    const nextStatus: TaskopsTaskStatus = subtask.status === 'done' ? 'todo' : 'done';
    update.mutate({ status: nextStatus });
  };

  return (
    <SubtaskRow>
      <Checkbox $checked={subtask.status === 'done'} onClick={handleToggle}>
        {subtask.status === 'done' && <LuCheck size={10} color="white" />}
      </Checkbox>
      <SubtaskTitle $done={subtask.status === 'done'}>
        {subtask.title}
      </SubtaskTitle>
      {subtask.assignee_name && (
        <span style={{ fontSize: 10, opacity: 0.6, display: 'flex', alignItems: 'center', gap: 3 }}>
          <LuUser size={10} /> {subtask.assignee_name}
        </span>
      )}
    </SubtaskRow>
  );
}
