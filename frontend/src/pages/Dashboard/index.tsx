import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import styled, { useTheme } from 'styled-components';
import { 
  LuMapPin, 
  LuCheck, 
  LuZap, 
  LuTriangleAlert,
  LuChartBar,
  LuTarget
} from 'react-icons/lu';
import { analyticsApi, geoApi } from '@/services/api';
import { Card } from '@/components/ui/Card';

const Page = styled(motion.div)`
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const PageTitle = styled.h1`
  font-size: 24px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.textPrimary};
  letter-spacing: -0.03em;
`;

const SubTitle = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-top: 4px;
`;

const KPIGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  @media (max-width: 1100px) { grid-template-columns: repeat(2, 1fr); }
  @media (max-width: 600px) { grid-template-columns: 1fr; }
`;

const KPICard = styled(motion.div)<{ $baseColor: string }>`
  background: ${({ theme, $baseColor }) => theme.mode === 'dark' 
    ? `linear-gradient(135deg, ${$baseColor}25, ${$baseColor}10)` 
    : `linear-gradient(135deg, ${$baseColor}18, ${$baseColor}08)`};
  border-radius: 16px;
  padding: 20px;
  border: 1px solid ${({ theme, $baseColor }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : `${$baseColor}35`};
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 24px ${({ theme, $baseColor }) => theme.mode === 'dark' ? `${$baseColor}15` : 'rgba(0,0,0,0.03)'};

  &::before {
    content: '';
    position: absolute;
    top: -30%;
    right: -10%;
    width: 120px;
    height: 120px;
    border-radius: 50%;
    background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'};
  }
`;

const KPILabel = styled.div`
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.5)' : theme.colors.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const KPIValue = styled.div`
  font-size: 38px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.textPrimary};
  letter-spacing: -0.04em;
  line-height: 1;
`;

const KPISubtext = styled.div`
  font-size: 12px;
  font-weight: 500;
  color: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.4)' : theme.colors.textMuted};
  margin-top: 8px;
`;

const MainGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  @media (max-width: 900px) { grid-template-columns: 1fr; }
`;

const SectionTitle = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.textPrimary};
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const CustomTooltip = ({ active, payload, label, theme }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: theme.colors.bgCard,
      border: `1px solid ${theme.colors.border}`,
      borderRadius: 10,
      padding: '10px 14px',
      fontSize: 13,
      color: theme.colors.textPrimary,
      boxShadow: theme.shadows.md,
    }}>
      <div style={{ fontWeight: 700, marginBottom: 4, color: theme.colors.textSecondary }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} style={{ color: p.color }}>
          {p.name}: <strong>{p.value}</strong>
        </div>
      ))}
    </div>
  );
};

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 200, damping: 20 } },
};

const KPI_CONFIGS = [
  {
    key: 'total_locations',
    label: 'Всего объектов',
    icon: <LuMapPin size={14} />,
    baseColor: '#3B82F6',
    suffix: '',
  },
  {
    key: 'ready',
    label: 'Готовы',
    icon: <LuCheck size={14} />,
    baseColor: '#22C55E',
    suffix: '',
    fromStatus: 'ready',
  },
  {
    key: 'in_progress',
    label: 'В работе',
    icon: <LuZap size={14} />,
    baseColor: '#F59E0B',
    fromStatus: 'in_progress',
  },
  {
    key: 'critical',
    label: 'Критичные',
    icon: <LuTriangleAlert size={14} />,
    baseColor: '#EF4444',
    fromStatus: 'critical',
  },
];

export function DashboardPage() {
  const theme = useTheme() as any;
  const { data: dash } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => analyticsApi.dashboard().then((r) => r.data),
  });

  const { data: regionStats } = useQuery({
    queryKey: ['regions-stats'],
    queryFn: () => analyticsApi.regions().then((r) => r.data),
  });

  const { data: regions } = useQuery({
    queryKey: ['regions'],
    queryFn: () => geoApi.getRegions().then((res) => res.data as any[]),
  });

  const getRegionName = (id: number) => {
    return regions?.find((r: any) => r.region_id === id)?.name || `Регион ${id}`;
  };

  const kpiValues: Record<string, number> = {
    total_locations: dash?.total_locations ?? 0,
    ready: dash?.by_status?.ready ?? 0,
    in_progress: dash?.by_status?.in_progress ?? 0,
    critical: dash?.by_status?.critical ?? 0,
  };

  const chartData = (regionStats ?? []).map((r: any) => ({
    name: getRegionName(r.region_id),
    Готово: r.ready,
    Критично: r.critical,
    total: r.total,
  }));

  return (
    <Page
      initial="hidden"
      animate="show"
      variants={container}
    >
      <motion.div variants={item}>
        <PageTitle>Аналитика</PageTitle>
        <SubTitle>Общее состояние системы eMedosmotr по регионам</SubTitle>
      </motion.div>

      <KPIGrid>
        {KPI_CONFIGS.map((cfg) => (
          <motion.div key={cfg.key} variants={item}>
            <KPICard $baseColor={cfg.baseColor} whileHover={{ scale: 1.02 }}>
              <KPILabel>{cfg.icon} {cfg.label}</KPILabel>
              <KPIValue>{kpiValues[cfg.key] ?? 0}</KPIValue>
              {cfg.key === 'ready' && dash?.total_locations > 0 && (
                <KPISubtext>
                  {Math.round((kpiValues.ready / kpiValues.total_locations) * 100)}% от всех объектов
                </KPISubtext>
              )}
            </KPICard>
          </motion.div>
        ))}
      </KPIGrid>

      <MainGrid>
        <motion.div variants={item}>
          <Card padding="20px">
            <SectionTitle>
              <LuChartBar size={16} /> Статусы по регионам
            </SectionTitle>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                <XAxis dataKey="name" tick={{ fill: theme.colors.textSecondary, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: theme.colors.textSecondary, fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip theme={theme} />} />
                <Bar dataKey="Готово" fill={theme.colors.ready} radius={[4, 4, 0, 0]} maxBarSize={32} />
                <Bar dataKey="Критично" fill={theme.colors.critical} radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card padding="20px">
            <SectionTitle>
              <LuTarget size={16} /> Доля готовых объектов
            </SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {(regionStats ?? []).map((r: any) => {
                const pct = r.total > 0 ? Math.round((r.ready / r.total) * 100) : 0;
                const color = pct >= 70 ? '#22C55E' : pct >= 40 ? '#F59E0B' : '#EF4444';
                return (
                  <div key={r.region_id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 12, color: theme.colors.textSecondary }}>
                      <span>{getRegionName(r.region_id)}</span>
                      <span style={{ fontWeight: 700, color }}>{pct}%</span>
                    </div>
                    <div style={{ height: 6, background: theme.colors.bgSecondary, borderRadius: 3, overflow: 'hidden' }}>
                      <motion.div
                        style={{ height: '100%', background: color, borderRadius: 3 }}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
                      />
                    </div>
                  </div>
                );
              })}
              {(!regionStats || regionStats.length === 0) && (
                <div style={{ textAlign: 'center', color: theme.colors.textSecondary, fontSize: 13, padding: '20px 0' }}>
                  Нет данных
                </div>
              )}
            </div>
          </Card>
        </motion.div>
      </MainGrid>
    </Page>
  );
}
