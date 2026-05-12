import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { useProjects } from '../api';
import { useTaskopsStore } from '../store/useTaskopsStore';
import { useTaskopsWS } from '../hooks/useTaskopsWS';
import { InboxPage } from './InboxPage';
import { ProjectPage } from './ProjectPage';
import { DashboardPage } from './DashboardPage';
import { GoalsPage } from './GoalsPage';
import { AuditLogPage } from './AuditLogPage';
import { CommandPalette } from '../components/CommandPalette';

const Wrapper = styled.div`
  display: flex;
  height: 100%;
  overflow: hidden;
`;

const Sidebar = styled.nav`
  width: 220px;
  min-width: 220px;
  background: ${(p) => p.theme.colors.bgCard};
  border-right: 1px solid ${(p) => p.theme.colors.border};
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const SidebarTop = styled.div`
  padding: 10px 8px 6px;
  border-bottom: 1px solid ${(p) => p.theme.colors.border};
`;

const PaletteBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 7px 10px;
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: 7px;
  background: ${(p) => p.theme.colors.bgSecondary};
  color: ${(p) => p.theme.colors.textSecondary};
  font-size: 12px;
  cursor: pointer;
  transition: all 0.1s;
  &:hover {
    border-color: ${(p) => p.theme.colors.primary};
    color: ${(p) => p.theme.colors.textPrimary};
  }
`;

const PaletteKbd = styled.span`
  margin-left: auto;
  font-size: 10px;
  background: ${(p) => p.theme.colors.bgHover};
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: 4px;
  padding: 1px 5px;
`;

const SidebarSection = styled.div`
  padding: 10px 8px 4px;
`;

const SidebarLabel = styled.div`
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${(p) => p.theme.colors.textSecondary};
  padding: 0 8px;
  margin-bottom: 4px;
`;

const SidebarItem = styled.button<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 7px 8px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  text-align: left;
  background: ${(p) => (p.$active ? p.theme.colors.primaryGlow : 'transparent')};
  color: ${(p) => (p.$active ? p.theme.colors.primary : p.theme.colors.textPrimary)};
  transition: background 0.1s, color 0.1s;
  &:hover {
    background: ${(p) => p.theme.colors.bgHover};
    color: ${(p) => p.theme.colors.textPrimary};
  }
`;

const ProjectDot = styled.span<{ $color?: string }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${(p) => p.$color || p.theme.colors.primary};
  flex-shrink: 0;
`;

const ExternalTag = styled.span`
  font-size: 9px;
  background: rgba(245,158,11,0.15);
  color: #f59e0b;
  border-radius: 4px;
  padding: 1px 5px;
  margin-left: auto;
`;

const ProjectList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 0 8px 8px;
`;

const SidebarDivider = styled.div`
  height: 1px;
  background: ${(p) => p.theme.colors.border};
  margin: 4px 8px;
`;

const Content = styled.div`
  flex: 1;
  overflow: hidden;
`;

const PROJECT_COLORS = [
  '#6366f1', '#3b82f6', '#10b981', '#f59e0b',
  '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6',
];

type SpecialView = 'inbox' | 'dashboard' | 'goals' | 'audit';

export function TaskOpsLayout() {
  const { data: projects = [] } = useProjects();
  const { activeProjectId, setActiveProject } = useTaskopsStore();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [specialView, setSpecialView] = useState<SpecialView>('inbox');

  useTaskopsWS(null);

  const isInbox = !activeProjectId;

  const selectSpecial = (view: SpecialView) => {
    setActiveProject(null);
    setSpecialView(view);
  };

  // ⌘K / Ctrl+K opens command palette
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        // Only capture if we're on the taskops page (this layout is mounted)
        e.stopPropagation();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, []);

  return (
    <Wrapper>
      <Sidebar>
        <SidebarTop>
          <PaletteBtn onClick={() => setPaletteOpen(true)}>
            <span>🔍</span>
            Поиск и команды
            <PaletteKbd>⌘K</PaletteKbd>
          </PaletteBtn>
        </SidebarTop>

        <SidebarSection>
          <SidebarItem
            $active={isInbox && specialView === 'inbox'}
            onClick={() => selectSpecial('inbox')}
          >
            <span>📥</span>
            Мои задачи
          </SidebarItem>
          <SidebarItem
            $active={isInbox && specialView === 'dashboard'}
            onClick={() => selectSpecial('dashboard')}
          >
            <span>📊</span>
            Дашборд
          </SidebarItem>
          <SidebarItem
            $active={isInbox && specialView === 'goals'}
            onClick={() => selectSpecial('goals')}
          >
            <span>🎯</span>
            Цели
          </SidebarItem>
          <SidebarItem
            $active={isInbox && specialView === 'audit'}
            onClick={() => selectSpecial('audit')}
          >
            <span>🔍</span>
            Аудит-лог
          </SidebarItem>
        </SidebarSection>

        <SidebarDivider />

        <SidebarSection>
          <SidebarLabel>Проекты и поручения</SidebarLabel>
        </SidebarSection>

        <ProjectList>
          {projects.map((p, i) => (
            <SidebarItem
              key={p.id}
              $active={activeProjectId === p.id}
              onClick={() => { setActiveProject(p.id); setSpecialView('inbox'); }}
            >
              <ProjectDot $color={PROJECT_COLORS[i % PROJECT_COLORS.length]} />
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {p.name}
              </span>
              {p.is_external && <ExternalTag>внешний</ExternalTag>}
            </SidebarItem>
          ))}
          {projects.length === 0 && (
            <div style={{ padding: '8px 8px', fontSize: 12, color: '#9ca3af' }}>
              Нет проектов
            </div>
          )}
        </ProjectList>
      </Sidebar>

      <Content>
        {activeProjectId ? (
          <ProjectPage projectId={activeProjectId} />
        ) : specialView === 'dashboard' ? (
          <DashboardPage />
        ) : specialView === 'goals' ? (
          <GoalsPage />
        ) : specialView === 'audit' ? (
          <AuditLogPage />
        ) : (
          <InboxPage />
        )}
      </Content>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </Wrapper>
  );
}
