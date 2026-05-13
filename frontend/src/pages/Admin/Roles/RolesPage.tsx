import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import styled from 'styled-components';
import { AnimatePresence, motion } from 'framer-motion';
import { rolesApi } from '@/services/api';
import { Button } from '@/components/ui/Button';
import { RoleForm } from './RoleForm';
import type { Role, Feature } from '@/types';

// ─── Layout ──────────────────────────────────────────────────────────────────

const Container = styled.div`
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
  overflow-y: auto;
  height: 100%;
`;

const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 28px;
  gap: 16px;
  flex-wrap: wrap;
`;

const HeaderLeft = styled.div``;

const Title = styled.h1`
  font-size: 22px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.textPrimary};
  margin-bottom: 4px;
`;

const Subtitle = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.textMuted};
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
`;

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const Tabs = styled.div`
  display: flex;
  gap: 2px;
  background: ${({ theme }) => theme.colors.bgSecondary};
  border-radius: 10px;
  padding: 4px;
  margin-bottom: 24px;
  width: fit-content;
`;

const Tab = styled.button<{ $active: boolean }>`
  padding: 7px 18px;
  border-radius: 7px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  color: ${({ $active, theme }) => $active ? theme.colors.textPrimary : theme.colors.textMuted};
  background: ${({ $active, theme }) => $active ? theme.colors.bgCard : 'transparent'};
  border: ${({ $active, theme }) => $active ? `1px solid ${theme.colors.border}` : '1px solid transparent'};
`;

// ─── Roles List ───────────────────────────────────────────────────────────────

const RolesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
  margin-bottom: 24px;
`;

const RoleCard = styled(motion.div)<{ $selected: boolean; $color: string }>`
  background: ${({ theme }) => theme.colors.bgCard};
  border: 2px solid ${({ $selected, $color, theme }) => $selected ? $color : theme.colors.border};
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.15s;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 3px;
    background: ${({ $color }) => $color};
  }

  &:hover {
    border-color: ${({ $color }) => $color};
  }
`;

const RoleCardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
`;

const RoleName = styled.div`
  font-size: 15px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const RoleKey = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.textMuted};
  font-family: monospace;
  margin-top: 2px;
`;

const SystemBadge = styled.span`
  font-size: 10px;
  padding: 2px 7px;
  border-radius: 9999px;
  background: rgba(107, 114, 128, 0.15);
  color: ${({ theme }) => theme.colors.textMuted};
  font-weight: 600;
  flex-shrink: 0;
`;

const RoleDesc = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-bottom: 10px;
  line-height: 1.5;
  min-height: 36px;
`;

const PermCount = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textMuted};
  display: flex;
  align-items: center;
  gap: 6px;
`;

const PermDot = styled.span<{ $color: string }>`
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
`;

const CardActions = styled.div`
  display: flex;
  gap: 6px;
  margin-top: 12px;
`;

// ─── Permission Matrix ────────────────────────────────────────────────────────

const MatrixWrapper = styled.div`
  overflow: auto;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.colors.border};
`;

const MatrixTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  min-width: 700px;
`;

const MatrixTh = styled.th<{ $isFeature?: boolean }>`
  padding: ${({ $isFeature }) => $isFeature ? '10px 16px' : '12px 10px'};
  background: ${({ theme }) => theme.colors.bgSecondary};
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: ${({ $isFeature }) => $isFeature ? '12px' : '11px'};
  font-weight: 600;
  text-align: ${({ $isFeature }) => $isFeature ? 'left' : 'center'};
  white-space: nowrap;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  position: sticky;
  top: 0;
  z-index: 2;

  &:first-child {
    position: sticky;
    left: 0;
    z-index: 3;
    min-width: 240px;
  }
`;

const CategoryRow = styled.tr`
  background: ${({ theme }) => theme.colors.bgSecondary};
`;

const CategoryCell = styled.td`
  padding: 6px 16px;
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.06em;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`;

const MatrixTd = styled.td<{ $isFeature?: boolean }>`
  padding: ${({ $isFeature }) => $isFeature ? '9px 16px' : '9px 10px'};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  text-align: ${({ $isFeature }) => $isFeature ? 'left' : 'center'};
  font-size: 13px;
  color: ${({ theme }) => theme.colors.textPrimary};
  vertical-align: middle;

  &:first-child {
    position: sticky;
    left: 0;
    background: ${({ theme }) => theme.colors.bgCard};
    z-index: 1;
    border-right: 1px solid ${({ theme }) => theme.colors.border};
  }
`;

const MatrixCheck = styled.button<{ $checked: boolean; $color: string; $disabled: boolean }>`
  width: 26px;
  height: 26px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: ${({ $disabled }) => $disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.15s;
  font-size: 14px;
  border: 2px solid ${({ $checked, $color, theme }) => $checked ? $color : theme.colors.border};
  background: ${({ $checked, $color }) => $checked ? `${$color}22` : 'transparent'};
  opacity: ${({ $disabled }) => $disabled ? 0.5 : 1};

  &:hover:not(:disabled) {
    border-color: ${({ $color }) => $color};
    background: ${({ $color }) => `${$color}15`};
  }
`;

const RoleColHeader = styled.div<{ $color: string }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
`;

const RoleColName = styled.span`
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const RoleColDot = styled.span<{ $color: string }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  display: block;
`;

// ─── Saving indicator ─────────────────────────────────────────────────────────

const SavingBadge = styled(motion.div)`
  position: fixed;
  bottom: 24px;
  right: 24px;
  background: ${({ theme }) => theme.colors.bgCard};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 10px;
  padding: 10px 16px;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.textSecondary};
  z-index: 500;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 8px 16px rgba(0,0,0,0.2);
`;

// ─── Component ───────────────────────────────────────────────────────────────

type TabType = 'roles' | 'matrix';

export function RolesPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<TabType>('roles');
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editRole, setEditRole] = useState<Role | null>(null);
  const [savingRole, setSavingRole] = useState<string | null>(null);

  const { data: roles = [], isLoading: rolesLoading } = useQuery<Role[]>({
    queryKey: ['roles'],
    queryFn: () => rolesApi.list().then((r) => r.data),
  });

  const { data: features = [], isLoading: featuresLoading } = useQuery<Feature[]>({
    queryKey: ['features'],
    queryFn: () => rolesApi.listFeatures().then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => rolesApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['roles'] }); setFormOpen(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ name, data }: { name: string; data: any }) => rolesApi.update(name, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['roles'] });
      setSavingRole(null);
      setEditRole(null);
      if (selectedRole?.name === vars.name) {
        setSelectedRole(null);
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (name: string) => rolesApi.delete(name),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['roles'] }); setSelectedRole(null); },
  });

  const seedMutation = useMutation({
    mutationFn: () => rolesApi.seed(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roles'] }),
  });

  const featuresByCategory = useMemo(() => {
    const map: Record<string, Feature[]> = {};
    for (const f of features) {
      if (!map[f.category]) map[f.category] = [];
      map[f.category].push(f);
    }
    return map;
  }, [features]);

  const togglePermission = (role: Role, featureKey: string) => {
    const has = role.permissions.includes(featureKey);
    const newPerms = has
      ? role.permissions.filter((p) => p !== featureKey)
      : [...role.permissions, featureKey];

    setSavingRole(role.name);
    updateMutation.mutate({ name: role.name, data: { permissions: newPerms } });

    qc.setQueryData<Role[]>(['roles'], (prev) =>
      prev?.map((r) => r.name === role.name ? { ...r, permissions: newPerms } : r) ?? []
    );
  };

  const handleFormSubmit = (data: any) => {
    if (editRole) {
      updateMutation.mutate({ name: editRole.name, data });
    } else {
      createMutation.mutate(data);
    }
  };

  if (rolesLoading) return <Container>Загрузка...</Container>;

  return (
    <Container>
      <PageHeader>
        <HeaderLeft>
          <Title>Управление ролями</Title>
          <Subtitle>Создавайте роли и настраивайте доступные функции для каждой из них</Subtitle>
        </HeaderLeft>
        <HeaderActions>
          {roles.length === 0 && (
            <Button
              variant="ghost"
              onClick={() => seedMutation.mutate()}
              disabled={seedMutation.isPending}
            >
              {seedMutation.isPending ? 'Инициализация...' : '⚡ Создать системные роли'}
            </Button>
          )}
          <Button variant="primary" onClick={() => { setEditRole(null); setFormOpen(true); }}>
            + Новая роль
          </Button>
        </HeaderActions>
      </PageHeader>

      <Tabs>
        <Tab $active={tab === 'roles'} onClick={() => setTab('roles')}>Список ролей</Tab>
        <Tab $active={tab === 'matrix'} onClick={() => setTab('matrix')}>Матрица доступа</Tab>
      </Tabs>

      {/* ── Roles tab ── */}
      {tab === 'roles' && (
        <RolesGrid>
          {roles.map((role) => (
            <RoleCard
              key={role.name}
              $selected={selectedRole?.name === role.name}
              $color={role.color}
              onClick={() => setSelectedRole(role.name === selectedRole?.name ? null : role)}
              whileHover={{ y: -2 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              <RoleCardHeader>
                <div>
                  <RoleName>{role.display_name}</RoleName>
                  <RoleKey>{role.name}</RoleKey>
                </div>
                {role.is_system && <SystemBadge>Системная</SystemBadge>}
              </RoleCardHeader>
              <RoleDesc>{role.description || '—'}</RoleDesc>
              <PermCount>
                <PermDot $color={role.color} />
                {role.permissions.length} из {features.length} функций
              </PermCount>
              <CardActions>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); setEditRole(role); setFormOpen(true); }}
                >
                  Изменить
                </Button>
                {!role.is_system && (
                  <Button
                    variant="ghost"
                    size="sm"
                    style={{ color: '#EF4444' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Удалить роль «${role.display_name}»?`)) {
                        deleteMutation.mutate(role.name);
                      }
                    }}
                  >
                    Удалить
                  </Button>
                )}
              </CardActions>
            </RoleCard>
          ))}
        </RolesGrid>
      )}

      {/* ── Matrix tab ── */}
      {tab === 'matrix' && (
        <>
          {featuresLoading ? (
            <div style={{ color: 'var(--text-muted)', padding: '24px' }}>Загрузка функций...</div>
          ) : (
            <MatrixWrapper>
              <MatrixTable>
                <thead>
                  <tr>
                    <MatrixTh $isFeature>Функция</MatrixTh>
                    {roles.map((role) => (
                      <MatrixTh key={role.name}>
                        <RoleColHeader $color={role.color}>
                          <RoleColDot $color={role.color} />
                          <RoleColName>{role.display_name}</RoleColName>
                        </RoleColHeader>
                      </MatrixTh>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(featuresByCategory).map(([category, feats]) => (
                    <React.Fragment key={category}>
                      <CategoryRow>
                        <CategoryCell colSpan={roles.length + 1}>{category}</CategoryCell>
                      </CategoryRow>
                      {feats.map((feat) => (
                        <tr key={feat.key}>
                          <MatrixTd $isFeature>{feat.name}</MatrixTd>
                          {roles.map((role) => {
                            const checked = role.permissions.includes(feat.key);
                            const isSaving = savingRole === role.name && updateMutation.isPending;
                            return (
                              <MatrixTd key={role.name}>
                                <MatrixCheck
                                  $checked={checked}
                                  $color={role.color}
                                  $disabled={isSaving}
                                  onClick={() => !isSaving && togglePermission(role, feat.key)}
                                  title={checked ? 'Отключить' : 'Включить'}
                                >
                                  {checked ? '✓' : ''}
                                </MatrixCheck>
                              </MatrixTd>
                            );
                          })}
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </MatrixTable>
            </MatrixWrapper>
          )}
        </>
      )}

      {/* ── Forms / modals ── */}
      <AnimatePresence>
        {(formOpen) && (
          <RoleForm
            role={editRole || undefined}
            onClose={() => { setFormOpen(false); setEditRole(null); }}
            onSubmit={handleFormSubmit}
            isSubmitting={createMutation.isPending || updateMutation.isPending}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {savingRole && updateMutation.isPending && (
          <SavingBadge
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
          >
            <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span>
            Сохранение...
          </SavingBadge>
        )}
      </AnimatePresence>
    </Container>
  );
}
