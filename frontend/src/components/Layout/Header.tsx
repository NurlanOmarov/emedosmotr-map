import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { authApi, telegramApi } from '@/services/api';
import { useAuthStore } from '@/features/auth/useAuthStore';
import { useNotificationStore } from '@/features/notifications/useNotificationStore';
import { useThemeStore } from '@/styles/useThemeStore';
import { useMapViewStore } from '@/features/map/useMapViewStore';

const Bar = styled(motion.header)`
  height: 56px;
  background: ${({ theme }) => theme.colors.glass};
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
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
  color: ${({ theme }) => theme.colors.textPrimary};
  letter-spacing: -0.01em;
  @media (max-width: 640px) {
    display: none;
  }
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
  color: ${({ theme }) => theme.colors.textSecondary};
  text-decoration: none;
  transition: all 150ms ease;
  white-space: nowrap;

  &:hover {
    color: ${({ theme }) => theme.colors.textPrimary};
    background: ${({ theme }) => theme.colors.bgHover};
  }

  &.active {
    color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) => theme.colors.primaryGlow};
    border: 1px solid ${({ theme }) => theme.colors.primaryGlow};
  }

  span:last-child {
    @media (max-width: 768px) {
      display: none;
    }
  }

  @media (max-width: 768px) {
    padding: 8px;
    font-size: 18px;
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
  background: ${({ theme }) => theme.colors.bgSecondary};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 10px;
  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: 13px;
  cursor: pointer;
  transition: all 150ms ease;
  &:hover { background: ${({ theme }) => theme.colors.bgHover}; border-color: ${({ theme }) => theme.colors.borderHover}; }
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
  color: ${({ theme }) => theme.colors.textMuted};
  padding: 2px 8px;
  border-radius: 9999px;
  background: ${({ theme }) => theme.colors.bgSecondary};
  border: 1px solid ${({ theme }) => theme.colors.border};
  @media (max-width: 1024px) {
    display: none;
  }
`;

const Dropdown = styled(motion.div)`
  position: absolute;
  top: 52px;
  right: 16px;
  width: 200px;
  background: ${({ theme }) => theme.colors.bgCard};
  backdrop-filter: blur(20px);
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  padding: 6px;
  z-index: 200;
  box-shadow: ${({ theme }) => theme.shadows.lg};
`;

const DropItem = styled(motion.button)`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.textSecondary};
  cursor: pointer;
  transition: all 150ms ease;
  &:hover { background: ${({ theme }) => theme.colors.bgHover}; color: ${({ theme }) => theme.colors.textPrimary}; }
  &.danger { color: ${({ theme }) => theme.colors.critical}; &:hover { background: ${({ theme }) => theme.colors.criticalBg}; } }
`;

const HeaderIconButton = styled(motion.button)`
  position: relative;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: ${({ theme }) => theme.colors.bgSecondary};
  border: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.textSecondary};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 150ms;
  font-size: 18px;

  &:hover {
    background: ${({ theme }) => theme.colors.bgHover};
    color: ${({ theme }) => theme.colors.textPrimary};
    border-color: ${({ theme }) => theme.colors.borderHover};
  }
`;

const NotificationButton = styled(HeaderIconButton)``;

const ThemeToggle = styled(HeaderIconButton)`
  font-size: 16px;
`;

const Badge = styled(motion.span)`
  position: absolute;
  top: -4px;
  right: -4px;
  background: ${({ theme }) => theme.colors.critical};
  color: white;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 5px;
  border-radius: 8px;
  border: 2px solid ${({ theme }) => theme.colors.bg};
  min-width: 18px;
  text-align: center;
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
  { to: '/map', icon: '/icons/map.png', label: 'Карта' },
  { to: '/dashboard', icon: '/icons/analytics.png', label: 'Аналитика', roles: ['superadmin', 'director', 'regional_manager', 'analyst'] },
  { to: '/tasks', icon: '/icons/tasks.png', label: 'Задачи' },
  { to: '/district-accounts', icon: '🔑', label: 'Учетки', roles: ['superadmin', 'director', 'regional_manager'] },
  { to: '/admin', icon: '⚙️', label: 'Управление', roles: ['superadmin'] },
];


const SearchButton = styled(motion.button)`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: ${({ theme }) => theme.colors.bgSecondary};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 12px;
  cursor: pointer;
  transition: all 150ms;
  white-space: nowrap;

  &:hover {
    background: ${({ theme }) => theme.colors.bgHover};
    color: ${({ theme }) => theme.colors.textSecondary};
    border-color: ${({ theme }) => theme.colors.borderHover};
  }

  @media (max-width: 640px) {
    padding: 6px 10px;
    gap: 4px;
  }
`;

const SearchKbd = styled.span`
  font-size: 10px;
  background: ${({ theme }) => theme.colors.bgHover};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 4px;
  padding: 1px 5px;
  @media (max-width: 640px) {
    display: none;
  }
`;

const NavIcon = styled.span`
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  
  img {
    width: 130%;
    height: 130%;
    object-fit: contain;
    mask-image: radial-gradient(circle, black 50%, transparent 90%);
    -webkit-mask-image: radial-gradient(circle, black 50%, transparent 90%);
  }
`;

export function Header() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  
  const { notifications, toggleDrawer } = useNotificationStore();
  const { themeMode, toggleTheme } = useThemeStore();
  const { selectedSettlementId } = useMapViewStore();
  const unreadCount = notifications.filter(n => !n.read).length;

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
        <NavIcon>
          <img src="/icons/map.png" alt="Map" />
        </NavIcon>
        <BrandName>eMap</BrandName>
      </Brand>

      <Nav>
        {visibleNav.map((item) => {
          const to = item.to === '/district-accounts' && selectedSettlementId
            ? `/district-accounts?settlement_id=${selectedSettlementId}`
            : item.to;
          return (
            <NavItem key={item.to} to={to}>
              <NavIcon>
                {item.icon.startsWith('/') ? (
                  <img src={item.icon} alt={item.label} />
                ) : (
                  item.icon
                )}
              </NavIcon>
              <span>{item.label}</span>
            </NavItem>
          );
        })}
      </Nav>

      <Right>
        {user && <RoleBadge>{ROLE_LABELS[user.role] || user.role}</RoleBadge>}

        <ThemeToggle
          onClick={() => toggleTheme()}
          whileTap={{ scale: 0.9 }}
          title={themeMode === 'light' ? 'Переключить на темную тему' : 'Переключить на светлую тему'}
        >
          <NavIcon>{themeMode === 'light' ? '🌙' : '☀️'}</NavIcon>
        </ThemeToggle>

        <SearchButton
          onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { ctrlKey: true, key: 'k', bubbles: true }))}
          whileTap={{ scale: 0.97 }}
        >
          <NavIcon>🔍</NavIcon>
          <span>Поиск</span>
          <SearchKbd>Ctrl+K</SearchKbd>
        </SearchButton>

        <NotificationButton
          onClick={toggleDrawer}
          whileTap={{ scale: 0.9 }}
        >
          <NavIcon>🔔</NavIcon>
          <AnimatePresence>
            {unreadCount > 0 && (
              <Badge
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
              >
                {unreadCount}
              </Badge>
            )}
          </AnimatePresence>
        </NotificationButton>

        <UserButton
          onClick={() => setShowMenu((v) => !v)}
          whileTap={{ scale: 0.97 }}
        >
          <Avatar>{initials}</Avatar>
          <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.full_name || user?.username}
          </span>
          <span style={{ fontSize: 10, color: 'currentColor', marginLeft: 2, opacity: 0.5 }}>▾</span>
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
                {!user?.telegram_chat_id && (
                  <DropItem onClick={async () => {
                    const { data } = await telegramApi.getBindCode();
                    const botUsername = "eMedosmotrBot"; // This should be in config
                    window.open(`https://t.me/${botUsername}?start=bind_${data.code}`, '_blank');
                    setShowMenu(false);
                  }}>
                    <span>🤖</span> Привязать Telegram
                  </DropItem>
                )}
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
