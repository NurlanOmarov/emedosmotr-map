import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiUpload,
  FiTrash2,
  FiSearch,
  FiUser,
  FiPhone,
  FiKey,
  FiFileText,
  FiPlus,
  FiCheckSquare,
  FiCopy,
  FiShare2,
  FiMessageCircle,
  FiDownload,
} from 'react-icons/fi';
import * as XLSX from 'xlsx';
import html2pdf from 'html2pdf.js';
import { districtAccountsApi, geoApi } from '@/services/api';
import { useAuthStore } from '@/features/auth/useAuthStore';
import { useNotificationStore } from '@/features/notifications/useNotificationStore';
import { useConfirm } from '@/components/shared/ConfirmDialog';

// ─── Styled components ────────────────────────────────────────────────────────

const Container = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  background: ${({ theme }) => theme.colors.bg};
  overflow: hidden;
`;

const ScrollArea = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 24px;

  &::-webkit-scrollbar { width: 5px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.border};
    border-radius: 4px;
  }
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 12px;
`;

const Title = styled.h1`
  font-size: 24px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.textPrimary};
  margin: 0;
`;

const Actions = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
`;

const Btn = styled.button<{ variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: 10px;
  font-weight: 600;
  font-size: 14px;
  transition: all 0.2s;
  cursor: pointer;
  border: none;
  white-space: nowrap;

  ${({ variant, theme }) =>
    variant === 'primary'
      ? `background:${theme.colors.primary};color:white;&:hover{background:${theme.colors.primaryHover};}`
      : variant === 'danger'
      ? `background:${theme.colors.critical};color:white;&:hover{background:${theme.colors.critical};opacity:0.9;}`
      : variant === 'ghost'
      ? `background:transparent;color:${theme.colors.textSecondary};border:1px solid ${theme.colors.border};&:hover{background:${theme.colors.bgHover};}`
      : `background:${theme.colors.bgCard};color:${theme.colors.textSecondary};border:1px solid ${theme.colors.border};&:hover{background:${theme.colors.bgHover};}`}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const SearchContainer = styled.div`
  position: relative;
  width: 280px;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 10px 16px 10px 40px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.bgCard};
  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: 14px;
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.primaryGlow};
  }
`;

const SearchIcon = styled(FiSearch)`
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
`;

const FilterCard = styled.div`
  background: ${({ theme }) => theme.colors.bgCard};
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 24px;
  box-shadow: ${({ theme }) => theme.shadows.sm};
  border: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  gap: 20px;
  align-items: flex-end;
  flex-wrap: wrap;
`;

const SelectGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 200px;
  flex: 1;
`;

const Label = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const Select = styled.select`
  padding: 10px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  font-size: 14px;
  background: ${({ theme }) => theme.colors.bgCard};
  color: ${({ theme }) => theme.colors.textPrimary};
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const TableCard = styled.div`
  background: ${({ theme }) => theme.colors.bgCard};
  border-radius: 16px;
  box-shadow: ${({ theme }) => theme.shadows.sm};
  border: 1px solid ${({ theme }) => theme.colors.border};
  overflow: hidden;
`;

const BulkBar = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  background: ${({ theme }) => theme.colors.bgSecondary};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const Th = styled.th`
  text-align: left;
  padding: 14px 16px;
  background: ${({ theme }) => theme.colors.bgSecondary};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.textSecondary};
  font-weight: 600;
  font-size: 13px;

  @media (max-width: 768px) {
    display: none;
  }
`;

const Tr = styled.tr<{ $selected?: boolean }>`
  background: ${({ $selected }) => ($selected ? '#eff6ff' : 'transparent')};
  
  @media (max-width: 768px) {
    display: block;
    padding: 12px;
    border-bottom: 8px solid #f8fafc;
    background: ${({ $selected }) => ($selected ? '#eff6ff' : 'white')};
  }
`;

const Td = styled.td`
  padding: 14px 16px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  font-size: 14px;
  color: ${({ theme }) => theme.colors.textPrimary};

  @media (max-width: 768px) {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 0;
    border-bottom: 1px dashed ${({ theme }) => theme.colors.border};
    min-height: 44px;

    &:last-child {
      border-bottom: none;
      padding-top: 12px;
    }

    &::before {
      content: attr(data-label);
      font-weight: 600;
      color: ${({ theme }) => theme.colors.textSecondary};
      font-size: 11px;
      text-transform: uppercase;
      margin-right: 16px;
      flex-shrink: 0;
    }
  }
`;

const CategoryBadge = styled.span`
  display: inline-block;
  padding: 3px 10px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 700;
  background: #eff6ff;
  color: #2563eb;
  text-transform: uppercase;
`;

const LoginInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: monospace;
  background: ${({ theme }) => theme.colors.bgHover};
  color: ${({ theme }) => theme.colors.textPrimary};
  padding: 4px 8px;
  border-radius: 6px;
  width: fit-content;
  font-size: 13px;
`;

const ModalOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled(motion.div)`
  background: ${({ theme }) => theme.colors.bgCard};
  color: ${({ theme }) => theme.colors.textPrimary};
  border-radius: 20px;
  width: 100%;
  max-width: 520px;
  padding: 32px;
  box-shadow: ${({ theme }) => theme.shadows.lg};
  max-height: 90vh;
  overflow-y: auto;
`;

const DropZone = styled.div<{ $dragging: boolean }>`
  border: 2px dashed ${({ $dragging, theme }) => ($dragging ? theme.colors.primary : theme.colors.border)};
  background: ${({ $dragging, theme }) => ($dragging ? theme.colors.bgHover : theme.colors.bgSecondary)};
  border-radius: 16px;
  padding: 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 20px;
  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) => theme.colors.bgHover};
  }
`;

const FileInfoRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  background: ${({ theme }) => theme.colors.bgSecondary};
  padding: 12px 16px;
  border-radius: 10px;
  width: 100%;
  margin-top: 16px;
`;

const FormField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Input = styled.input`
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.bgCard};
  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: 14px;
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.primaryGlow};
  }
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
`;

const FormActions = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 24px;
`;

const CheckBox = styled.input.attrs({ type: 'checkbox' })`
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: #2563eb;
`;

const IconButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
  &:hover {
    background: #e2e8f0;
    color: #2563eb;
  }
  svg {
    display: block;
  }
`;

const CopyBtn = styled(IconButton)`
  padding: 4px;
  width: 24px;
  height: 24px;
  opacity: 0.6;
  &:hover {
    opacity: 1;
  }
`;

// ─── Component ────────────────────────────────────────────────────────────────

const ACCOUNT_CATEGORIES = ['Медкомиссия', 'Врачи доп. обследования'];

const EMPTY_FORM = {
  full_name: '',
  login: '',
  password: '',
  role: '',
  phone: '',
  note: '',
  category: '',
};

export const DistrictAccountsPage: React.FC = () => {
  // oblast = region (Алматинская область, etc.)
  // district = settlement (Талгар, Каскелен, etc.)
  const [oblasts, setOblasts] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [selectedOblastId, setSelectedOblastId] = useState<number | ''>('');
  const [selectedDistrictId, setSelectedDistrictId] = useState<number | ''>('');
  const [accounts, setAccounts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // modals
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any | null>(null);

  // upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [replaceExisting, setReplaceExisting] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadCategory, setUploadCategory] = useState('');

  // add form state
  const [addForm, setAddForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  const { user } = useAuthStore();
  const { addToast } = useNotificationStore();
  const confirm = useConfirm();
  const canEdit = user?.role && ['admin', 'superadmin', 'director'].includes(user.role);
  const [searchParams] = useSearchParams();

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    addToast(`${label} скопирован`, 'success');
  };

  const shareToWhatsApp = (acc: any) => {
    const text = `*Данные учётной записи:*
👤 *ФИО:* ${acc.full_name}
🎭 *Роль:* ${acc.role || '—'}
🔑 *Логин:* ${acc.login || '—'}
🔒 *Пароль:* ${acc.password || '—'}
📞 *Телефон:* ${acc.phone || '—'}
📝 *Примечание:* ${acc.note || '—'}`;
    
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const exportExcel = () => {
    const data = filteredAccounts.map(acc => ({
      'ФИО': acc.full_name,
      'Роль': acc.role || '',
      'Категория': acc.category || '',
      'Логин': acc.login || '',
      'Пароль': acc.password || '',
      'Телефон': acc.phone || '',
      'Примечание': acc.note || '',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Accounts');
    XLSX.writeFile(wb, `Accounts_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportPDF = () => {
    const element = document.createElement('div');
    element.innerHTML = `
      <div style="padding: 20px; font-family: Arial, sans-serif;">
        <h1 style="text-align: center; color: #1e293b; margin-bottom: 20px;">Список учётных записей</h1>
        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
          <thead>
            <tr style="background: #2563eb; color: white;">
              <th style="padding: 10px; border: 1px solid #e2e8f0; text-align: left;">ФИО</th>
              <th style="padding: 10px; border: 1px solid #e2e8f0; text-align: left;">Роль</th>
              <th style="padding: 10px; border: 1px solid #e2e8f0; text-align: left;">Категория</th>
              <th style="padding: 10px; border: 1px solid #e2e8f0; text-align: left;">Логин</th>
              <th style="padding: 10px; border: 1px solid #e2e8f0; text-align: left;">Пароль</th>
              <th style="padding: 10px; border: 1px solid #e2e8f0; text-align: left;">Телефон</th>
            </tr>
          </thead>
          <tbody>
            ${filteredAccounts.map(acc => `
              <tr>
                <td style="padding: 8px; border: 1px solid #e2e8f0;">${acc.full_name}</td>
                <td style="padding: 8px; border: 1px solid #e2e8f0;">${acc.role || '—'}</td>
                <td style="padding: 8px; border: 1px solid #e2e8f0;">${acc.category || '—'}</td>
                <td style="padding: 8px; border: 1px solid #e2e8f0;">${acc.login || '—'}</td>
                <td style="padding: 8px; border: 1px solid #e2e8f0;">${acc.password || '—'}</td>
                <td style="padding: 8px; border: 1px solid #e2e8f0;">${acc.phone || '—'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div style="margin-top: 20px; font-size: 10px; color: #64748b; text-align: right;">
          Дата выгрузки: ${new Date().toLocaleString('ru-RU')}
        </div>
      </div>
    `;
    
    const opt = {
      margin: 10,
      filename: `Accounts_${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };
    
    (html2pdf() as any).from(element).set(opt).save();
  };

  // load oblasts (regions) once; then auto-select from URL ?settlement_id=X
  useEffect(() => {
    geoApi.getRegions().then(res => {
      setOblasts(res.data);
      const urlSettlementId = searchParams.get('settlement_id');
      if (urlSettlementId) {
        // resolve settlement → region (oblast) then auto-select
        geoApi.getSettlement(Number(urlSettlementId)).then(sRes => {
          const settlement = sRes.data;
          setSelectedOblastId(settlement.region_id);
          geoApi.getSettlements(settlement.region_id).then(dRes => {
            setDistricts(dRes.data);
            setSelectedDistrictId(Number(urlSettlementId));
          });
        });
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // load districts (settlements) when oblast changes (manual select only)
  const handleOblastChange = useCallback((oblastId: number | '') => {
    setSelectedOblastId(oblastId);
    setSelectedDistrictId('');
    setAccounts([]);
    if (oblastId) {
      geoApi.getSettlements(oblastId as number).then(res => setDistricts(res.data));
    } else {
      setDistricts([]);
    }
  }, []);

  // load accounts when district (settlement) changes
  useEffect(() => {
    setSelectedIds(new Set());
    if (selectedDistrictId) {
      districtAccountsApi.list(selectedDistrictId as number).then(res => setAccounts(res.data));
    } else {
      setAccounts([]);
    }
  }, [selectedDistrictId]);

  // ── upload ──────────────────────────────────────────────────────────────────
  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files[0]) setUploadFile(e.dataTransfer.files[0]);
  };

  const handleUpload = async () => {
    if (!uploadFile || !selectedDistrictId) return;
    setUploading(true);
    try {
      const res = await districtAccountsApi.upload(selectedDistrictId as number, uploadFile, replaceExisting, uploadCategory || undefined);
      setAccounts(res.data);
      setIsUploadOpen(false);
      setUploadFile(null);
      setReplaceExisting(true);
      setUploadCategory('');
    } catch {
      alert('Ошибка при загрузке файла');
    } finally {
      setUploading(false);
    }
  };

  // ── add manually ────────────────────────────────────────────────────────────
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDistrictId) return;
    setSaving(true);
    try {
      const res = await districtAccountsApi.create({ ...addForm, settlement_id: selectedDistrictId });
      setAccounts(prev => [...prev, res.data]);
      setIsAddOpen(false);
      setAddForm({ ...EMPTY_FORM });
    } catch {
      alert('Ошибка при добавлении');
    } finally {
      setSaving(false);
    }
  };

  // ── edit ─────────────────────────────────────────────────────────────────
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;
    try {
      const res = await districtAccountsApi.update(editingAccount.id, editingAccount);
      setAccounts(prev => prev.map(a => (a.id === editingAccount.id ? res.data : a)));
      setEditingAccount(null);
    } catch {
      alert('Ошибка при обновлении');
    }
  };

  // ── delete single ────────────────────────────────────────────────────────────
  const handleDelete = async (id: number) => {
    const ok = await confirm({
      title: 'Удалить учётную запись?',
      message: 'Запись будет удалена безвозвратно.',
      confirmLabel: 'Удалить',
      variant: 'danger',
    });
    if (!ok) return;
    await districtAccountsApi.delete(id);
    setAccounts(prev => prev.filter(a => a.id !== id));
    setSelectedIds(prev => { const s = new Set(prev); s.delete(id); return s; });
  };

  // ── bulk delete ──────────────────────────────────────────────────────────────
  const handleBulkDelete = async () => {
    const ok = await confirm({
      title: `Удалить ${selectedIds.size} записей?`,
      message: 'Выбранные учётные записи будут удалены безвозвратно.',
      confirmLabel: 'Удалить всё',
      variant: 'danger',
    });
    if (!ok) return;
    await districtAccountsApi.bulkDelete(Array.from(selectedIds));
    setAccounts(prev => prev.filter(a => !selectedIds.has(a.id)));
    setSelectedIds(new Set());
  };

  // ── clear region ─────────────────────────────────────────────────────────────
  const handleClear = async () => {
    if (!selectedDistrictId) return;
    const ok = await confirm({
      title: 'Удалить ВСЕ записи района?',
      message: 'Все учётные записи этого района будут удалены безвозвратно. Это действие нельзя отменить.',
      confirmLabel: 'Удалить всё',
      variant: 'danger',
    });
    if (!ok) return;
    await districtAccountsApi.clear(selectedDistrictId as number);
    setAccounts([]);
    setSelectedIds(new Set());
  };

  // ── selection ─────────────────────────────────────────────────────────────
  const toggleAll = () => {
    if (selectedIds.size === filteredAccounts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAccounts.map(a => a.id)));
    }
  };

  const toggleOne = (id: number) => {
    setSelectedIds(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const filteredAccounts = accounts.filter(
    acc =>
      acc.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (acc.login && acc.login.toLowerCase().includes(search.toLowerCase())) ||
      (acc.role && acc.role.toLowerCase().includes(search.toLowerCase())),
  );

  const allSelected = filteredAccounts.length > 0 && selectedIds.size === filteredAccounts.length;

  return (
    <Container>
      <ScrollArea>
      <Header>
        <Title>Учётные записи медкомиссий</Title>
        <Actions>
          <SearchContainer>
            <SearchIcon />
            <SearchInput
              placeholder="Поиск по ФИО, логину..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </SearchContainer>
          {selectedDistrictId && canEdit && (
            <Btn variant="ghost" onClick={() => { setAddForm({ ...EMPTY_FORM }); setIsAddOpen(true); }}>
              <FiPlus /> Добавить
            </Btn>
          )}
          {selectedDistrictId && canEdit && (
            <Btn variant="primary" onClick={() => setIsUploadOpen(true)}>
              <FiUpload /> Загрузить Excel
            </Btn>
          )}
          {selectedDistrictId && accounts.length > 0 && (
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn variant="ghost" onClick={exportExcel} title="Скачать Excel">
                <FiDownload /> Excel
              </Btn>
              <Btn variant="ghost" onClick={exportPDF} title="Скачать PDF">
                <FiDownload /> PDF
              </Btn>
            </div>
          )}
          {selectedDistrictId && accounts.length > 0 && canEdit && (
            <Btn variant="danger" onClick={handleClear}>
              <FiTrash2 /> Очистить район
            </Btn>
          )}
        </Actions>
      </Header>

      {/* Oblast (region) + District (settlement) filter */}
      <FilterCard>
        <SelectGroup>
          <Label>Область</Label>
          <Select
            value={selectedOblastId}
            onChange={e => handleOblastChange(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">Выберите область...</option>
            {oblasts.map(o => (
              <option key={o.region_id} value={o.region_id}>{o.name}</option>
            ))}
          </Select>
        </SelectGroup>

        <SelectGroup>
          <Label>Район</Label>
          <Select
            value={selectedDistrictId}
            onChange={e => setSelectedDistrictId(e.target.value ? Number(e.target.value) : '')}
            disabled={!selectedOblastId}
          >
            <option value="">
              {selectedOblastId ? 'Выберите район...' : 'Сначала выберите область'}
            </option>
            {districts.map(d => (
              <option key={d.settlement_id} value={d.settlement_id}>{d.name}</option>
            ))}
          </Select>
        </SelectGroup>

        <div style={{ flex: 2, alignSelf: 'flex-end', paddingBottom: '2px' }}>
          <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
            {selectedDistrictId
              ? `Загружено учётных записей: ${accounts.length}`
              : 'Выберите область и район для просмотра учётных записей медкомиссий.'}
          </p>
        </div>
      </FilterCard>

      {/* Table */}
      <TableCard>
        <AnimatePresence>
          {selectedIds.size > 0 && (
            <BulkBar
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <FiCheckSquare color="#2563eb" />
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#1e40af' }}>
                Выбрано: {selectedIds.size}
              </span>
              <Btn variant="danger" style={{ padding: '6px 14px', fontSize: '13px' }} onClick={handleBulkDelete}>
                <FiTrash2 size={14} /> Удалить выбранные
              </Btn>
              <Btn variant="ghost" style={{ padding: '6px 14px', fontSize: '13px' }} onClick={() => setSelectedIds(new Set())}>
                Снять выделение
              </Btn>
            </BulkBar>
          )}
        </AnimatePresence>

        <Table>
          <thead>
            <tr>
              <Th style={{ width: 40 }}>
                {filteredAccounts.length > 0 && (
                  <CheckBox checked={allSelected} onChange={toggleAll} />
                )}
              </Th>
              <Th>ФИО / Роль</Th>
              <Th>Категория</Th>
              <Th>Логин</Th>
              <Th>Пароль</Th>
              <Th>Телефон</Th>
              <Th>Примечание</Th>
              <Th style={{ width: 80 }}></Th>
            </tr>
          </thead>
          <tbody>
            {filteredAccounts.map(acc => (
              <Tr key={acc.id} $selected={selectedIds.has(acc.id)}>
                <Td data-label="Выбор">
                  <CheckBox
                    checked={selectedIds.has(acc.id)}
                    onChange={() => toggleOne(acc.id)}
                  />
                </Td>
                <Td data-label="ФИО / Роль">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, textAlign: 'inherit' }}>
                    <span style={{ fontWeight: 600, color: '#1e293b' }}>{acc.full_name}</span>
                    <span style={{ fontSize: 12, color: '#64748b' }}>{acc.role || '—'}</span>
                  </div>
                </Td>
                <Td data-label="Категория">
                  {acc.category && <CategoryBadge>{acc.category}</CategoryBadge>}
                </Td>
                <Td data-label="Логин">
                  {acc.login
                    ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'inherit' }}>
                        <LoginInfo><FiUser size={12} /> {acc.login}</LoginInfo>
                        <CopyBtn onClick={() => copyToClipboard(acc.login, 'Логин')} title="Копировать логин">
                          <FiCopy size={12} />
                        </CopyBtn>
                      </div>
                    )
                    : '—'}
                </Td>
                <Td data-label="Пароль">
                  {acc.password
                    ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'inherit' }}>
                        <LoginInfo style={{ background: '#fff7ed', color: '#c2410c' }}><FiKey size={12} /> {acc.password}</LoginInfo>
                        <CopyBtn onClick={() => copyToClipboard(acc.password, 'Пароль')} title="Копировать пароль">
                          <FiCopy size={12} />
                        </CopyBtn>
                      </div>
                    )
                    : '—'}
                </Td>
                <Td data-label="Телефон">
                  {acc.phone
                    ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                        <span style={{ fontSize: 13, color: '#475569', fontWeight: 500 }}>{acc.phone}</span>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <IconButton as="a" href={`tel:${acc.phone}`} title="Позвонить">
                            <FiPhone size={14} />
                          </IconButton>
                          <IconButton
                            as="a"
                            href={`https://wa.me/${acc.phone.replace(/\D/g, '')}`}
                            target="_blank"
                            title="Написать в WhatsApp"
                          >
                            <FiMessageCircle size={14} />
                          </IconButton>
                          <IconButton onClick={() => copyToClipboard(acc.phone, 'Телефон')} title="Копировать телефон">
                            <FiCopy size={14} />
                          </IconButton>
                        </div>
                      </div>
                    )
                    : '—'}
                </Td>
                <Td data-label="Примечание">
                  <span style={{ fontSize: 13, color: '#64748b' }}>{acc.note || '—'}</span>
                </Td>
                <Td data-label="Действия">
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'flex-end' }}>
                    <Btn
                      variant="ghost"
                      style={{ padding: '5px', border: 'none' }}
                      onClick={() => shareToWhatsApp(acc)}
                      title="Поделиться в WhatsApp"
                    >
                      <FiShare2 size={16} color="#16a34a" />
                    </Btn>
                    {canEdit && (
                      <>
                        <Btn
                          variant="ghost"
                          style={{ padding: '5px 10px', fontSize: 12 }}
                          onClick={() => setEditingAccount({ ...acc })}
                        >
                          Ред.
                        </Btn>
                        <Btn
                          variant="ghost"
                          style={{ padding: '5px', border: 'none' }}
                          onClick={() => handleDelete(acc.id)}
                        >
                          <FiTrash2 size={15} color="#ef4444" />
                        </Btn>
                      </>
                    )}
                  </div>
                </Td>
              </Tr>
            ))}
            {selectedDistrictId && filteredAccounts.length === 0 && (
              <tr>
                <Td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                  Нет данных для отображения
                </Td>
              </tr>
            )}
            {!selectedDistrictId && (
              <tr>
                <Td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                  Выберите область и район
                </Td>
              </tr>
            )}
          </tbody>
        </Table>
      </TableCard>
      </ScrollArea>

      {/* ── Upload modal ───────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isUploadOpen && (
          <ModalOverlay
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setIsUploadOpen(false)}
          >
            <ModalContent
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <h2 style={{ margin: '0 0 8px', fontSize: 20 }}>Загрузка учётных записей</h2>
              <p style={{ color: '#64748b', fontSize: 14, marginBottom: 20 }}>
                Загрузите Excel-файл со списком врачей. Система автоматически распределит их по категориям.
              </p>

              {/* category selector */}
              <FormField style={{ marginBottom: 16 }}>
                <Label>Категория учётных записей</Label>
                <Select
                  value={uploadCategory}
                  onChange={e => setUploadCategory(e.target.value)}
                >
                  <option value="">— Определить из файла —</option>
                  {ACCOUNT_CATEGORIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </Select>
                <p style={{ fontSize: 12, color: '#94a3b8', margin: '4px 0 0' }}>
                  Если выбрана — все записи из файла получат эту категорию
                </p>
              </FormField>

              {/* replace toggle */}
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, cursor: 'pointer', marginBottom: 8 }}>
                <CheckBox
                  checked={replaceExisting}
                  onChange={e => setReplaceExisting(e.target.checked)}
                />
                <span>Заменить существующие данные района (рекомендуется)</span>
              </label>
              <p style={{ fontSize: 12, color: '#94a3b8', margin: '0 0 16px 26px' }}>
                Если не отмечено — новые записи добавятся поверх существующих
              </p>

              <DropZone
                $dragging={isDragging}
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleFileDrop}
                onClick={() => document.getElementById('fileInput')?.click()}
              >
                <FiUpload size={32} color={isDragging ? '#3b82f6' : '#94a3b8'} />
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontWeight: 600, margin: '0 0 4px' }}>Нажмите или перетащите файл</p>
                  <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>Только .xlsx или .xls</p>
                </div>
                <input
                  id="fileInput"
                  type="file"
                  accept=".xlsx,.xls"
                  style={{ display: 'none' }}
                  onChange={e => e.target.files && setUploadFile(e.target.files[0])}
                />
              </DropZone>

              {uploadFile && (
                <FileInfoRow>
                  <FiFileText size={20} color="#3b82f6" />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>{uploadFile.name}</p>
                    <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>{(uploadFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <Btn variant="ghost" style={{ padding: 4, border: 'none' }} onClick={() => setUploadFile(null)}>
                    <FiTrash2 size={14} color="#ef4444" />
                  </Btn>
                </FileInfoRow>
              )}

              <FormActions>
                <Btn style={{ flex: 1 }} onClick={() => setIsUploadOpen(false)}>Отмена</Btn>
                <Btn
                  variant="primary"
                  style={{ flex: 2 }}
                  disabled={!uploadFile || uploading}
                  onClick={handleUpload}
                >
                  {uploading ? 'Загрузка...' : 'Начать импорт'}
                </Btn>
              </FormActions>
            </ModalContent>
          </ModalOverlay>
        )}
      </AnimatePresence>

      {/* ── Add manually modal ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {isAddOpen && (
          <ModalOverlay
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setIsAddOpen(false)}
          >
            <ModalContent
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <h2 style={{ margin: '0 0 24px', fontSize: 20 }}>Добавить учётную запись</h2>
              <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <FormField>
                  <Label>ФИО *</Label>
                  <Input
                    required
                    placeholder="Иванов Иван Иванович"
                    value={addForm.full_name}
                    onChange={e => setAddForm(f => ({ ...f, full_name: e.target.value }))}
                  />
                </FormField>
                <FormGrid>
                  <FormField>
                    <Label>Логин</Label>
                    <Input
                      placeholder="661124301339"
                      value={addForm.login}
                      onChange={e => setAddForm(f => ({ ...f, login: e.target.value }))}
                    />
                  </FormField>
                  <FormField>
                    <Label>Пароль</Label>
                    <Input
                      placeholder="661124!Ur"
                      value={addForm.password}
                      onChange={e => setAddForm(f => ({ ...f, password: e.target.value }))}
                    />
                  </FormField>
                </FormGrid>
                <FormGrid>
                  <FormField>
                    <Label>Роль / Должность</Label>
                    <Input
                      placeholder="Терапевт"
                      value={addForm.role}
                      onChange={e => setAddForm(f => ({ ...f, role: e.target.value }))}
                    />
                  </FormField>
                  <FormField>
                    <Label>Телефон</Label>
                    <Input
                      placeholder="87001234567"
                      value={addForm.phone}
                      onChange={e => setAddForm(f => ({ ...f, phone: e.target.value }))}
                    />
                  </FormField>
                </FormGrid>
                <FormField>
                  <Label>Категория *</Label>
                  <Select
                    required
                    value={addForm.category}
                    onChange={e => setAddForm(f => ({ ...f, category: e.target.value }))}
                  >
                    <option value="">Выберите категорию...</option>
                    {ACCOUNT_CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </Select>
                </FormField>
                <FormField>
                  <Label>Примечание</Label>
                  <Input
                    placeholder="Дополнительная информация"
                    value={addForm.note}
                    onChange={e => setAddForm(f => ({ ...f, note: e.target.value }))}
                  />
                </FormField>
                <FormActions>
                  <Btn type="button" style={{ flex: 1 }} onClick={() => setIsAddOpen(false)}>Отмена</Btn>
                  <Btn type="submit" variant="primary" style={{ flex: 2 }} disabled={saving}>
                    {saving ? 'Сохранение...' : 'Добавить'}
                  </Btn>
                </FormActions>
              </form>
            </ModalContent>
          </ModalOverlay>
        )}
      </AnimatePresence>

      {/* ── Edit modal ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {editingAccount && (
          <ModalOverlay
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setEditingAccount(null)}
          >
            <ModalContent
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <h2 style={{ margin: '0 0 24px', fontSize: 20 }}>Редактирование записи</h2>
              <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <FormField>
                  <Label>ФИО</Label>
                  <Input
                    value={editingAccount.full_name}
                    onChange={e => setEditingAccount((a: any) => ({ ...a, full_name: e.target.value }))}
                  />
                </FormField>
                <FormGrid>
                  <FormField>
                    <Label>Логин</Label>
                    <Input
                      value={editingAccount.login || ''}
                      onChange={e => setEditingAccount((a: any) => ({ ...a, login: e.target.value }))}
                    />
                  </FormField>
                  <FormField>
                    <Label>Пароль</Label>
                    <Input
                      value={editingAccount.password || ''}
                      onChange={e => setEditingAccount((a: any) => ({ ...a, password: e.target.value }))}
                    />
                  </FormField>
                </FormGrid>
                <FormGrid>
                  <FormField>
                    <Label>Роль</Label>
                    <Input
                      value={editingAccount.role || ''}
                      onChange={e => setEditingAccount((a: any) => ({ ...a, role: e.target.value }))}
                    />
                  </FormField>
                  <FormField>
                    <Label>Телефон</Label>
                    <Input
                      value={editingAccount.phone || ''}
                      onChange={e => setEditingAccount((a: any) => ({ ...a, phone: e.target.value }))}
                    />
                  </FormField>
                </FormGrid>
                <FormField>
                  <Label>Категория</Label>
                  <Select
                    value={editingAccount.category || ''}
                    onChange={e => setEditingAccount((a: any) => ({ ...a, category: e.target.value }))}
                  >
                    <option value="">— Не указана —</option>
                    {ACCOUNT_CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </Select>
                </FormField>
                <FormField>
                  <Label>Примечание</Label>
                  <Input
                    value={editingAccount.note || ''}
                    onChange={e => setEditingAccount((a: any) => ({ ...a, note: e.target.value }))}
                  />
                </FormField>
                <FormActions>
                  <Btn type="button" style={{ flex: 1 }} onClick={() => setEditingAccount(null)}>Отмена</Btn>
                  <Btn type="submit" variant="primary" style={{ flex: 2 }}>Сохранить</Btn>
                </FormActions>
              </form>
            </ModalContent>
          </ModalOverlay>
        )}
      </AnimatePresence>
    </Container>
  );
};
