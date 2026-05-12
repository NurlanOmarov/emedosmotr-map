import { useRef, useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';

interface MentionUser {
  id: string;
  username: string;
  full_name: string;
}

const Wrap = styled.div`
  position: relative;
  width: 100%;
`;

const Textarea = styled.textarea`
  width: 100%;
  min-height: 72px;
  background: ${(p) => p.theme.colors.bgSecondary};
  color: ${(p) => p.theme.colors.textPrimary};
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: 6px;
  padding: 8px 10px;
  font-size: 13px;
  resize: vertical;
  font-family: inherit;
  box-sizing: border-box;
  &:focus {
    outline: none;
    border-color: ${(p) => p.theme.colors.primary};
  }
`;

const Dropdown = styled.div`
  position: absolute;
  bottom: calc(100% + 4px);
  left: 0;
  right: 0;
  background: ${(p) => p.theme.colors.bgCard};
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  z-index: 100;
  overflow: hidden;
  max-height: 200px;
  overflow-y: auto;
`;

const DropdownItem = styled.div<{ $active?: boolean }>`
  padding: 8px 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  background: ${(p) => (p.$active ? p.theme.colors.bgHover : 'transparent')};
  &:hover {
    background: ${(p) => p.theme.colors.bgHover};
  }
`;

const Avatar = styled.div`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: ${(p) => p.theme.colors.primary};
  color: white;
  font-size: 10px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const UserName = styled.div`
  font-size: 13px;
  color: ${(p) => p.theme.colors.textPrimary};
`;

const UserLogin = styled.div`
  font-size: 11px;
  color: ${(p) => p.theme.colors.textSecondary};
  margin-left: auto;
`;

interface Props {
  value: string;
  onChange: (val: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
}

function useMentionUsers(q: string) {
  return useQuery<MentionUser[]>({
    queryKey: ['taskops', 'mention-users', q],
    queryFn: () => api.get('/v1/taskops/mentions/users', { params: { q } }).then((r) => r.data),
    enabled: q.length > 0,
    staleTime: 30_000,
  });
}

export function MentionTextarea({ value, onChange, onKeyDown, placeholder }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const { data: users = [] } = useMentionUsers(mentionQuery ?? '');
  const showDropdown = mentionQuery !== null && users.length > 0;

  // Detect @mention trigger on each keystroke
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    onChange(val);

    const cursor = e.target.selectionStart ?? val.length;
    const before = val.slice(0, cursor);
    const match = before.match(/@([\w.]*)$/);
    if (match) {
      setMentionQuery(match[1]);
      setActiveIdx(0);
    } else {
      setMentionQuery(null);
    }
  };

  const insertMention = useCallback(
    (user: MentionUser) => {
      const ta = ref.current;
      if (!ta) return;
      const cursor = ta.selectionStart ?? value.length;
      const before = value.slice(0, cursor);
      const after = value.slice(cursor);
      // Replace the @query with @full_name
      const replaced = before.replace(/@[\w.]*$/, `@${user.full_name} `);
      onChange(replaced + after);
      setMentionQuery(null);
      // Restore focus
      setTimeout(() => {
        ta.focus();
        const pos = replaced.length;
        ta.setSelectionRange(pos, pos);
      }, 0);
    },
    [value, onChange]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showDropdown) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIdx((i) => Math.min(i + 1, users.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIdx((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (users[activeIdx]) insertMention(users[activeIdx]);
        return;
      }
      if (e.key === 'Escape') {
        setMentionQuery(null);
        return;
      }
    }
    onKeyDown?.(e);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.closest('[data-mention-wrap]')?.contains(e.target as Node)) {
        setMentionQuery(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <Wrap data-mention-wrap="">
      {showDropdown && (
        <Dropdown>
          {users.map((u, i) => (
            <DropdownItem
              key={u.id}
              $active={i === activeIdx}
              onMouseDown={(e) => {
                e.preventDefault();
                insertMention(u);
              }}
            >
              <Avatar>{(u.full_name || u.username).charAt(0).toUpperCase()}</Avatar>
              <UserName>{u.full_name}</UserName>
              <UserLogin>@{u.username}</UserLogin>
            </DropdownItem>
          ))}
        </Dropdown>
      )}
      <Textarea
        ref={ref}
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
      />
    </Wrap>
  );
}
