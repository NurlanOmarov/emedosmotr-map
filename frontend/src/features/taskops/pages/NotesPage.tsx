import { useState, useEffect, useRef, useCallback } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { 
  LuPlus, 
  LuSearch, 
  LuPin, 
  LuTrash2, 
  LuFileText, 
  LuChevronLeft, 
  LuLoader, 
  LuCheck 
} from 'react-icons/lu';
import { useNotes, useCreateNote, useUpdateNote, useDeleteNote } from '../api';
import { useConfirm } from '@/components/shared/ConfirmDialog';

// ─── Animations ──────────────────────────────────────────────────────────────

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const slideRight = keyframes`
  from { opacity: 0; transform: translateX(-10px); }
  to   { opacity: 1; transform: translateX(0); }
`;

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.4; }
`;

const shimmer = keyframes`
  0%   { background-position: -300px 0; }
  100% { background-position: 300px 0; }
`;

const rotate = keyframes`
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
`;

// ─── Layout ───────────────────────────────────────────────────────────────────

const Root = styled.div`
  display: flex;
  height: 100%;
  overflow: hidden;
  background: ${(p) => p.theme.colors.bg};
`;

// ─── Left Panel: Notes List ───────────────────────────────────────────────────

const ListPanel = styled.div`
  width: 260px;
  min-width: 260px;
  border-right: 1px solid ${(p) => p.theme.colors.border};
  display: flex;
  flex-direction: column;
  background: ${(p) => p.theme.colors.bgSecondary};

  @media (max-width: 640px) {
    width: 100%;
    min-width: 0;
    display: ${(p: any) => p['data-hidden'] ? 'none' : 'flex'};
  }
`;

const ListHeader = styled.div`
  padding: 14px 14px 10px;
  border-bottom: 1px solid ${(p) => p.theme.colors.border};
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
`;

const ListTitle = styled.h2`
  font-size: 13px;
  font-weight: 700;
  color: ${(p) => p.theme.colors.textPrimary};
  flex: 1;
  margin: 0;
  letter-spacing: -0.01em;
`;

const NewNoteBtn = styled.button`
  width: 28px;
  height: 28px;
  border-radius: 7px;
  background: ${(p) => p.theme.colors.primary};
  color: white;
  border: none;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.18s;
  &:hover {
    opacity: 0.88;
    transform: scale(1.08);
    box-shadow: 0 3px 10px rgba(59,130,246,0.4);
  }
  &:active { transform: scale(0.96); }
  &:focus-visible { outline: 2px solid ${(p) => p.theme.colors.primary}; outline-offset: 2px; }
`;

const SearchBox = styled.div`
  padding: 8px 10px;
  flex-shrink: 0;
`;

const SearchInput = styled.input`
  width: 100%;
  background: ${(p) => p.theme.colors.bgCard};
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: 8px;
  padding: 7px 10px 7px 32px;
  font-size: 12px;
  color: ${(p) => p.theme.colors.textPrimary};
  box-sizing: border-box;
  transition: border-color 0.15s, box-shadow 0.15s;
  &:focus {
    outline: none;
    border-color: ${(p) => p.theme.colors.primary};
    box-shadow: 0 0 0 3px ${(p) => p.theme.colors.primaryGlow};
  }
  &::placeholder { color: ${(p) => p.theme.colors.textSecondary}; opacity: 0.7; }
`;

const SearchWrap = styled.div`
  position: relative;
  svg { position: absolute; left: 9px; top: 50%; transform: translateY(-50%); opacity: 0.4; }
`;

const NotesList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 6px 6px 16px;
`;

const NoteItem = styled.button<{ $active: boolean }>`
  width: 100%;
  text-align: left;
  background: ${(p) => p.$active
    ? p.theme.mode === 'dark'
      ? 'rgba(59,130,246,0.15)'
      : 'rgba(37,99,235,0.08)'
    : 'transparent'};
  border: 1px solid ${(p) => p.$active ? p.theme.colors.primary + '44' : 'transparent'};
  border-radius: 8px;
  padding: 10px 12px;
  cursor: pointer;
  transition: all 0.15s;
  margin-bottom: 2px;
  animation: ${slideRight} 0.2s ease-out;

  &:hover {
    background: ${(p) => p.$active ? undefined : p.theme.colors.bgHover};
  }
  &:focus-visible {
    outline: 2px solid ${(p) => p.theme.colors.primary};
    outline-offset: 1px;
  }
`;

const NoteItemTitle = styled.div<{ $active: boolean }>`
  font-size: 13px;
  font-weight: 600;
  color: ${(p) => p.$active ? p.theme.colors.primary : p.theme.colors.textPrimary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 3px;
  display: flex;
  align-items: center;
  gap: 5px;
`;

const PinIcon = styled.span`
  font-size: 10px;
  opacity: 0.7;
  flex-shrink: 0;
`;

const NoteItemPreview = styled.div`
  font-size: 11px;
  color: ${(p) => p.theme.colors.textSecondary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.4;
`;

const NoteItemDate = styled.div`
  font-size: 10px;
  color: ${(p) => p.theme.colors.textMuted};
  margin-top: 4px;
`;

// ─── Swipeable Note Row ───────────────────────────────────────────────────────

const SwipeRow = styled.div`
  position: relative;
  overflow: hidden;
  border-radius: 8px;
  margin-bottom: 2px;
`;

const SwipeDeleteZone = styled.div`
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 72px;
  background: #ef4444;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;

  &:hover { background: #dc2626; }

  svg { color: white; }
`;

const NoteItemInner = styled.div<{ $offset: number; $swiping: boolean }>`
  position: relative;
  transform: translateX(${(p) => p.$offset}px);
  transition: ${(p) => p.$swiping ? 'none' : 'transform 0.25s cubic-bezier(0.4,0,0.2,1)'};
  display: flex;
  align-items: stretch;
  z-index: 1;
  background: ${(p) => p.theme.colors.bgSecondary};
  border-radius: 8px;
  width: 100%;
`;

const NoteItemDeleteHover = styled.button`
  display: none;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: ${(p) => p.theme.colors.textSecondary};
  opacity: 0;
  transition: opacity 0.15s, background 0.15s, color 0.15s;
  margin-left: 4px;
  align-self: center;

  &:hover {
    background: rgba(239,68,68,0.12);
    color: #ef4444;
  }

  @media (hover: hover) and (pointer: fine) {
    display: flex;
  }
`;

const NoteItemHoverGroup = styled.div`
  display: flex;
  align-items: center;
  width: 100%;

  &:hover ${NoteItemDeleteHover} {
    opacity: 1;
  }
`;

const EmptyList = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 40px 16px;
  text-align: center;
  animation: ${fadeIn} 0.3s ease-out;
`;

const EmptyListText = styled.p`
  font-size: 13px;
  color: ${(p) => p.theme.colors.textSecondary};
  line-height: 1.5;
  margin: 0;
`;

const skeletonBase = css`
  background: linear-gradient(
    90deg,
    ${(p) => p.theme.colors.bgSecondary} 25%,
    ${(p) => p.theme.colors.bgHover} 50%,
    ${(p) => p.theme.colors.bgSecondary} 75%
  );
  background-size: 600px 100%;
  animation: ${shimmer} 1.4s infinite linear;
  border-radius: 5px;
`;

const SkeletonLine = styled.div<{ $w?: string; $h?: string }>`
  ${skeletonBase}
  width: ${(p) => p.$w || '100%'};
  height: ${(p) => p.$h || '12px'};
`;

const SkeletonNoteItem = styled.div`
  padding: 10px 12px;
  margin-bottom: 4px;
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

// ─── Right Panel: Editor ───────────────────────────────────────────────────────

const EditorPanel = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: ${fadeIn} 0.22s ease-out;

  @media (max-width: 640px) {
    display: ${(p: any) => p['data-hidden'] ? 'none' : 'flex'};
  }
`;

const EditorHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 20px 10px;
  border-bottom: 1px solid ${(p) => p.theme.colors.border};
  flex-shrink: 0;
`;

const BackBtn = styled.button`
  display: none;
  @media (max-width: 640px) {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 7px;
    border: none;
    background: ${(p) => p.theme.colors.bgSecondary};
    color: ${(p) => p.theme.colors.textPrimary};
    cursor: pointer;
    flex-shrink: 0;
  }
`;

const SpinningLoader = styled(LuLoader)`
  animation: ${rotate} 1s linear infinite;
`;

const SaveStatus = styled.span<{ $visible: boolean; $saving?: boolean }>`
  font-size: 11px;
  color: ${(p) => p.$saving ? p.theme.colors.primary : p.theme.colors.ready};
  opacity: ${(p) => p.$visible ? 1 : 0};
  transition: opacity 0.4s ease;
  animation: ${(p) => p.$saving ? css`${pulse} 1s infinite` : 'none'};
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
`;

const WordCount = styled.span`
  font-size: 11px;
  color: ${(p) => p.theme.colors.textMuted};
  margin-left: auto;
  flex-shrink: 0;
`;

const PinBtn = styled.button<{ $pinned: boolean }>`
  width: 30px;
  height: 30px;
  border-radius: 7px;
  background: ${(p) => p.$pinned ? p.theme.colors.primaryGlow : 'none'};
  border: 1px solid ${(p) => p.$pinned ? p.theme.colors.primary + '55' : p.theme.colors.border};
  color: ${(p) => p.$pinned ? p.theme.colors.primary : p.theme.colors.textSecondary};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.18s;
  flex-shrink: 0;
  &:hover { border-color: ${(p) => p.theme.colors.primary}; color: ${(p) => p.theme.colors.primary}; }
  &:focus-visible { outline: 2px solid ${(p) => p.theme.colors.primary}; outline-offset: 2px; }
`;

const DeleteBtn = styled.button`
  width: 30px;
  height: 30px;
  border-radius: 7px;
  background: none;
  border: 1px solid ${(p) => p.theme.colors.border};
  color: ${(p) => p.theme.colors.textSecondary};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.18s;
  flex-shrink: 0;
  &:hover {
    background: ${(p) => p.theme.colors.criticalBg};
    border-color: ${(p) => p.theme.colors.critical};
    color: ${(p) => p.theme.colors.critical};
  }
  &:focus-visible { outline: 2px solid ${(p) => p.theme.colors.critical}; outline-offset: 2px; }
`;

const EditorBody = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 20px 28px 20px;

  @media (max-width: 768px) { padding: 16px; }
`;

const TitleEditor = styled.input`
  font-size: 22px;
  font-weight: 700;
  color: ${(p) => p.theme.colors.textPrimary};
  background: none;
  border: none;
  outline: none;
  width: 100%;
  margin-bottom: 14px;
  flex-shrink: 0;
  letter-spacing: -0.02em;
  line-height: 1.3;
  &::placeholder { color: ${(p) => p.theme.colors.textMuted}; font-weight: 600; }
`;

const Divider = styled.div`
  height: 1px;
  background: ${(p) => p.theme.colors.border};
  margin-bottom: 16px;
  flex-shrink: 0;
`;

const ContentEditor = styled.textarea`
  flex: 1;
  background: none;
  border: none;
  outline: none;
  color: ${(p) => p.theme.colors.textPrimary};
  font-size: 14px;
  font-family: inherit;
  line-height: 1.75;
  resize: none;
  width: 100%;
  box-sizing: border-box;

  &::placeholder { color: ${(p) => p.theme.colors.textMuted}; opacity: 0.7; }
  &::selection { background: ${(p) => p.theme.colors.primaryGlow}; }
`;

// ─── Empty Editor ────────────────────────────────────────────────────────────

const EmptyEditor = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 40px;
  animation: ${fadeIn} 0.3s ease-out;
`;

const EmptyEditorText = styled.p`
  font-size: 14px;
  color: ${(p) => p.theme.colors.textSecondary};
  text-align: center;
  max-width: 260px;
  line-height: 1.6;
  margin: 0;
`;

const CreateFirstBtn = styled.button`
  background: ${(p) => p.theme.colors.primary};
  color: white;
  border: none;
  border-radius: 10px;
  padding: 10px 22px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.18s;
  &:hover {
    opacity: 0.9;
    transform: translateY(-1px);
    box-shadow: 0 4px 14px rgba(59,130,246,0.4);
  }
  &:focus-visible { outline: 2px solid ${(p) => p.theme.colors.primary}; outline-offset: 2px; }
`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return 'только что';
  if (diffMin < 60) return `${diffMin} мин. назад`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH} ч. назад`;
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function NotesPage() {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useNotes({ q: search || undefined });
  const notes = data?.items || [];
  const createNote = useCreateNote();
  const deleteNote = useDeleteNote();
  const confirm = useConfirm();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [localTitle, setLocalTitle] = useState('');
  const [localContent, setLocalContent] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [mobileShowEditor, setMobileShowEditor] = useState(false);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const updateNote = useUpdateNote(activeId ?? '');

  // swipe-to-delete state per note
  const [swipeOffsets, setSwipeOffsets] = useState<Record<string, number>>({});
  const [swipingId, setSwipingId] = useState<string | null>(null);
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const swipeLockedAxis = useRef<'h' | 'v' | null>(null);

  const SWIPE_THRESHOLD = 60;
  const SWIPE_MAX = 72;

  const handleTouchStart = (id: string, e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    swipeLockedAxis.current = null;
    setSwipingId(id);
  };

  const handleTouchMove = (id: string, e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = e.touches[0].clientY - touchStartY.current;

    if (!swipeLockedAxis.current) {
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        swipeLockedAxis.current = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
      }
      return;
    }

    if (swipeLockedAxis.current === 'v') return;

    if (dx < 0) {
      const offset = Math.max(-SWIPE_MAX, dx);
      setSwipeOffsets((prev) => ({ ...prev, [id]: offset }));
    } else if (dx > 0 && (swipeOffsets[id] ?? 0) < 0) {
      const offset = Math.min(0, (swipeOffsets[id] ?? 0) + dx);
      setSwipeOffsets((prev) => ({ ...prev, [id]: offset }));
    }
  };

  const handleTouchEnd = (id: string) => {
    setSwipingId(null);
    const offset = swipeOffsets[id] ?? 0;
    if (offset < -SWIPE_THRESHOLD) {
      setSwipeOffsets((prev) => ({ ...prev, [id]: -SWIPE_MAX }));
    } else {
      setSwipeOffsets((prev) => ({ ...prev, [id]: 0 }));
    }
  };

  const closeSwipe = (id: string) => {
    setSwipeOffsets((prev) => ({ ...prev, [id]: 0 }));
  };

  const handleDeleteNote = async (id: string, title: string) => {
    const ok = await confirm({
      title: 'Удалить заметку?',
      message: `«${title}» будет удалена безвозвратно.`,
      confirmLabel: 'Удалить',
      variant: 'danger',
    });
    if (!ok) { closeSwipe(id); return; }
    deleteNote.mutate(id, {
      onSuccess: () => {
        const remaining = notes.filter((n) => n.id !== id);
        if (activeId === id) {
          setActiveId(remaining[0]?.id ?? null);
          setMobileShowEditor(false);
        }
      },
    });
  };

  const active = notes.find((n) => n.id === activeId) ?? null;

  // Sync local state when active note changes
  useEffect(() => {
    if (active) {
      setLocalTitle(active.title);
      setLocalContent(active.content ?? '');
      setSaveStatus('idle');
    }
  }, [activeId]);

  // Auto-select first note on load
  useEffect(() => {
    if (!activeId && notes.length > 0) {
      setActiveId(notes[0].id);
    }
  }, [notes, activeId]);

  const scheduleAutoSave = useCallback(
    (title: string, content: string) => {
      if (!activeId) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      setSaveStatus('saving');
      saveTimer.current = setTimeout(() => {
        updateNote.mutate(
          { title: title.trim() || 'Без названия', content },
          {
            onSuccess: () => {
              setSaveStatus('saved');
              setTimeout(() => setSaveStatus('idle'), 2000);
            },
          }
        );
      }, 1200);
    },
    [activeId]
  );

  const handleTitleChange = (val: string) => {
    setLocalTitle(val);
    scheduleAutoSave(val, localContent);
  };

  const handleContentChange = (val: string) => {
    setLocalContent(val);
    scheduleAutoSave(localTitle, val);
  };

  const handleNew = async () => {
    const note = await createNote.mutateAsync({ title: 'Без названия', content: '' });
    setActiveId(note.id);
    setMobileShowEditor(true);
    setTimeout(() => document.getElementById('note-title-input')?.focus(), 80);
  };

  const handleSelect = (id: string) => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      if (activeId) {
        updateNote.mutate({ title: localTitle.trim() || 'Без названия', content: localContent });
      }
    }
    setActiveId(id);
    setMobileShowEditor(true);
  };

  const handleDelete = () => {
    if (!active) return;
    handleDeleteNote(active.id, active.title);
  };

  const handlePin = () => {
    if (!active) return;
    updateNote.mutate({ is_pinned: !active.is_pinned });
  };

  const filtered = notes;

  return (
    <Root>
      {/* ── List Panel ───────────────────────────────────────────────── */}
      <ListPanel data-hidden={mobileShowEditor ? '' : undefined}>
        <ListHeader>
          <ListTitle>Заметки</ListTitle>
          <NewNoteBtn onClick={handleNew} title="Новая заметка (Ctrl+N)" aria-label="Новая заметка">
            <LuPlus size={16} />
          </NewNoteBtn>
        </ListHeader>

        <SearchBox>
          <SearchWrap>
            <LuSearch size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
            <SearchInput
              placeholder="Поиск заметок…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </SearchWrap>
        </SearchBox>

        <NotesList>
          {isLoading && (
            <>
              {[70, 50, 85, 60].map((w, i) => (
                <SkeletonNoteItem key={i}>
                  <SkeletonLine $w={`${w}%`} $h="13px" />
                  <SkeletonLine $w="100%" $h="10px" />
                  <SkeletonLine $w="40%" $h="9px" />
                </SkeletonNoteItem>
              ))}
            </>
          )}

          {!isLoading && filtered.length === 0 && (
            <EmptyList>
              <LuFileText size={36} style={{ opacity: 0.3 }} />
              <EmptyListText>
                {search ? 'Ничего не найдено' : 'Пока нет заметок.\nСоздайте первую!'}
              </EmptyListText>
            </EmptyList>
          )}

          {!isLoading && filtered.map((note) => (
            <SwipeRow
              key={note.id}
              onTouchStart={(e) => handleTouchStart(note.id, e)}
              onTouchMove={(e) => handleTouchMove(note.id, e)}
              onTouchEnd={() => handleTouchEnd(note.id)}
            >
              <SwipeDeleteZone
                onClick={() => handleDeleteNote(note.id, note.title)}
                aria-label="Удалить заметку"
              >
                <LuTrash2 size={18} />
              </SwipeDeleteZone>

              <NoteItemInner
                $offset={swipeOffsets[note.id] ?? 0}
                $swiping={swipingId === note.id}
              >
                <NoteItemHoverGroup>
                  <NoteItem
                    $active={note.id === activeId}
                    onClick={() => {
                      if ((swipeOffsets[note.id] ?? 0) < -10) { closeSwipe(note.id); return; }
                      handleSelect(note.id);
                    }}
                    style={{ margin: 0, flex: 1 }}
                  >
                    <NoteItemTitle $active={note.id === activeId}>
                      {note.is_pinned && <PinIcon><LuPin size={10} /></PinIcon>}
                      {note.id === activeId && localTitle ? localTitle : note.title}
                    </NoteItemTitle>
                    <NoteItemPreview>
                      {(note.id === activeId ? localContent : note.content) || 'Нет содержимого'}
                    </NoteItemPreview>
                    <NoteItemDate>{formatDate(note.updated_at)}</NoteItemDate>
                  </NoteItem>

                  <NoteItemDeleteHover
                    onClick={(e) => { e.stopPropagation(); handleDeleteNote(note.id, note.title); }}
                    aria-label="Удалить заметку"
                    title="Удалить заметку"
                  >
                    <LuTrash2 size={14} />
                  </NoteItemDeleteHover>
                </NoteItemHoverGroup>
              </NoteItemInner>
            </SwipeRow>
          ))}
        </NotesList>
      </ListPanel>

      {/* ── Editor Panel ─────────────────────────────────────────────── */}
      <EditorPanel data-hidden={!mobileShowEditor && active === null ? '' : undefined}>
        {active ? (
          <>
            <EditorHeader>
              <BackBtn onClick={() => setMobileShowEditor(false)} aria-label="Назад к списку">
                <LuChevronLeft size={18} />
              </BackBtn>

              <SaveStatus $visible={saveStatus !== 'idle'} $saving={saveStatus === 'saving'}>
                {saveStatus === 'saving' ? (
                  <>
                    <SpinningLoader size={12} />
                    Сохранение…
                  </>
                ) : (
                  <>
                    <LuCheck size={12} />
                    Сохранено
                  </>
                )}
              </SaveStatus>

              <WordCount>
                {wordCount(localContent)} сл.
              </WordCount>

              <PinBtn
                $pinned={active.is_pinned}
                onClick={handlePin}
                title={active.is_pinned ? 'Открепить' : 'Закрепить'}
              >
                <LuPin size={14} fill={active.is_pinned ? 'currentColor' : 'none'} />
              </PinBtn>

              <DeleteBtn onClick={handleDelete} title="Удалить заметку">
                <LuTrash2 size={14} />
              </DeleteBtn>
            </EditorHeader>

            <EditorBody>
              <TitleEditor
                id="note-title-input"
                value={localTitle}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Заголовок"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    contentRef.current?.focus();
                  }
                }}
              />
              <Divider />
              <ContentEditor
                ref={contentRef}
                value={localContent}
                onChange={(e) => handleContentChange(e.target.value)}
                placeholder="Начните писать… Ваши заметки видны только вам."
                spellCheck
              />
            </EditorBody>
          </>
        ) : (
          <EmptyEditor>
            <LuFileText size={48} style={{ opacity: 0.25 }} />
            <EmptyEditorText>
              Выберите заметку или создайте новую
            </EmptyEditorText>
            <CreateFirstBtn onClick={handleNew}>
              Создать заметку
            </CreateFirstBtn>
          </EmptyEditor>
        )}
      </EditorPanel>
    </Root>
  );
}
