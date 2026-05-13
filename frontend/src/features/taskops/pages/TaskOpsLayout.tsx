import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { 
  LuSearch, 
  LuClipboardPen, 
  LuInbox, 
  LuSend, 
  LuLayoutDashboard, 
  LuTarget, 
  LuActivity, 
  LuFileText, 
  LuFlag, 
  LuTrash2, 
  LuMenu, 
  LuX,
  LuPlus,
  LuUser,
  LuCalendar
} from 'react-icons/lu';
import { useProjects, useGetOrCreateOrdersProject, useCreateTask, useAssignableUsers, useDeleteProject, ORDERS_PROJECT_NAME } from '../api';
import { useConfirm } from '@/components/shared/ConfirmDialog';
import { useTaskopsStore } from '../store/useTaskopsStore';
import { useTaskopsWS } from '../hooks/useTaskopsWS';
import { InboxPage } from './InboxPage';
import { ProjectPage } from './ProjectPage';
import { DashboardPage } from './DashboardPage';
import { GoalsPage } from './GoalsPage';
import { AuditLogPage } from './AuditLogPage';
import { NotesPage } from './NotesPage';
import { AssignedPage } from './AssignedPage';
import { CommandPalette } from '../components/CommandPalette';
import { useSearchParams } from 'react-router-dom';
import { MAP_INCIDENTS_PROJECT_NAME } from '../api';

const Wrapper = styled.div`
  display: flex;
  height: 100%;
  overflow: hidden;
`;

const Sidebar = styled.nav<{ $open?: boolean }>`
  width: 220px;
  min-width: 220px;
  background: ${(p) => p.theme.colors.bgCard};
  border-right: 1px solid ${(p) => p.theme.colors.border};
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: transform 0.2s ease;

  @media (max-width: 768px) {
    position: fixed;
    inset: 0 0 0 0;
    z-index: 1000;
    width: 100%;
    transform: ${(p) => p.$open ? 'translateX(0)' : 'translateX(-100%)'};
  }
`;

const MobileHeader = styled.div`
  display: none;
  @media (max-width: 768px) {
    display: flex;
    align-items: center;
    padding: 10px 16px;
    background: ${(p) => p.theme.colors.bgCard};
    border-bottom: 1px solid ${(p) => p.theme.colors.border};
  }
`;

const Hamburger = styled.button`
  background: none;
  border: none;
  color: ${(p) => p.theme.colors.textPrimary};
  font-size: 24px;
  padding: 0;
  cursor: pointer;
  margin-right: 12px;
`;

const SidebarTop = styled.div`
  padding: 10px 8px 6px;
  border-bottom: 1px solid ${(p) => p.theme.colors.border};
  display: flex;
  flex-direction: column;
  gap: 6px;
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
  transition: border-color 0.1s, color 0.1s;
  &:focus-visible {
    outline: 2px solid #f59e0b;
    outline-offset: 2px;
  }
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

const AssignBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 7px 10px;
  border: 1px dashed ${(p) => p.theme.colors.border};
  border-radius: 7px;
  background: transparent;
  color: ${(p) => p.theme.colors.textSecondary};
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s, background 0.15s;
  &:focus-visible { outline: 2px solid #f59e0b; outline-offset: 2px; }
  &:hover {
    border-color: #f59e0b;
    color: #f59e0b;
    background: rgba(245,158,11,0.06);
  }
`;

// ─── Quick Assignment Modal ───────────────────────────────────────────────────
const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.55);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 12vh;
  z-index: 500;
`;

const Modal = styled.div`
  width: 520px;
  background: ${(p) => p.theme.colors.bgCard};
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: 14px;
  box-shadow: ${(p) => p.theme.shadows.lg};
  overflow: hidden;
`;

const ModalHeader = styled.div`
  padding: 16px 20px 12px;
  border-bottom: 1px solid ${(p) => p.theme.colors.border};
`;

const ModalTitle = styled.h3`
  margin: 0 0 2px;
  font-size: 15px;
  font-weight: 600;
  color: ${(p) => p.theme.colors.textPrimary};
`;

const ModalSubtitle = styled.p`
  margin: 0;
  font-size: 12px;
  color: ${(p) => p.theme.colors.textSecondary};
`;

const ModalBody = styled.div`
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const FieldLabel = styled.label`
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${(p) => p.theme.colors.textSecondary};
  display: block;
  margin-bottom: 4px;
`;

const ModalInput = styled.input`
  width: 100%;
  background: ${(p) => p.theme.colors.bgSecondary};
  color: ${(p) => p.theme.colors.textPrimary};
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: 8px;
  padding: 9px 12px;
  font-size: 14px;
  box-sizing: border-box;
  &:focus { outline: none; border-color: #f59e0b; }
  &::placeholder { color: ${(p) => p.theme.colors.textSecondary}; }
`;

const ModalTextarea = styled.textarea`
  width: 100%;
  background: ${(p) => p.theme.colors.bgSecondary};
  color: ${(p) => p.theme.colors.textPrimary};
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: 8px;
  padding: 9px 12px;
  font-size: 13px;
  min-height: 72px;
  resize: vertical;
  font-family: inherit;
  box-sizing: border-box;
  &:focus { outline: none; border-color: #f59e0b; }
  &::placeholder { color: ${(p) => p.theme.colors.textSecondary}; }
`;

const PriorityRow = styled.div`
  display: flex;
  gap: 6px;
`;

const PriorityBtn = styled.button<{ $active?: boolean; $color: string }>`
  flex: 1;
  padding: 6px 0;
  border-radius: 6px;
  border: 1px solid ${(p) => (p.$active ? p.$color : p.theme.colors.border)};
  background: ${(p) => (p.$active ? `${p.$color}22` : 'transparent')};
  color: ${(p) => (p.$active ? p.$color : p.theme.colors.textSecondary)};
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.1s, background 0.1s, color 0.1s;
  &:hover { border-color: ${(p) => p.$color}; color: ${(p) => p.$color}; }
`;

const ModalFooter = styled.div`
  padding: 12px 20px;
  border-top: 1px solid ${(p) => p.theme.colors.border};
  display: flex;
  justify-content: flex-end;
  gap: 8px;
`;

const CancelBtn = styled.button`
  background: none;
  border: 1px solid ${(p) => p.theme.colors.border};
  color: ${(p) => p.theme.colors.textPrimary};
  border-radius: 8px;
  padding: 7px 16px;
  font-size: 13px;
  cursor: pointer;
`;

const SubmitBtn = styled.button`
  background: #f59e0b;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 7px 18px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  &:disabled { opacity: 0.5; cursor: not-allowed; }
  &:hover:not(:disabled) { background: #d97706; }
`;

// ─────────────────────────────────────────────────────────────────────────────

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

const ProjectItem = styled.div`
  position: relative;
  display: flex;
  align-items: center;

  &:hover > button[data-delete] {
    opacity: 1;
  }
`;

const DeleteProjectBtn = styled.button`
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  width: 22px;
  height: 22px;
  border-radius: 5px;
  background: none;
  border: none;
  color: ${(p) => p.theme.colors.textSecondary};
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: all 0.15s;
  flex-shrink: 0;
  z-index: 1;
  &:hover {
    background: ${(p) => p.theme.colors.criticalBg};
    color: ${(p) => p.theme.colors.critical};
  }
  &:focus-visible {
    outline: 2px solid ${(p) => p.theme.colors.critical};
    opacity: 1;
  }
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

const PRIORITIES = [
  { value: 'p0_urgent', label: 'Срочно', color: '#ef4444' },
  { value: 'p1_high', label: 'Высокий', color: '#f97316' },
  { value: 'p2_medium', label: 'Средний', color: '#eab308' },
  { value: 'p3_low', label: 'Низкий', color: '#6b7280' },
];

type SpecialView = 'inbox' | 'assigned' | 'dashboard' | 'goals' | 'audit' | 'notes';

export function TaskOpsLayout() {
  const { data: projects = [] } = useProjects();
  const { activeProjectId, setActiveProject, quickCreateOpen, setQuickCreateOpen } = useTaskopsStore();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [specialView, setSpecialView] = useState<SpecialView>((searchParams.get('view') as SpecialView) || 'inbox');

  const [assignTitle, setAssignTitle] = useState('');
  const [assignDesc, setAssignDesc] = useState('');
  const [assignPriority, setAssignPriority] = useState('p2_medium');
  const [assignAssignee, setAssignAssignee] = useState('');
  const [assignDueDate, setAssignDueDate] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [projectSearch, setProjectSearch] = useState('');
  const titleRef = useRef<HTMLInputElement>(null);

  const { data: assignableUsers = [] } = useAssignableUsers();

  const getOrCreateOrders = useGetOrCreateOrdersProject();
  const [ordersProjectId, setOrdersProjectId] = useState<string | null>(null);
  const createTask = useCreateTask(ordersProjectId ?? '');
  const deleteProject = useDeleteProject();
  const confirm = useConfirm();

  useEffect(() => {
    const found = projects.find((p) => p.name === ORDERS_PROJECT_NAME);
    if (found) setOrdersProjectId(found.id);
  }, [projects]);

  useTaskopsWS(null);

  const isInbox = !activeProjectId;

  // Sync store with URL on mount
  useEffect(() => {
    const pId = searchParams.get('project');
    const v = searchParams.get('view') as SpecialView;
    if (pId) {
      setActiveProject(pId);
    } else if (v) {
      setSpecialView(v);
      setActiveProject(null);
    }
  }, []);

  const selectSpecial = (view: SpecialView) => {
    setActiveProject(null);
    setSpecialView(view);
    setSearchParams({ view });
    setSidebarOpen(false);
  };

  const handleProjectSelect = (id: string) => {
    setActiveProject(id);
    setSpecialView('inbox');
    setSearchParams({ project: id });
    setSidebarOpen(false);
  };

  const handleDeleteProject = async (e: React.MouseEvent, projectId: string, projectName: string) => {
    e.stopPropagation();
    const ok = await confirm({
      title: 'Удалить проект?',
      message: `«${projectName}» и все его задачи будут удалены безвозвратно.`,
      confirmLabel: 'Удалить',
      variant: 'danger',
    });
    if (!ok) return;
    deleteProject.mutate(projectId, {
      onSuccess: () => {
        if (activeProjectId === projectId) setActiveProject(null);
      },
    });
  };

  const openAssignModal = () => {
    setAssignTitle('');
    setAssignDesc('');
    setAssignPriority('p2_medium');
    setAssignAssignee('');
    setAssignDueDate('');
    setQuickCreateOpen(true);
    setTimeout(() => titleRef.current?.focus(), 80);
  };

  const handleSubmitAssignment = async () => {
    if (!assignTitle.trim()) return;
    let projectId = ordersProjectId;
    if (!projectId) {
      const project = await getOrCreateOrders.mutateAsync();
      projectId = project.id;
      setOrdersProjectId(project.id);
    }
    createTask.mutate(
      {
        title: assignTitle.trim(),
        description: assignDesc.trim() || undefined,
        priority: assignPriority,
        assignee_id: assignAssignee || undefined,
        due_date: assignDueDate || undefined,
      } as any,
      {
        onSuccess: () => {
          setQuickCreateOpen(false);
          handleProjectSelect(projectId!);
          // If task ID is needed in URL in future, can add here
        },
      }
    );
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.stopPropagation();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, []);

  const ordersProject = projects.find((p) => p.name === ORDERS_PROJECT_NAME);
  const incidentsProject = projects.find((p) => p.name === MAP_INCIDENTS_PROJECT_NAME);
  const regularProjects = projects.filter((p) => 
    p.name !== ORDERS_PROJECT_NAME && p.name !== MAP_INCIDENTS_PROJECT_NAME
  );

  const filteredProjects = regularProjects.filter(p => 
    p.name.toLowerCase().includes(projectSearch.toLowerCase())
  );

  return (
    <Wrapper>
      <Sidebar $open={sidebarOpen}>
        <MobileHeader>
          <Hamburger onClick={() => setSidebarOpen(false)}><LuX /></Hamburger>
          <span style={{ fontWeight: 600 }}>Меню</span>
        </MobileHeader>
        <SidebarTop>
          <PaletteBtn onClick={() => setPaletteOpen(true)}>
            <LuSearch size={14} />
            Поиск и команды
            <PaletteKbd>⌘K</PaletteKbd>
          </PaletteBtn>
          <AssignBtn id="btn-give-assignment" onClick={openAssignModal}>
            <LuClipboardPen size={14} />
            Дать поручение
          </AssignBtn>
        </SidebarTop>

        <SidebarSection>
          <SidebarItem
            $active={isInbox && specialView === 'inbox'}
            onClick={() => selectSpecial('inbox')}
          >
            <LuInbox size={14} />
            Мои задачи
          </SidebarItem>
          <SidebarItem
            $active={isInbox && specialView === 'assigned'}
            onClick={() => selectSpecial('assigned')}
          >
            <LuSend size={14} />
            Я поручил
          </SidebarItem>
          <SidebarItem
            $active={isInbox && specialView === 'dashboard'}
            onClick={() => selectSpecial('dashboard')}
          >
            <LuLayoutDashboard size={14} />
            Дашборд
          </SidebarItem>
          <SidebarItem
            $active={isInbox && specialView === 'goals'}
            onClick={() => selectSpecial('goals')}
          >
            <LuTarget size={14} />
            Цели
          </SidebarItem>
          <SidebarItem
            $active={isInbox && specialView === 'audit'}
            onClick={() => selectSpecial('audit')}
          >
            <LuActivity size={14} />
            Аудит-лог
          </SidebarItem>
          <SidebarItem
            $active={isInbox && specialView === 'notes'}
            onClick={() => selectSpecial('notes')}
          >
            <LuFileText size={14} />
            Мои заметки
          </SidebarItem>
        </SidebarSection>

        <SidebarDivider />

        {ordersProject && (
          <div style={{ padding: '4px 8px 0' }}>
            <SidebarItem
              $active={activeProjectId === ordersProject.id}
              onClick={() => handleProjectSelect(ordersProject.id)}
              style={{ color: activeProjectId === ordersProject.id ? undefined : '#f59e0b' }}
            >
              <LuClipboardPen size={14} />
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Поручения
              </span>
            </SidebarItem>
          </div>
        )}

        {incidentsProject && (
          <div style={{ padding: '4px 8px 0' }}>
            <SidebarItem
              $active={activeProjectId === incidentsProject.id}
              onClick={() => handleProjectSelect(incidentsProject.id)}
              style={{ color: activeProjectId === incidentsProject.id ? undefined : '#ef4444' }}
            >
              <LuFlag size={14} />
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Инциденты с карты
              </span>
            </SidebarItem>
            {(regularProjects.length > 0) && <SidebarDivider style={{ margin: '6px 0' }} />}
          </div>
        )}

        <SidebarSection style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <SidebarLabel>Проекты и поручения</SidebarLabel>
          <button
            onClick={() => setPaletteOpen(true)}
            style={{
              background: 'none', border: 'none', color: '#9ca3af',
              cursor: 'pointer', fontSize: '14px', padding: '0 8px',
              display: 'flex', alignItems: 'center',
            }}
            title="Создать проект"
          >
            <LuPlus />
          </button>
        </SidebarSection>

        {regularProjects.length > 10 && (
          <div style={{ padding: '0 8px 8px' }}>
            <ModalInput 
              placeholder="Поиск проектов..."
              value={projectSearch}
              onChange={(e) => setProjectSearch(e.target.value)}
              style={{ padding: '6px 10px', fontSize: '12px' }}
            />
          </div>
        )}

        <ProjectList>
          {filteredProjects.map((p, i) => (
            <ProjectItem key={p.id}>
              <SidebarItem
                $active={activeProjectId === p.id}
                onClick={() => handleProjectSelect(p.id)}
                style={{ paddingRight: 28 }}
              >
                <ProjectDot $color={PROJECT_COLORS[i % PROJECT_COLORS.length]} />
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.name}
                </span>
                {p.is_external && <ExternalTag>внешний</ExternalTag>}
              </SidebarItem>
              <DeleteProjectBtn
                data-delete
                title={`Удалить «${p.name}»`}
                onClick={(e) => handleDeleteProject(e, p.id, p.name)}
                disabled={deleteProject.isPending}
              >
                <LuTrash2 size={12} />
              </DeleteProjectBtn>
            </ProjectItem>
          ))}
          {regularProjects.length === 0 && !ordersProject && (
            <div style={{ padding: '8px 8px', fontSize: 12, color: '#9ca3af' }}>
              Нет проектов
            </div>
          )}
        </ProjectList>
      </Sidebar>

      <Content>
        <MobileHeader>
          <Hamburger onClick={() => setSidebarOpen(true)}><LuMenu /></Hamburger>
          <span style={{ fontWeight: 600 }}>
            {activeProjectId ? projects.find(p => p.id === activeProjectId)?.name : 
             specialView === 'assigned' ? 'Я поручил' :
             specialView === 'dashboard' ? 'Дашборд' :
             specialView === 'goals' ? 'Цели' :
             specialView === 'audit' ? 'Аудит' :
             specialView === 'notes' ? 'Мои заметки' : 'Мои задачи'}
          </span>
        </MobileHeader>
        {activeProjectId ? (
          <ProjectPage projectId={activeProjectId} />
        ) : specialView === 'assigned' ? (
          <AssignedPage />
        ) : specialView === 'dashboard' ? (
          <DashboardPage />
        ) : specialView === 'goals' ? (
          <GoalsPage />
        ) : specialView === 'audit' ? (
          <AuditLogPage />
        ) : specialView === 'notes' ? (
          <NotesPage />
        ) : (
          <InboxPage />
        )}
      </Content>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />

      {quickCreateOpen && (
        <Overlay onClick={(e) => e.target === e.currentTarget && setQuickCreateOpen(false)}>
          <Modal>
            <ModalHeader>
              <ModalTitle><LuClipboardPen style={{ verticalAlign: 'middle', marginRight: 8 }} /> Дать поручение</ModalTitle>
              <ModalSubtitle>
                Задача будет создана в разделе «Поручения» — без привязки к проекту
              </ModalSubtitle>
            </ModalHeader>
            <ModalBody>
              <div>
                <FieldLabel>Суть поручения *</FieldLabel>
                <ModalInput
                  ref={titleRef}
                  placeholder="Например: Проверить отчёт по Акмолинской области"
                  value={assignTitle}
                  onChange={(e) => setAssignTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) handleSubmitAssignment();
                    if (e.key === 'Escape') setQuickCreateOpen(false);
                  }}
                />
              </div>
              <div>
                <FieldLabel>Подробности (необязательно)</FieldLabel>
                <ModalTextarea
                  placeholder="Дополнительный контекст, ссылки, требования..."
                  value={assignDesc}
                  onChange={(e) => setAssignDesc(e.target.value)}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <FieldLabel><LuUser size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Исполнитель</FieldLabel>
                  <select
                    value={assignAssignee}
                    onChange={(e) => setAssignAssignee(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      fontSize: 13,
                      borderRadius: 8,
                      border: '1px solid var(--border, #e5e7eb)',
                      background: 'var(--bg-secondary, #f9fafb)',
                      color: 'var(--text-primary, #111)',
                      boxSizing: 'border-box' as const,
                    }}
                  >
                    <option value="">— не назначен —</option>
                    {assignableUsers.map((u) => (
                      <option key={u.id} value={u.id}>{u.full_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <FieldLabel><LuCalendar size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Срок выполнения</FieldLabel>
                  <input
                    type="date"
                    onClick={(e) => e.currentTarget.showPicker?.()}
                    value={assignDueDate}
                    onChange={(e) => setAssignDueDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      fontSize: 13,
                      borderRadius: 8,
                      border: '1px solid var(--border, #e5e7eb)',
                      background: 'var(--bg-secondary, #f9fafb)',
                      color: 'var(--text-primary, #111)',
                      boxSizing: 'border-box' as const,
                    }}
                  />
                </div>
              </div>
              <div>
                <FieldLabel>Срочность</FieldLabel>
                <PriorityRow>
                  {PRIORITIES.map((pr) => (
                    <PriorityBtn
                      key={pr.value}
                      $active={assignPriority === pr.value}
                      $color={pr.color}
                      onClick={() => setAssignPriority(pr.value)}
                    >
                      {pr.label}
                    </PriorityBtn>
                  ))}
                </PriorityRow>
              </div>
            </ModalBody>
            <ModalFooter>
              <CancelBtn onClick={() => setQuickCreateOpen(false)}>Отмена</CancelBtn>
              <SubmitBtn
                onClick={handleSubmitAssignment}
                disabled={!assignTitle.trim() || createTask.isPending || getOrCreateOrders.isPending}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                {createTask.isPending || getOrCreateOrders.isPending ? 'Создание...' : <><LuSend size={14} /> Дать поручение</>}
              </SubmitBtn>
            </ModalFooter>
          </Modal>
        </Overlay>
      )}
    </Wrapper>
  );
}
