import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AnimatePresence } from 'framer-motion';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { GlobalStyles } from '@/styles/GlobalStyles';
import { theme } from '@/styles/theme';
import { useAuthStore } from '@/features/auth/useAuthStore';
import { Header } from '@/components/Layout/Header';
import { LoginPage } from '@/pages/Login';
import { MapPage } from '@/pages/Map';
import { DashboardPage } from '@/pages/Dashboard';
import { TasksPage } from '@/pages/Tasks';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { UserList } from '@/pages/Admin/Users/UserList';

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
            <ProtectedRoute roles={['superadmin', 'director', 'regional_manager', 'analyst']}>
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
            <ProtectedRoute roles={['superadmin']}>
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
        <Route path="/admin" element={<Navigate to="/admin/users" replace />} />
        <Route path="/" element={<Navigate to="/map" replace />} />
        <Route path="*" element={<Navigate to="/map" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

export function App() {
  return (
    <QueryClientProvider client={qc}>
      <ThemeProvider theme={theme}>
        <GlobalStyles />
        <AnimatedRoutes />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
