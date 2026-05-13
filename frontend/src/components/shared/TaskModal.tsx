import { useState } from 'react';
import styled from 'styled-components';
import { useQuery } from '@tanstack/react-query';
import { usersApi } from '@/services/api';
import { Button } from '@/components/ui/Button';

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 20px;
`;

const ModalContent = styled.div<{ padding?: string }>`
  background: ${({ theme }) => theme.colors.bgCard};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 16px;
  width: 100%;
  max-width: 460px;
  padding: ${props => props.padding || '20px'};
  box-shadow: ${({ theme }) => theme.shadows.lg};
`;

const FormLabel = styled.div`
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 6px;
  margin-top: 12px;
`;

const FormInput = styled.input`
  width: 100%;
  background: ${({ theme }) => theme.colors.bgSecondary};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  padding: 8px 12px;
  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: 13px;
  &:focus { outline: none; border-color: ${({ theme }) => theme.colors.primary}; }
`;

const FormSelect = styled.select`
  width: 100%;
  background: ${({ theme }) => theme.colors.bgSecondary};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  padding: 8px 12px;
  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: 13px;
  &:focus { outline: none; border-color: ${({ theme }) => theme.colors.primary}; }
  option { background: ${({ theme }) => theme.colors.bgCard}; }
`;

const FieldTextarea = styled.textarea`
  width: 100%;
  background: ${({ theme }) => theme.colors.bgSecondary};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  padding: 8px 12px;
  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: 13px;
  min-height: 80px;
  resize: vertical;
  &:focus { outline: none; border-color: ${({ theme }) => theme.colors.primary}; }
`;

export function TaskModal({ 
  locationId, 
  regionId, 
  settlementId,
  task, 
  onClose, 
  onSave 
}: { 
  locationId?: string | null, 
  regionId?: number | null, 
  settlementId?: number | null,
  task?: any,
  onClose: () => void, 
  onSave: (data: any) => void 
}) {
  const [form, setForm] = useState(task ? {
    ...task,
    assigned_to: task.assigned_to || '',
    due_date: task.due_date || '',
    estimated_hours: task.estimated_hours || ''
  } : {
    location_id: locationId || null,
    region_id: regionId || null,
    settlement_id: settlementId || null,
    title: '',
    description: '',
    type: 'equipment_setup',
    priority: 'normal',
    assigned_to: '',
    due_date: '',
    estimated_hours: ''
  });

  const { data: engineers } = useQuery({
    queryKey: ['engineers'],
    queryFn: () => usersApi.listEngineers().then(r => r.data as any[]),
  });

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={e => e.stopPropagation()} padding="24px">
        <form onSubmit={(e) => { e.preventDefault(); onSave(form); }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'inherit', marginBottom: 20 }}>
            {task ? 'Редактировать задачу' : 'Новая задача'}
          </div>
          
          <FormLabel>Заголовок</FormLabel>
          <FormInput value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Напр: Настроить ЭКГ" />
          
          <FormLabel>Описание</FormLabel>
          <FieldTextarea 
            value={form.description} 
            onChange={e => setForm({...form, description: e.target.value})} 
            placeholder="Детали задачи..."
            style={{ marginBottom: 16 }}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <FormLabel>Тип</FormLabel>
              <FormSelect value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                <option value="equipment_setup">Настройка оборуд.</option>
                <option value="internet_setup">Интернет</option>
                <option value="training">Обучение</option>
                <option value="inspection">Осмотр</option>
                <option value="other">Другое</option>
              </FormSelect>
            </div>
            <div>
              <FormLabel>Приоритет</FormLabel>
              <FormSelect value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}>
                <option value="low">Низкий</option>
                <option value="normal">Средний</option>
                <option value="high">Высокий</option>
                <option value="critical">Критичный</option>
              </FormSelect>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <FormLabel>Исполнитель</FormLabel>
              <FormSelect value={form.assigned_to} onChange={e => setForm({...form, assigned_to: e.target.value})}>
                <option value="">Не назначен</option>
                {engineers?.map(eng => (
                  <option key={eng.id} value={eng.id}>{eng.full_name}</option>
                ))}
              </FormSelect>
            </div>
            <div>
              <FormLabel>Срок</FormLabel>
              <FormInput type="date" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} />
            </div>
          </div>

          <div>
            <FormLabel>Оценка (часов)</FormLabel>
            <FormInput 
              type="number" 
              step="0.5" 
              value={form.estimated_hours} 
              onChange={e => setForm({...form, estimated_hours: e.target.value})} 
              placeholder="Напр: 2.5"
            />
          </div>

          {task && (
            <div>
              <FormLabel>Статус</FormLabel>
              <FormSelect value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                <option value="new">Новая</option>
                <option value="assigned">Назначена</option>
                <option value="in_progress">В работе</option>
                <option value="waiting">Ожидание</option>
                <option value="done">Выполнена</option>
                <option value="cancelled">Отменена</option>
              </FormSelect>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            <Button variant="ghost" style={{ flex: 1 }} type="button" onClick={onClose}>Отмена</Button>
            <Button variant="primary" style={{ flex: 1 }} type="submit">
              {task ? 'Сохранить' : 'Создать'}
            </Button>
          </div>
        </form>
      </ModalContent>
    </ModalOverlay>
  );
}
