import { useRef, useState } from 'react';
import styled from 'styled-components';
import { useUploadAttachment, useDeleteAttachment } from '../api';
import type { TaskopsAttachment } from '../types';

const Container = styled.div`
  border-top: 1px solid ${(p) => p.theme.colors.border};
  padding-top: 16px;
  margin-top: 16px;
`;

const SectionTitle = styled.div`
  font-size: 11px;
  font-weight: 600;
  color: ${(p) => p.theme.colors.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const UploadBtn = styled.label`
  font-size: 11px;
  color: ${(p) => p.theme.colors.primary};
  cursor: pointer;
  text-transform: none;
  font-weight: 500;
  &:hover { text-decoration: underline; }
`;

const DropZone = styled.div<{ $isDragging: boolean }>`
  border: 2px dashed ${(p) => p.$isDragging ? p.theme.colors.primary : p.theme.colors.border};
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  background: ${(p) => p.$isDragging ? p.theme.colors.primaryGlow : p.theme.colors.bgSecondary};
  color: ${(p) => p.theme.colors.textSecondary};
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 12px;
  &:hover { border-color: ${(p) => p.theme.colors.primary}; }
`;

const FileList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 10px;
`;

const FileItem = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
`;

const ImagePreview = styled.div<{ $url: string }>`
  width: 80px;
  height: 80px;
  border-radius: 6px;
  background-image: url(${(p) => p.$url});
  background-size: cover;
  background-position: center;
  background-color: ${(p) => p.theme.colors.bgSecondary};
  border: 1px solid ${(p) => p.theme.colors.border};
`;

const FileIcon = styled.div`
  width: 80px;
  height: 80px;
  border-radius: 6px;
  background: ${(p) => p.theme.colors.bgSecondary};
  border: 1px solid ${(p) => p.theme.colors.border};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: ${(p) => p.theme.colors.textSecondary};
`;

const FileName = styled.div`
  font-size: 10px;
  color: ${(p) => p.theme.colors.textPrimary};
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: center;
`;

const DeleteBtn = styled.button`
  position: absolute;
  top: -4px;
  right: -4px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: ${(p) => p.theme.colors.critical};
  color: white;
  border: none;
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
  ${FileItem}:hover & { opacity: 1; }
`;

interface Props {
  taskId: string;
  attachments: TaskopsAttachment[];
}

export function AttachmentsSection({ taskId, attachments }: Props) {
  const upload = useUploadAttachment(taskId);
  const remove = useDeleteAttachment(taskId);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    upload.mutate(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) handleFile(e.target.files[0]);
  };

  const isImage = (type: string | null) => type?.startsWith('image/');

  return (
    <Container>
      <SectionTitle>
        <span>Файлы ({attachments.length})</span>
        <UploadBtn>
          Добавить
          <input 
            type="file" 
            style={{ display: 'none' }} 
            ref={fileInputRef} 
            onChange={onFileChange} 
          />
        </UploadBtn>
      </SectionTitle>

      <DropZone
        $isDragging={isDragging}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        {upload.isPending ? 'Загрузка...' : 'Перетащите файл сюда или нажмите для выбора'}
      </DropZone>

      <FileList>
        {attachments.map((a) => (
          <FileItem key={a.id} title={a.filename}>
            <a 
              href={`${import.meta.env.VITE_API_URL || ''}/v1/taskops/attachments/${a.id}`} 
              target="_blank" 
              rel="noreferrer"
              style={{ textDecoration: 'none' }}
            >
              {isImage(a.content_type) ? (
                <ImagePreview $url={`${import.meta.env.VITE_API_URL || ''}/v1/taskops/attachments/${a.id}`} />
              ) : (
                <FileIcon>📄</FileIcon>
              )}
            </a>
            <FileName>{a.filename}</FileName>
            <DeleteBtn onClick={() => remove.mutate(a.id)}>×</DeleteBtn>
          </FileItem>
        ))}
      </FileList>
    </Container>
  );
}
