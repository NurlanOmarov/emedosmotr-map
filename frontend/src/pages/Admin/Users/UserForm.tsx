import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import styled from 'styled-components';
import { useQuery } from '@tanstack/react-query';
import { geoApi } from '@/services/api';
import { Button } from '@/components/ui/Button';
import { User, UserRole, Region } from '@/types';
import { motion } from 'framer-motion';

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
  background: ${({ theme }) => theme.colors.background.card};
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

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary.main};
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
  role: z.string(),
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
  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
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

  const selectedRole = watch('role');

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
              <option value="superadmin">Суперадмин</option>
              <option value="director">Директор</option>
              <option value="regional_manager">Региональный менеджер</option>
              <option value="engineer">Инженер</option>
              <option value="analyst">Аналитик</option>
              <option value="operator">Оператор</option>
            </Select>
          </FormGroup>

          {selectedRole === 'regional_manager' && (
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
