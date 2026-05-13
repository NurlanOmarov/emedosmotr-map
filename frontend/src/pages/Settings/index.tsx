import { useState } from 'react';
import styled from 'styled-components';
import { useQuery } from '@tanstack/react-query';
import { 
  LuDatabase, 
  LuChartBar, 
  LuInfo, 
  LuDownload, 
  LuCheck 
} from 'react-icons/lu';
import api from '@/services/api';

const Page = styled.div`
  max-width: 760px;
  margin: 0 auto;
  padding: 32px 24px;
  overflow-y: auto;
  height: 100%;
  box-sizing: border-box;
`;

const PageTitle = styled.h1`
  font-size: 20px;
  font-weight: 700;
  color: ${(p) => p.theme.colors.textPrimary};
  margin: 0 0 28px;
`;

const Section = styled.div`
  background: ${(p) => p.theme.colors.bgCard};
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 20px;
`;

const SectionHeader = styled.div`
  padding: 16px 20px;
  border-bottom: 1px solid ${(p) => p.theme.colors.border};
  display: flex;
  align-items: center;
  gap: 10px;
`;

const SectionTitle = styled.h2`
  font-size: 14px;
  font-weight: 600;
  color: ${(p) => p.theme.colors.textPrimary};
  margin: 0;
`;

const SectionBody = styled.div`
  padding: 20px;
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 0;
  border-bottom: 1px solid ${(p) => p.theme.colors.border};
  &:last-child { border-bottom: none; }
`;

const RowLabel = styled.div`
  font-size: 13px;
  color: ${(p) => p.theme.colors.textPrimary};
  font-weight: 500;
`;

const RowDesc = styled.div`
  font-size: 12px;
  color: ${(p) => p.theme.colors.textSecondary};
  margin-top: 2px;
`;

const RowValue = styled.div`
  font-size: 13px;
  color: ${(p) => p.theme.colors.textSecondary};
  white-space: nowrap;
`;

const BackupBtn = styled.button<{ $loading?: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  background: ${(p) => p.theme.colors.primary};
  color: white;
  border: none;
  border-radius: 8px;
  padding: 9px 18px;
  font-size: 13px;
  font-weight: 500;
  cursor: ${(p) => (p.$loading ? 'not-allowed' : 'pointer')};
  opacity: ${(p) => (p.$loading ? 0.7 : 1)};
  transition: opacity 0.15s;
  white-space: nowrap;
  &:hover { opacity: ${(p) => (p.$loading ? 0.7 : 0.9)}; }
`;

const StatusBadge = styled.span<{ $ok?: boolean }>`
  font-size: 11px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 20px;
  background: ${(p) => (p.$ok ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)')};
  color: ${(p) => (p.$ok ? '#10b981' : '#ef4444')};
`;

const TableGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 6px 16px;
  font-size: 12px;
`;

const TableName = styled.span`
  color: ${(p) => p.theme.colors.textPrimary};
  font-family: monospace;
`;

const TableSize = styled.span`
  color: ${(p) => p.theme.colors.textSecondary};
  text-align: right;
`;

const InfoText = styled.div`
  font-size: 13px;
  color: ${(p) => p.theme.colors.textSecondary};
  line-height: 1.6;
`;

const Spinner = styled.span`
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255,255,255,0.4);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  @keyframes spin { to { transform: rotate(360deg); } }
`;

interface DbInfo {
  total_size: string;
  tables: { table: string; size: string; columns: number }[];
  counts: Record<string, number | null>;
}

const COUNT_LABELS: Record<string, string> = {
  users: 'Пользователи',
  locations: 'Объекты на карте',
  tasks: 'Оперативные задачи',
  taskops_tasks: 'Задачи (TaskOps)',
  taskops_projects: 'Проекты (TaskOps)',
};

export function SettingsPage() {
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupError, setBackupError] = useState<string | null>(null);
  const [backupDone, setBackupDone] = useState(false);

  const { data: dbInfo, isLoading: dbLoading } = useQuery<DbInfo>({
    queryKey: ['settings', 'db-info'],
    queryFn: () => api.get('/v1/settings/db-info').then((r) => r.data),
    staleTime: 60_000,
  });

  const handleBackup = async () => {
    setBackupLoading(true);
    setBackupError(null);
    setBackupDone(false);
    try {
      const resp = await api.get('/v1/settings/backup', {
        responseType: 'blob',
      });
      const cd = resp.headers['content-disposition'] ?? '';
      const match = cd.match(/filename="?([^"]+)"?/);
      const filename = match?.[1] ?? 'backup.sql';

      const url = URL.createObjectURL(new Blob([resp.data], { type: 'application/octet-stream' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      setBackupDone(true);
      setTimeout(() => setBackupDone(false), 4000);
    } catch (e: any) {
      const msg = e?.response?.data
        ? await e.response.data.text?.()
        : 'Ошибка при создании бэкапа';
      try {
        const parsed = JSON.parse(msg);
        setBackupError(parsed.detail ?? msg);
      } catch {
        setBackupError(msg);
      }
    } finally {
      setBackupLoading(false);
    }
  };

  return (
    <Page>
      <PageTitle>Настройки</PageTitle>

      {/* Database backup */}
      <Section>
        <SectionHeader>
          <LuDatabase size={18} style={{ color: '#3b82f6' }} />
          <SectionTitle>База данных</SectionTitle>
          {dbInfo && (
            <span style={{ marginLeft: 'auto', fontSize: 12, color: '#9ca3af' }}>
              Размер: <strong style={{ color: 'inherit' }}>{dbInfo.total_size}</strong>
            </span>
          )}
        </SectionHeader>
        <SectionBody>
          <Row>
            <div>
              <RowLabel>Полный бэкап</RowLabel>
              <RowDesc>
                Скачать дамп всей базы данных в формате SQL (pg_dump).
                Файл содержит структуру и все данные.
              </RowDesc>
            </div>
            <BackupBtn onClick={handleBackup} $loading={backupLoading} disabled={backupLoading}>
              {backupLoading ? (
                <><Spinner /> Создаётся...</>
              ) : backupDone ? (
                <><LuCheck size={14} /> Скачано</>
              ) : (
                <><LuDownload size={14} /> Скачать бэкап</>
              )}
            </BackupBtn>
          </Row>
          {backupError && (
            <div style={{ fontSize: 12, color: '#ef4444', marginTop: 8, padding: '8px 12px', background: 'rgba(239,68,68,0.1)', borderRadius: 6 }}>
              {backupError}
            </div>
          )}

          {/* Row counts */}
          {dbInfo && (
            <Row>
              <div style={{ width: '100%' }}>
                <RowLabel style={{ marginBottom: 10 }}>Статистика записей</RowLabel>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
                  {Object.entries(dbInfo.counts).map(([key, val]) => (
                    <div key={key} style={{
                      background: 'var(--bg-secondary, rgba(255,255,255,0.04))',
                      borderRadius: 8,
                      padding: '10px 14px',
                      border: '1px solid rgba(255,255,255,0.06)'
                    }}>
                      <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>
                        {COUNT_LABELS[key] ?? key}
                      </div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: '#f3f4f6' }}>
                        {val ?? '—'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Row>
          )}
        </SectionBody>
      </Section>

      {/* Tables list */}
      <Section>
        <SectionHeader>
          <LuChartBar size={18} style={{ color: '#10b981' }} />
          <SectionTitle>Таблицы</SectionTitle>
        </SectionHeader>
        <SectionBody>
          {dbLoading && <InfoText>Загрузка...</InfoText>}
          {dbInfo && (
            <TableGrid>
              {dbInfo.tables.map((t) => (
                <>
                  <TableName key={t.table + '_name'}>{t.table}</TableName>
                  <TableSize key={t.table + '_size'}>{t.size}</TableSize>
                </>
              ))}
            </TableGrid>
          )}
        </SectionBody>
      </Section>

      {/* System info */}
      <Section>
        <SectionHeader>
          <LuInfo size={18} style={{ color: '#6366f1' }} />
          <SectionTitle>О системе</SectionTitle>
        </SectionHeader>
        <SectionBody>
          <Row>
            <RowLabel>Версия</RowLabel>
            <RowValue>eMedosmotr Map v1.0</RowValue>
          </Row>
          <Row>
            <RowLabel>База данных</RowLabel>
            <RowValue>PostgreSQL + PostGIS 15</RowValue>
          </Row>
          <Row>
            <RowLabel>Статус сервиса</RowLabel>
            <RowValue><StatusBadge $ok>Работает</StatusBadge></RowValue>
          </Row>
        </SectionBody>
      </Section>
    </Page>
  );
}
