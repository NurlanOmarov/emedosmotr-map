import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import styled from 'styled-components';
import { usersApi, geoApi } from '@/services/api';
import { Button } from '@/components/ui/Button';
import { User, Region } from '@/types';
import { AnimatePresence } from 'framer-motion';
import { UserForm } from './UserForm';

const Container = styled.div`
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
`;

const Title = styled.h1`
  font-size: 24px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  background: ${({ theme }) => theme.colors.bgCard};
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
`;

const Th = styled.th`
  text-align: left;
  padding: 16px;
  background: ${({ theme }) => theme.colors.bgSecondary};
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const Td = styled.td`
  padding: 16px;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: 14px;
`;

const RoleBadge = styled.span<{ $role: string }>`
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  background: ${({ $role }) => {
    switch ($role) {
      case 'superadmin': return 'rgba(239, 68, 68, 0.1)';
      case 'director': return 'rgba(139, 92, 246, 0.1)';
      case 'regional_manager': return 'rgba(59, 130, 246, 0.1)';
      case 'engineer': return 'rgba(16, 185, 129, 0.1)';
      default: return 'rgba(107, 114, 128, 0.1)';
    }
  }};
  color: ${({ $role }) => {
    switch ($role) {
      case 'superadmin': return '#EF4444';
      case 'director': return '#8B5CF6';
      case 'regional_manager': return '#3B82F6';
      case 'engineer': return '#10B981';
      default: return '#6B7280';
    }
  }};
`;

const Actions = styled.div`
  display: flex;
  gap: 8px;
`;

export function UserList() {
  const queryClient = useQueryClient();
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const { data: users, isLoading, isError: isUsersError } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list().then(res => res.data?.items || []),
  });

  const { data: regions, isError: isRegionsError } = useQuery({
    queryKey: ['regions'],
    queryFn: () => geoApi.getRegions().then(res => res.data || []),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => usersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsFormOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => usersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setEditingUser(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => usersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const handleEdit = (user: User) => {
    setEditingUser(user);
  };

  const handleCreate = () => {
    setIsFormOpen(true);
  };

  const handleSubmit = (data: any) => {
    if (editingUser) {
      updateMutation.mutate({ id: editingUser.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const getRegionName = (id: number | null) => {
    if (!id) return 'Все регионы';
    return regions?.find((r: Region) => r.region_id === id)?.name || 'Неизвестно';
  };

  if (isLoading) return <Container>Загрузка...</Container>;
  if (isUsersError || isRegionsError) return <Container>Ошибка загрузки данных. Пожалуйста, попробуйте перезайти в систему.</Container>;

  return (
    <Container>
      <Header>
        <Title>Управление пользователями</Title>
        <Button onClick={handleCreate}>Добавить пользователя</Button>
      </Header>

      <Table>
        <thead>
          <tr>
            <Th>ФИО / Логин</Th>
            <Th>Email</Th>
            <Th>Роль</Th>
            <Th>Регион</Th>
            <Th>Статус</Th>
            <Th>Действия</Th>
          </tr>
        </thead>
        <tbody>
          {users?.map((user: User) => (
            <tr key={user.id}>
              <Td>
                <div style={{ fontWeight: 600 }}>{user.full_name || '—'}</div>
                <div style={{ fontSize: 12, color: '#64748B' }}>{user.username}</div>
              </Td>
              <Td>{user.email}</Td>
              <Td>
                <RoleBadge $role={user.role}>{user.role}</RoleBadge>
              </Td>
              <Td>{getRegionName(user.region_id)}</Td>
              <Td>
                {user.is_active ? (
                  <span style={{ color: '#10B981' }}>Активен</span>
                ) : (
                  <span style={{ color: '#EF4444' }}>Заблокирован</span>
                )}
              </Td>
              <Td>
                <Actions>
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(user)}>Ред.</Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    style={{ color: '#EF4444' }}
                    onClick={() => {
                      if (confirm('Удалить пользователя?')) {
                        deleteMutation.mutate(user.id);
                      }
                    }}
                  >
                    Удалить
                  </Button>
                </Actions>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>

      <AnimatePresence>
        {(isFormOpen || editingUser) && (
          <UserForm
            user={editingUser || undefined}
            onClose={() => {
              setIsFormOpen(false);
              setEditingUser(null);
            }}
            onSubmit={handleSubmit}
            isSubmitting={createMutation.isPending || updateMutation.isPending}
          />
        )}
      </AnimatePresence>
    </Container>
  );
}
