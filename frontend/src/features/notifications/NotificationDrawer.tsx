import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled, { useTheme } from 'styled-components';
import { useNotificationStore } from './useNotificationStore';
import { usePushSubscription } from '@/hooks/usePushSubscription';
import { useAuthStore } from '@/features/auth/useAuthStore';
import { useEscapeKey } from '@/hooks/useKeyboardShortcuts';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import api from '@/services/api';

const Overlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  z-index: 1000;
`;

const Drawer = styled(motion.div)`
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 420px;
  background: ${({ theme }) => theme.colors.bg};
  border-left: 1px solid ${({ theme }) => theme.colors.border};
  z-index: 1001;
  display: flex;
  flex-direction: column;
  box-shadow: -20px 0 50px rgba(0, 0, 0, 0.5);

  @media (max-width: 480px) {
    width: 100%;
  }
`;

const Header = styled.div`
  padding: 24px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const HeaderTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
`;

const Title = styled.h2`
  font-size: 18px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.textPrimary};
  margin: 0;
`;

const Tabs = styled.div`
  display: flex;
  gap: 20px;
`;

const Tab = styled.button<{ $active: boolean }>`
  background: none;
  border: none;
  color: ${({ $active, theme }) => $active ? theme.colors.primary : theme.colors.textMuted};
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  padding: 8px 0;
  position: relative;
  transition: all 200ms;

  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: ${({ theme }) => theme.colors.primary};
    transform: scaleX(${({ $active }) => $active ? 1 : 0});
    transition: transform 200ms;
  }

  &:hover {
    color: ${({ $active, theme }) => $active ? theme.colors.primary : theme.colors.textSecondary};
  }
`;

const List = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;

  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.borderHover};
    border-radius: 10px;
  }
`;

const NotificationItem = styled.div<{ $read: boolean }>`
  padding: 16px;
  border-radius: 12px;
  background: ${({ $read, theme }) => $read ? 'transparent' : theme.colors.primaryGlow};
  border: 1px solid ${({ $read, theme }) => $read ? theme.colors.border : `${theme.colors.primary}33`};
  transition: all 200ms;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.colors.bgHover};
    border-color: ${({ theme }) => theme.colors.borderHover};
  }
`;

const ItemHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
`;

const ItemTitle = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const ItemTime = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.textMuted};
`;

const ItemMessage = styled.div`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.textSecondary};
  line-height: 1.4;
`;

const SettingsSection = styled.div`
  padding: 24px;
  flex: 1;
  overflow-y: auto;
`;

const SettingsGroup = styled.div`
  margin-bottom: 32px;
`;

const GroupTitle = styled.h3`
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.colors.textMuted};
  margin-bottom: 16px;
`;

const SettingRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};

  &:last-child { border-bottom: none; }
`;

const SettingInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const SettingLabel = styled.div`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const SettingDesc = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textMuted};
`;

const Toggle = styled.button<{ $active: boolean; $loading?: boolean }>`
  width: 40px;
  height: 20px;
  border-radius: 10px;
  background: ${({ $active, theme }) => $active ? theme.colors.primary : theme.colors.bgHover};
  border: none;
  position: relative;
  cursor: ${({ $loading }) => $loading ? 'default' : 'pointer'};
  opacity: ${({ $loading }) => $loading ? 0.6 : 1};
  transition: all 200ms;

  &::after {
    content: '';
    position: absolute;
    top: 2px;
    left: ${props => props.$active ? '22px' : '2px'};
    width: 16px;
    height: 16px;
    background: white;
    border-radius: 50%;
    transition: all 200ms;
  }
`;

const ActionButton = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.primary};
  font-size: 13px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: all 150ms;
  &:hover { background: ${({ theme }) => theme.colors.primaryGlow}; }
  &:disabled { color: ${({ theme }) => theme.colors.textMuted}; cursor: default; }
`;

const TelegramBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(59, 130, 246, 0.1);
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid rgba(59, 130, 246, 0.2);
  margin-top: 8px;
`;

const TgUser = styled.span`
  color: #3B82F6;
  font-weight: 500;
  font-size: 13px;
`;

const BindCode = styled.div`
  background: rgba(59, 130, 246, 0.1);
  border: 1px dashed rgba(59, 130, 246, 0.3);
  padding: 16px;
  border-radius: 12px;
  text-align: center;
  font-family: monospace;
  font-size: 24px;
  color: #3B82F6;
  letter-spacing: 6px;
  margin: 12px 0;
`;

export function NotificationDrawer() {
  const [activeTab, setActiveTab] = useState<'notifications' | 'settings'>('notifications');
  const theme = useTheme();
  const { user, setUser } = useAuthStore();
  const { 
    isDrawerOpen, 
    notifications, 
    isLoading,
    setDrawerOpen, 
    markAsRead, 
    markAllAsRead, 
    clearNotifications 
  } = useNotificationStore();

  useEscapeKey(() => setDrawerOpen(false));

  const { 
    isSupported, 
    isSubscribed, 
    isSubscribing, 
    subscribe, 
    unsubscribe 
  } = usePushSubscription();

  const [tgBindData, setTgBindData] = useState<{code: string, bot_username: string} | null>(null);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [isUnbinding, setIsUnbinding] = useState(false);

  const generateTgCode = async () => {
    setIsGeneratingCode(true);
    try {
      const { data } = await api.post('/telegram/generate-bind-code');
      setTgBindData(data);
    } catch (err) {
      console.error('Failed to generate TG code:', err);
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const handleUnbindTelegram = async () => {
    if (!confirm('Вы уверены, что хотите отвязать Telegram?')) return;
    setIsUnbinding(true);
    try {
      await api.post('/telegram/unbind');
      const { data } = await api.get('/users/me');
      setUser(data);
    } catch (err) {
      console.error('Failed to unbind TG:', err);
    } finally {
      setIsUnbinding(false);
    }
  };

  const toggleChannel = async (type: string, channel: string) => {
    if (!user) return;
    const current = user.notification_settings[type] || [];
    const updated = current.includes(channel)
      ? current.filter(c => c !== channel)
      : [...current, channel];
    
    const newSettings = {
      ...user.notification_settings,
      [type]: updated
    };

    try {
      const { data } = await api.patch('/users/me/notification-settings', newSettings);
      setUser(data);
    } catch (err) {
      console.error('Failed to update settings:', err);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <AnimatePresence>
      {isDrawerOpen && (
        <>
          <Overlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setDrawerOpen(false)}
          />
          <Drawer
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          >
            <Header>
              <HeaderTop>
                <Title>Уведомления {unreadCount > 0 && `(${unreadCount})`}</Title>
                <ActionButton onClick={() => setDrawerOpen(false)} style={{ fontSize: '20px' }}>×</ActionButton>
              </HeaderTop>
              <Tabs>
                <Tab $active={activeTab === 'notifications'} onClick={() => setActiveTab('notifications')}>
                  Список
                </Tab>
                <Tab $active={activeTab === 'settings'} onClick={() => setActiveTab('settings')}>
                  Настройки
                </Tab>
              </Tabs>
            </Header>
            
            {activeTab === 'notifications' ? (
              <>
                <div style={{ padding: '8px 24px', display: 'flex', gap: '8px', borderBottom: `1px solid ${theme.colors.border}` }}>
                  {notifications.length > 0 && (
                    <>
                      <ActionButton onClick={markAllAsRead}>Прочитать все</ActionButton>
                      <ActionButton onClick={clearNotifications}>Очистить</ActionButton>
                    </>
                  )}
                </div>
                <List>
                  {isLoading ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: theme.colors.textMuted }}>Загрузка...</div>
                  ) : notifications.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: theme.colors.textMuted }}>Нет уведомлений</div>
                  ) : (
                    notifications.map(n => (
                      <NotificationItem key={n.id} $read={n.read} onClick={() => markAsRead(n.id)}>
                        <ItemHeader>
                          <ItemTitle>{n.title}</ItemTitle>
                          <ItemTime>{formatDistanceToNow(new Date(n.timestamp), { addSuffix: true, locale: ru })}</ItemTime>
                        </ItemHeader>
                        <ItemMessage>{n.message}</ItemMessage>
                      </NotificationItem>
                    ))
                  )}
                </List>
              </>
            ) : (
              <SettingsSection>
                <SettingsGroup>
                  <GroupTitle>Каналы связи</GroupTitle>
                  
                  {isSupported && (
                    <SettingRow>
                      <SettingInfo>
                        <SettingLabel>Push-уведомления</SettingLabel>
                        <SettingDesc>Браузерные уведомления</SettingDesc>
                      </SettingInfo>
                      <Toggle 
                        $active={isSubscribed} 
                        $loading={isSubscribing} 
                        onClick={async () => isSubscribed ? await unsubscribe() : await subscribe()} 
                      />
                    </SettingRow>
                  )}

                  <SettingRow style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <SettingInfo>
                        <SettingLabel>Telegram</SettingLabel>
                        <SettingDesc>Уведомления в мессенджер</SettingDesc>
                      </SettingInfo>
                      {user?.telegram_chat_id ? (
                        <ActionButton onClick={handleUnbindTelegram} disabled={isUnbinding} style={{ color: theme.colors.critical }}>
                          Отвязать
                        </ActionButton>
                      ) : !tgBindData && (
                        <ActionButton onClick={generateTgCode} disabled={isGeneratingCode}>
                          Привязать
                        </ActionButton>
                      )}
                    </div>
                    
                    {user?.telegram_chat_id && (
                      <TelegramBadge>
                        <span style={{ fontSize: '14px' }}>📱</span>
                        <TgUser>@{user.telegram_username || 'привязан'}</TgUser>
                      </TelegramBadge>
                    )}

                    {tgBindData && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                        <BindCode>{tgBindData.code}</BindCode>
                        <SettingDesc style={{ textAlign: 'center' }}>
                          Отправьте <code>/bind {tgBindData.code}</code> боту 
                          <a href={`https://t.me/${tgBindData.bot_username}`} target="_blank" rel="noreferrer" style={{ color: theme.colors.primary, marginLeft: '4px' }}>
                            @{tgBindData.bot_username}
                          </a>
                        </SettingDesc>
                      </motion.div>
                    )}
                  </SettingRow>
                </SettingsGroup>

                <SettingsGroup>
                  <GroupTitle>Типы событий</GroupTitle>
                  {[
                    { id: 'new_task', label: 'Новая задача', desc: 'При назначении новой задачи' },
                    { id: 'task_status', label: 'Статус задачи', desc: 'При изменении статуса задачи' },
                    { id: 'deadline', label: 'Срок задачи', desc: 'Напоминания о дедлайнах' },
                  ].map(type => (
                    <div key={type.id} style={{ marginBottom: '16px' }}>
                      <SettingLabel style={{ fontSize: '13px', fontWeight: '500', marginBottom: '8px' }}>{type.label}</SettingLabel>
                      <div style={{ display: 'flex', gap: '16px' }}>
                        {['in-app', 'push', 'telegram'].map(channel => (
                          <div key={channel} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Toggle 
                              style={{ width: '32px', height: '16px' }} 
                              $active={user?.notification_settings?.[type.id]?.includes(channel) || false}
                              onClick={() => toggleChannel(type.id, channel)}
                            />
                            <span style={{ fontSize: '11px', color: theme.colors.textSecondary }}>
                              {channel === 'in-app' ? 'На сайте' : channel === 'push' ? 'Push' : 'TG'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </SettingsGroup>
              </SettingsSection>
            )}
          </Drawer>
        </>
      )}
    </AnimatePresence>
  );
}
