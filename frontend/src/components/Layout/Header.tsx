import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { authApi } from '@/services/api';
import { useAuthStore } from '@/features/auth/useAuthStore';

const Bar = styled(motion.header)`
  height: 56px;
  background: rgba(10, 18, 40, 0.9);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255,255,255,0.06);
  display: flex;
  align-items: center;
  padding: 0 20px;
  gap: 8px;
  flex-shrink: 0;
  position: relative;
  z-index: 100;

  &::after {
    content: '';
    position: absolute;
    bottom: 0; left: 0; right: 0; height: 1px;
    background: linear-gradient(90deg, transparent, rgba(59,130,246,0.3), transparent);
  }
`;

const Brand = styled(NavLink)`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-right: 16px;
  text-decoration: none;
`;

const BrandIcon = styled.div`
  width: 34px;
  height: 34px;
  background: linear-gradient(135deg, #1E3A5F, #2563EB);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  border: 1px solid rgba(59,130,246,0.3);
  box-shadow: 0 0 16px rgba(37,99,235,0.3);
`;

const BrandName = styled.span`
  font-weight: 700;
  font-size: 14px;
  color: #F1F5F9;
  letter-spacing: -0.01em;
`;

const Nav = styled.nav`
  display: flex;
  align-items: center;
  gap: 2px;
  flex: 1;
`;

const NavItem = styled(NavLink)`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #64748B;
  text-decoration: none;
  transition: all 150ms ease;
  white-space: nowrap;

  &:hover {
    color: #F1F5F9;
    background: rgba(255,255,255,0.06);
  }

  &.active {
    color: #60A5FA;
    background: rgba(59,130,246,0.1);
    border: 1px solid rgba(59,130,246,0.15);
  }
`;

const Right = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: auto;
`;

const UserButton = styled(motion.button)`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px 6px 6px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px;
  color: #F1F5F9;
  font-size: 13px;
  cursor: pointer;
  transition: all 150ms ease;
  &:hover { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.14); }
`;

const Avatar = styled.div`
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: linear-gradient(135deg, #3B82F6, #8B5CF6);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: white;
  flex-shrink: 0;
`;

const RoleBadge = styled.span`
  font-size: 10px;
  color: #64748B;
  padding: 2px 8px;
  border-radius: 9999px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.08);
`;

const Dropdown = styled(motion.div)`
  position: absolute;
  top: 52px;
  right: 16px;
  width: 200px;
  background: rgba(15, 23, 42, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  padding: 6px;
  z-index: 200;
  box-shadow: 0 16px 40px rgba(0,0,0,0.5);
`;

const DropItem = styled(motion.button)`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 13px;
  color: #94A3B8;
  cursor: pointer;
  transition: all 150ms ease;
  &:hover { background: rgba(255,255,255,0.06); color: #F1F5F9; }
  &.danger { color: #EF4444; &:hover { background: rgba(239,68,68,0.1); } }
`;

const ROLE_LABELS: Record<string, string> = {
  superadmin: 'Суперадмин',
  director: 'Директор',
  regional_manager: 'Рег. менеджер',
  engineer: 'Инженер',
  operator: 'Оператор',
  analyst: 'Аналитик',
};

const NAV_ITEMS = [
  { to: '/map', icon: '🗺️', label: 'Карта' },
  { to: '/dashboard', icon: '📊', label: 'Аналитика', roles: ['superadmin', 'director', 'regional_manager', 'analyst'] },
  { to: '/tasks', icon: '✅', label: 'Задачи' },
  { to: '/admin', icon: '⚙️', label: 'Управление', roles: ['superadmin'] },
];

export function Header() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);

  const initials = user?.full_name
    ? user.full_name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : user?.username?.slice(0, 2).toUpperCase() || '?';

  const handleLogout = async () => {
    try { await authApi.logout(); } catch {}
    logout();
    navigate('/login');
  };

  const visibleNav = NAV_ITEMS.filter((item) =>
    !item.roles || (user?.role && item.roles.includes(user.role))
  );

  return (
    <Bar
      initial={{ y: -56 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <Brand to="/map">
        <BrandIcon>🗺️</BrandIcon>
        <BrandName>eMap</BrandName>
      </Brand>

      <Nav>
        {visibleNav.map((item) => (
          <NavItem key={item.to} to={item.to}>
            <span>{item.icon}</span>
            {item.label}
          </NavItem>
        ))}
      </Nav>

      <Right>
        {user && <RoleBadge>{ROLE_LABELS[user.role] || user.role}</RoleBadge>}

        <UserButton
          onClick={() => setShowMenu((v) => !v)}
          whileTap={{ scale: 0.97 }}
        >
          <Avatar>{initials}</Avatar>
          <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.full_name || user?.username}
          </span>
          <span style={{ fontSize: 10, color: '#475569', marginLeft: 2 }}>▾</span>
        </UserButton>

        <AnimatePresence>
          {showMenu && (
            <>
              <motion.div
                style={{ position: 'fixed', inset: 0, zIndex: 150 }}
                onClick={() => setShowMenu(false)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
              <Dropdown
                initial={{ opacity: 0, scale: 0.95, y: -8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -8 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              >
                <DropItem className="danger" onClick={handleLogout}>
                  <span>🚪</span> Выйти
                </DropItem>
              </Dropdown>
            </>
          )}
        </AnimatePresence>
      </Right>
    </Bar>
  );
}
