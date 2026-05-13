import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type TaskView = 'list' | 'board' | 'timeline' | 'calendar';

interface TaskopsUIState {
  activeProjectId: string | null;
  activeTaskId: string | null;
  activeView: TaskView;
  sidePanelOpen: boolean;
  quickCreateOpen: boolean;
  setActiveProject: (id: string | null) => void;
  setActiveTask: (id: string | null) => void;
  setView: (view: TaskView) => void;
  openSidePanel: (taskId: string) => void;
  closeSidePanel: () => void;
  setQuickCreateOpen: (open: boolean) => void;
}

export const useTaskopsStore = create<TaskopsUIState>()(
  persist(
    (set) => ({
      activeProjectId: null,
      activeTaskId: null,
      activeView: 'list',
      sidePanelOpen: false,
      quickCreateOpen: false,

      setActiveProject: (id) => set({ activeProjectId: id, activeTaskId: null, sidePanelOpen: false }),
      setActiveTask: (id) => set({ activeTaskId: id }),
      setView: (view) => set({ activeView: view }),
      openSidePanel: (taskId) => set({ activeTaskId: taskId, sidePanelOpen: true }),
      closeSidePanel: () => set({ sidePanelOpen: false, activeTaskId: null }),
      setQuickCreateOpen: (open) => set({ quickCreateOpen: open }),
    }),
    {
      name: 'taskops-ui',
      partialize: (s) => ({ activeProjectId: s.activeProjectId, activeView: s.activeView }),
    }
  )
);
