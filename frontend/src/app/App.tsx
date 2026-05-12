import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AnimatePresence } from 'framer-motion';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { GlobalStyles } from '@/styles/GlobalStyles';
import { darkTheme, lightTheme } from '@/styles/theme';
import { useThemeStore } from '@/styles/useThemeStore';
import { useAuthStore } from '@/features/auth/useAuthStore';
import { Header } from '@/components/Layout/Header';
import { LoginPage } from '@/pages/Login';
import { MapPage } from '@/pages/Map';
import { DashboardPage } from '@/pages/Dashboard';
import { TasksPage } from '@/pages/Tasks';
import { DistrictAccountsPage } from '@/pages/DistrictAccounts';
import { TaskOpsPage } from '@/pages/TaskOps';
import { SettingsPage } from '@/pages/Settings';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { UserList } from '@/pages/Admin/Users/UserList';
import { ToastContainer } from '@/features/notifications/ToastContainer';
import { NotificationDrawer } from '@/features/notifications/NotificationDrawer';
import { GlobalSearch } from '@/components/GlobalSearch';
import { wsService } from '@/services/websocket';
import { useEffect, useState } from 'react';

const qc = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

const AppShell = styled.div`
  display: flex;
  flex-direction: column;
  height: 100dvh;
  overflow: hidden;
`;

const PageWrapper = styled(motion.div)`
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && user && !roles.includes(user.role)) return <Navigate to="/map" replace />;
  return <>{children}</>;
}

function AnimatedRoutes() {
  const location = useLocation();
  const { isAuthenticated } = useAuthStore();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/map" replace /> : <LoginPage />}
        />
        <Route
          path="/map"
          element={
            <ProtectedRoute>
              <AppShell>
                <Header />
                <PageWrapper
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  style={{ display: 'flex', flexDirection: 'row', flex: 1, overflow: 'hidden' }}
                >
                  <MapPage />
                </PageWrapper>
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute roles={['admin', 'superadmin', 'director', 'regional_manager', 'analyst']}>
              <AppShell>
                <Header />
                <PageWrapper
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  <DashboardPage />
                </PageWrapper>
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/tasks"
          element={
            <ProtectedRoute>
              <AppShell>
                <Header />
                <PageWrapper
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  <TasksPage />
                </PageWrapper>
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute roles={['admin', 'superadmin']}>
              <AppShell>
                <Header />
                <PageWrapper
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  <UserList />
                </PageWrapper>
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/district-accounts"
          element={
            <ProtectedRoute roles={['admin', 'superadmin', 'director', 'regional_manager']}>
              <AppShell>
                <Header />
                <PageWrapper
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  <DistrictAccountsPage />
                </PageWrapper>
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/taskops"
          element={
            <ProtectedRoute>
              <AppShell>
                <Header />
                <PageWrapper
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  <TaskOpsPage />
                </PageWrapper>
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute roles={['admin', 'superadmin']}>
              <AppShell>
                <Header />
                <PageWrapper
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  <SettingsPage />
                </PageWrapper>
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route path="/admin" element={<Navigate to="/admin/users" replace />} />
        <Route path="/" element={<Navigate to="/map" replace />} />
        <Route path="*" element={<Navigate to="/map" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

export function App() {
  const { isAuthenticated } = useAuthStore();
  const { themeMode } = useThemeStore();
  const [searchOpen, setSearchOpen] = useState(false);

  const currentTheme = themeMode === 'light' ? lightTheme : darkTheme;

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (isAuthenticated) setSearchOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      wsService.connect('/ws/map');
      wsService.connect('/ws/tasks');
      wsService.connect('/ws/taskops');

      // Request push notification permission on first entry if supported
      if ('Notification' in window && Notification.permission === 'default') {
        // Delay a bit to not overwhelm the user immediately
        const timer = setTimeout(() => {
          Notification.requestPermission();
        }, 5000);
        return () => clearTimeout(timer);
      }
    } else {
      wsService.disconnectAll();
    }
  }, [isAuthenticated]);

  return (
    <QueryClientProvider client={qc}>
      <ThemeProvider theme={currentTheme}>
        <GlobalStyles />
        <AnimatedRoutes />
        <ToastContainer />
        <NotificationDrawer />
        <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
