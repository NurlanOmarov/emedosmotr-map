import styled from 'styled-components';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/features/auth/useAuthStore';
import { useMapViewStore } from '@/features/map/useMapViewStore';
import { LuMap, LuLayoutDashboard, LuClipboardList, LuBriefcase } from 'react-icons/lu';

const Container = styled(motion.nav)`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 64px;
  background: ${({ theme }) => theme.colors.glass};
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: 0 10px calc(8px + env(safe-area-inset-bottom, 0px));
  z-index: 1000;
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.05);
  height: calc(64px + env(safe-area-inset-bottom, 0px));

  @media (min-width: 768px) {
    display: none;
  }
`;

const NavItem = styled(NavLink)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  text-decoration: none;
  color: ${({ theme }) => theme.colors.textSecondary};
  transition: all 0.2s ease;
  flex: 1;
  padding: 8px 0;

  &.active {
    color: ${({ theme }) => theme.colors.primary};
    
    svg {
      filter: drop-shadow(0 0 8px ${({ theme }) => theme.colors.primary}40);
    }
  }

  span:first-child {
    font-size: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    
    svg {
      width: 100%;
      height: 100%;
      stroke-width: 2;
    }
  }

  span:last-child {
    font-size: 10px;
    font-weight: 600;
  }
`;

const NAV_ITEMS = [
  { to: '/map', icon: LuMap, label: 'Карта' },
  { to: '/dashboard', icon: LuLayoutDashboard, label: 'Аналитика', roles: ['admin', 'superadmin', 'director', 'regional_manager', 'analyst'] },
  { to: '/tasks', icon: LuClipboardList, label: 'Задачи' },
  { to: '/taskops', icon: LuBriefcase, label: 'Проекты' },
];

export function BottomNav() {
  const { user } = useAuthStore();
  useMapViewStore();

  if (!user) return null;

  const visibleNav = NAV_ITEMS.filter((item) =>
    !item.roles || (user?.role && item.roles.includes(user.role))
  );

  return (
    <Container
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
    >
      {visibleNav.map((item) => {
        const Icon = item.icon;
        return (
          <NavItem key={item.to} to={item.to}>
            <span>
              <Icon />
            </span>
            <span>{item.label}</span>
          </NavItem>
        );
      })}
    </Container>
  );
}
