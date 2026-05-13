import { useState } from 'react';
import { motion } from 'framer-motion';
import styled from 'styled-components';
import { Button } from '@/components/ui/Button';
import { useEscapeKey } from '@/hooks/useKeyboardShortcuts';
import type { Role } from '@/types';

const Overlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
`;

const FormContainer = styled(motion.div)`
  background: ${({ theme }) => theme.colors.bgCard};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 16px;
  width: 100%;
  max-width: 480px;
  padding: 24px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);
`;

const Title = styled.h2`
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 20px;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const FormGroup = styled.div`
  margin-bottom: 16px;
`;

const Label = styled.label`
  display: block;
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 6px;
  color: ${({ theme }) => theme.colors.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.04em;
`;

const Input = styled.input`
  width: 100%;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: 14px;
  transition: all 0.2s;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
    background: rgba(255, 255, 255, 0.08);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Textarea = styled.textarea`
  width: 100%;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: 14px;
  resize: vertical;
  min-height: 72px;
  font-family: inherit;
  box-sizing: border-box;
  transition: all 0.2s;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
    background: rgba(255, 255, 255, 0.08);
  }
`;

const ColorRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const ColorSwatch = styled.div<{ $color: string }>`
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: ${({ $color }) => $color};
  border: 2px solid rgba(255, 255, 255, 0.15);
  flex-shrink: 0;
`;

const PRESET_COLORS = [
  '#EF4444', '#F59E0B', '#10B981', '#3B82F6',
  '#8B5CF6', '#06B6D4', '#EC4899', '#6B7280',
  '#F97316', '#84CC16',
];

const ColorPresets = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 8px;
`;

const ColorPreset = styled.button<{ $color: string; $active: boolean }>`
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: ${({ $color }) => $color};
  border: 2px solid ${({ $active }) => ($active ? 'white' : 'transparent')};
  cursor: pointer;
  transition: transform 0.15s;
  &:hover { transform: scale(1.2); }
`;

const Hint = styled.p`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.textMuted};
  margin-top: 4px;
`;

const ButtonGroup = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
`;

interface RoleFormData {
  name: string;
  display_name: string;
  description: string;
  color: string;
}

interface Props {
  role?: Role;
  onClose: () => void;
  onSubmit: (data: RoleFormData) => void;
  isSubmitting: boolean;
}

export function RoleForm({ role, onClose, onSubmit, isSubmitting }: Props) {
  useEscapeKey(onClose);
  const [form, setForm] = useState<RoleFormData>({
    name: role?.name ?? '',
    display_name: role?.display_name ?? '',
    description: role?.description ?? '',
    color: role?.color ?? '#6B7280',
  });

  const isEdit = !!role;

  const handleChange = (field: keyof RoleFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <Overlay
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <FormContainer
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        <Title>{isEdit ? 'Редактировать роль' : 'Новая роль'}</Title>
        <form onSubmit={handleSubmit}>
          <FormGroup>
            <Label>Системный ключ</Label>
            <Input
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
              placeholder="my_role"
              disabled={isEdit}
              required
            />
            <Hint>Только латиница, цифры и _ . Нельзя изменить после создания.</Hint>
          </FormGroup>

          <FormGroup>
            <Label>Отображаемое название</Label>
            <Input
              value={form.display_name}
              onChange={(e) => handleChange('display_name', e.target.value)}
              placeholder="Моя роль"
              required
            />
          </FormGroup>

          <FormGroup>
            <Label>Описание</Label>
            <Textarea
              value={form.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Краткое описание прав и назначения роли"
            />
          </FormGroup>

          <FormGroup>
            <Label>Цвет</Label>
            <ColorRow>
              <ColorSwatch $color={form.color} />
              <Input
                value={form.color}
                onChange={(e) => handleChange('color', e.target.value)}
                placeholder="#6B7280"
                style={{ fontFamily: 'monospace' }}
              />
            </ColorRow>
            <ColorPresets>
              {PRESET_COLORS.map((c) => (
                <ColorPreset
                  key={c}
                  type="button"
                  $color={c}
                  $active={form.color === c}
                  onClick={() => handleChange('color', c)}
                />
              ))}
            </ColorPresets>
          </FormGroup>

          <ButtonGroup>
            <Button variant="ghost" type="button" onClick={onClose}>Отмена</Button>
            <Button variant="primary" type="submit" disabled={isSubmitting || !form.name || !form.display_name}>
              {isEdit ? 'Сохранить' : 'Создать'}
            </Button>
          </ButtonGroup>
        </form>
      </FormContainer>
    </Overlay>
  );
}
