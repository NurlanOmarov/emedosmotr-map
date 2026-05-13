import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import styled from 'styled-components';
import { useQuery } from '@tanstack/react-query';
import { geoApi, rolesApi } from '@/services/api';
import { Button } from '@/components/ui/Button';
import { User, Region, Role } from '@/types';
import { motion } from 'framer-motion';
import { useEscapeKey } from '@/hooks/useKeyboardShortcuts';

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
  max-width: 500px;
  padding: 24px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
`;

const FormTitle = styled.h2`
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 20px;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const FormGroup = styled.div`
  margin-bottom: 16px;
`;

const Label = styled.label`
  display: block;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 6px;
  color: ${({ theme }) => theme.colors.textSecondary};
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
`;

const Select = styled.select`
  width: 100%;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: 14px;

  option {
    background: #1e293b;
  }
`;

const ErrorMsg = styled.span`
  font-size: 12px;
  color: #ef4444;
  margin-top: 4px;
  display: block;
`;

const RoleDot = styled.span<{ $color: string }>`
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  margin-right: 6px;
  vertical-align: middle;
`;

const SelectedRoleInfo = styled.div`
  margin-top: 6px;
  padding: 8px 10px;
  border-radius: 7px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid ${({ theme }) => theme.colors.border};
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textMuted};
`;

const LocationTypeToggle = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
`;

const LocationTypeBtn = styled.button<{ $active: boolean }>`
  padding: 10px 12px;
  border-radius: 8px;
  border: 2px solid ${({ $active, theme }) => $active ? theme.colors.primary : theme.colors.border};
  background: ${({ $active, theme }) => $active ? theme.colors.primaryGlow : 'rgba(255,255,255,0.03)'};
  color: ${({ $active, theme }) => $active ? theme.colors.primary : theme.colors.textSecondary};
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  text-align: left;
  display: flex;
  align-items: center;
  gap: 8px;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const LocationTypeIcon = styled.span`
  font-size: 16px;
  flex-shrink: 0;
`;

const LocationTypeLabel = styled.div`
  line-height: 1.3;
`;

const LocationTypeSub = styled.div`
  font-size: 10px;
  font-weight: 400;
  opacity: 0.7;
  margin-top: 1px;
`;

const ButtonGroup = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
`;

const schema = z.object({
  username: z.string().min(3, 'Минимум 3 символа'),
  email: z.string().email('Неверный формат email'),
  password: z.string().min(8, 'Минимум 8 символов').optional().or(z.literal('')),
  full_name: z.string().min(1, 'Обязательное поле'),
  role: z.string().min(1, 'Выберите роль'),
  region_id: z.coerce.number().nullable().optional(),
  is_active: z.boolean().default(true),
});

type FormData = z.infer<typeof schema>;

interface Props {
  user?: User;
  onClose: () => void;
  onSubmit: (data: FormData) => void;
  isSubmitting: boolean;
}

export function UserForm({ user, onClose, onSubmit, isSubmitting }: Props) {
  useEscapeKey(onClose);
  const initialLocationType = user
    ? (user.region_id ? 'region' : 'aup')
    : 'region';
  const [locationType, setLocationType] = useState<'region' | 'aup'>(initialLocationType);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: user ? {
      username: user.username,
      email: user.email,
      full_name: user.full_name || '',
      role: user.role,
      region_id: user.region_id,
      is_active: user.is_active,
    } : {
      role: 'engineer',
      is_active: true,
    },
  });

  const { data: regions } = useQuery({
    queryKey: ['regions'],
    queryFn: () => geoApi.getRegions().then(res => res.data),
  });

  const { data: roles = [] } = useQuery<Role[]>({
    queryKey: ['roles'],
    queryFn: () => rolesApi.list().then(res => res.data),
  });

  const selectedRoleName = watch('role');
  const selectedRole = roles.find((r) => r.name === selectedRoleName);

  const handleLocationTypeChange = (type: 'region' | 'aup') => {
    setLocationType(type);
    if (type === 'aup') {
      setValue('region_id', null);
    }
  };

  return (
    <Overlay
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <FormContainer
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
      >
        <FormTitle>{user ? 'Редактировать пользователя' : 'Новый пользователь'}</FormTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <FormGroup>
            <Label>Логин</Label>
            <Input {...register('username')} placeholder="ivanov" disabled={!!user} />
            {errors.username && <ErrorMsg>{errors.username.message}</ErrorMsg>}
          </FormGroup>

          {!user && (
            <FormGroup>
              <Label>Пароль</Label>
              <Input type="password" {...register('password')} placeholder="••••••••" />
              {errors.password && <ErrorMsg>{errors.password.message}</ErrorMsg>}
            </FormGroup>
          )}

          <FormGroup>
            <Label>Email</Label>
            <Input {...register('email')} placeholder="ivanov@example.com" />
            {errors.email && <ErrorMsg>{errors.email.message}</ErrorMsg>}
          </FormGroup>

          <FormGroup>
            <Label>ФИО</Label>
            <Input {...register('full_name')} placeholder="Иванов Иван Иванович" />
            {errors.full_name && <ErrorMsg>{errors.full_name.message}</ErrorMsg>}
          </FormGroup>

          <FormGroup>
            <Label>Роль</Label>
            <Select {...register('role')}>
              {roles.length === 0 && (
                <option value="">Загрузка ролей...</option>
              )}
              {roles.map((role) => (
                <option key={role.name} value={role.name}>
                  {role.display_name}
                </option>
              ))}
            </Select>
            {errors.role && <ErrorMsg>{errors.role.message}</ErrorMsg>}
            {selectedRole && (
              <SelectedRoleInfo>
                <RoleDot $color={selectedRole.color} />
                {selectedRole.description || selectedRole.display_name}
                {' · '}
                {selectedRole.permissions.length} функций
              </SelectedRoleInfo>
            )}
          </FormGroup>

          <FormGroup>
            <Label>Место работы</Label>
            <LocationTypeToggle>
              <LocationTypeBtn
                type="button"
                $active={locationType === 'region'}
                onClick={() => handleLocationTypeChange('region')}
              >
                <LocationTypeIcon>🗺️</LocationTypeIcon>
                <LocationTypeLabel>
                  Регион
                  <LocationTypeSub>Привязан к региону</LocationTypeSub>
                </LocationTypeLabel>
              </LocationTypeBtn>
              <LocationTypeBtn
                type="button"
                $active={locationType === 'aup'}
                onClick={() => handleLocationTypeChange('aup')}
              >
                <LocationTypeIcon>🏢</LocationTypeIcon>
                <LocationTypeLabel>
                  АУП
                  <LocationTypeSub>Центральный офис</LocationTypeSub>
                </LocationTypeLabel>
              </LocationTypeBtn>
            </LocationTypeToggle>
          </FormGroup>

          {locationType === 'region' && (
            <FormGroup>
              <Label>Регион</Label>
              <Select {...register('region_id')}>
                <option value="">Выберите регион</option>
                {regions?.map((r: Region) => (
                  <option key={r.region_id} value={r.region_id}>{r.name}</option>
                ))}
              </Select>
            </FormGroup>
          )}

          <FormGroup style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input type="checkbox" {...register('is_active')} id="is_active" />
            <Label htmlFor="is_active" style={{ marginBottom: 0 }}>Активен</Label>
          </FormGroup>

          <ButtonGroup>
            <Button variant="ghost" onClick={onClose} type="button">Отмена</Button>
            <Button variant="primary" type="submit" disabled={isSubmitting}>
              {user ? 'Сохранить' : 'Создать'}
            </Button>
          </ButtonGroup>
        </form>
      </FormContainer>
    </Overlay>
  );
}
